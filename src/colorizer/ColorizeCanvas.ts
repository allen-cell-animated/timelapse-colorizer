import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  GLSL3,
  Line,
  LineBasicMaterial,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  RGBAIntegerFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform,
  UnsignedByteType,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clamp } from "three/src/math/MathUtils";

import { MAX_FEATURE_CATEGORIES } from "../constants";
import {
  BACKGROUND_COLOR_DEFAULT,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
} from "./constants";
import { DrawMode, FeatureDataType } from "./types";
import { hasPropertyChanged } from "./utils/data_utils";
import { packDataTexture } from "./utils/texture_utils";

import ColorRamp from "./ColorRamp";
import Dataset from "./Dataset";
import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";
import Track from "./Track";
import VectorField from "./VectorField";

import pickFragmentShader from "./shaders/cellId_RGBA8U.frag";
import vertexShader from "./shaders/colorize.vert";
import fragmentShader from "./shaders/colorize_RGBA8U.frag";

export const BACKGROUND_ID = -1;

type ColorizeUniformTypes = {
  /** Scales from canvas coordinates to frame coordinates. */
  canvasToFrameScale: Vector2;
  canvasSizePx: Vector2;
  /** XY offset of the frame, in normalized frame coordinates. [-0.5, 0.5] range. */
  panOffset: Vector2;
  /** Image, mapping each pixel to an object ID using the RGBA values. */
  frame: Texture;
  objectOpacity: number;
  /** The feature value of each object ID. */
  featureData: Texture;
  outlierData: Texture;
  inRangeIds: Texture;
  featureColorRampMin: number;
  featureColorRampMax: number;
  /** UI overlay for scale bars and timestamps. */
  overlay: Texture;
  /** Image backdrop, rendered behind the main frame object data. */
  backdrop: Texture;
  backdropBrightness: number;
  backdropSaturation: number;
  colorRamp: Texture;
  backgroundColor: Color;
  canvasBackgroundColor: Color;
  outlierColor: Color;
  outOfRangeColor: Color;
  outlineColor: Color;
  highlightedId: number;
  hideOutOfRange: boolean;
  outlierDrawMode: number;
  outOfRangeDrawMode: number;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyBackdrop = new DataTexture(new Uint8Array([1, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  const emptyOverlay = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType);

  const emptyFeature = packDataTexture([0], FeatureDataType.F32);
  const emptyOutliers = packDataTexture([0], FeatureDataType.U8);
  const emptyInRangeIds = packDataTexture([0], FeatureDataType.U8);
  const emptyColorRamp = new ColorRamp(["#aaa", "#fff"]).texture;

  return {
    panOffset: new Uniform(new Vector2(0, 0)),
    canvasToFrameScale: new Uniform(new Vector2(1, 1)),
    canvasSizePx: new Uniform(new Vector2(1, 1)),
    frame: new Uniform(emptyFrame),
    featureData: new Uniform(emptyFeature),
    outlierData: new Uniform(emptyOutliers),
    inRangeIds: new Uniform(emptyInRangeIds),
    overlay: new Uniform(emptyOverlay),
    objectOpacity: new Uniform(1.0),
    backdrop: new Uniform(emptyBackdrop),
    backdropBrightness: new Uniform(0.75),
    backdropSaturation: new Uniform(1.0),
    featureColorRampMin: new Uniform(0),
    featureColorRampMax: new Uniform(1),
    colorRamp: new Uniform(emptyColorRamp),
    highlightedId: new Uniform(-1),
    hideOutOfRange: new Uniform(false),
    backgroundColor: new Uniform(new Color(BACKGROUND_COLOR_DEFAULT)),
    outlineColor: new Uniform(new Color(OUTLINE_COLOR_DEFAULT)),
    canvasBackgroundColor: new Uniform(new Color(BACKGROUND_COLOR_DEFAULT)),
    outlierColor: new Uniform(new Color(OUTLIER_COLOR_DEFAULT)),
    outOfRangeColor: new Uniform(new Color(OUT_OF_RANGE_COLOR_DEFAULT)),
    outlierDrawMode: new Uniform(DrawMode.USE_COLOR),
    outOfRangeDrawMode: new Uniform(DrawMode.USE_COLOR),
  };
};

export default class ColorizeCanvas implements IRenderCanvas {
  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private pickMaterial: ShaderMaterial;
  private mesh: Mesh;
  private pickMesh: Mesh;

  private vectorField: VectorField;
  // Rendered track line that shows the trajectory of a cell.
  private line: Line;
  private points: Float32Array;

  protected frameSizeInCanvasCoordinates: Vector2;
  protected frameToCanvasCoordinates: Vector2;

  /**
   * The zoom level of the frame in the canvas. At default zoom level 1, the frame will be
   * either the width or height of the canvas while maintaining the aspect ratio. A zoom level
   * of 2.0 means the frame will be twice that size.
   */
  private zoomMultiplier: number;
  /**
   * The offset of the frame in the canvas, in normalized frame coordinates. [0, 0] means the
   * frame will be centered, while [-0.5, -0.5] means the top right corner of the frame will be
   * centered in the canvas view.
   */
  protected panOffset: Vector2;

  private scene: Scene;
  private pickScene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private pickRenderTarget: WebGLRenderTarget;

  protected params: RenderCanvasStateParams | null;
  // Categorical palette is stored separately from params because it's not a
  // direct part of state, and the ColorRamp class must be disposed and
  // recreated when the palette changes.
  protected categoricalPalette: ColorRamp;

  protected canvasResolution: Vector2;

  protected currentFrame: number;
  private pendingFrame: number;

  private onFrameChangeCallback: (isMissing: boolean) => void;

  constructor() {
    this.geometry = new PlaneGeometry(2, 2);
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: getDefaultUniforms(),
      depthWrite: false,
      depthTest: false,
      glslVersion: GLSL3,
    });
    this.pickMaterial = new ShaderMaterial({
      vertexShader,
      fragmentShader: pickFragmentShader,
      uniforms: getDefaultUniforms(),
      depthWrite: false,
      depthTest: false,
      glslVersion: GLSL3,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.pickMesh = new Mesh(this.geometry, this.pickMaterial);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new Scene();
    this.scene.add(this.mesh);

    this.vectorField = new VectorField();
    this.scene.add(this.vectorField.sceneObject);

    this.pickScene = new Scene();
    this.pickScene.add(this.pickMesh);

    // Configure track lines
    this.points = new Float32Array([0, 0, 0]);

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(this.points, 3));
    const lineMaterial = new LineBasicMaterial({
      color: OUTLINE_COLOR_DEFAULT,
      linewidth: 1.0,
    });

    this.line = new Line(lineGeometry, lineMaterial);
    // Disable frustum culling for the line so it's always visible; prevents a bug
    // where the line disappears when the camera is zoomed in and panned.
    this.line.frustumCulled = false;

    this.scene.add(this.line);

    this.pickRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    });
    this.renderer = new WebGLRenderer({ antialias: true });
    this.checkPixelRatio();

    this.params = null;

    this.canvasResolution = new Vector2(1, 1);
    this.categoricalPalette = new ColorRamp(["black"]);
    this.currentFrame = 0;
    this.pendingFrame = -1;

    this.frameSizeInCanvasCoordinates = new Vector2(1, 1);
    this.frameToCanvasCoordinates = new Vector2(1, 1);
    this.zoomMultiplier = 1;
    this.panOffset = new Vector2(0, 0);

    this.onFrameChangeCallback = () => {};

    this.render = this.render.bind(this);
    this.updateScaling = this.updateScaling.bind(this);
    this.setFrame = this.setFrame.bind(this);
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
    this.pickMaterial.uniforms[name].value = value;
  }

  public get resolution(): Vector2 {
    return this.canvasResolution;
  }

  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private checkPixelRatio(): void {
    if (this.renderer.getPixelRatio() !== window.devicePixelRatio) {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
  }

  public setResolution(width: number, height: number): void {
    this.checkPixelRatio();

    this.renderer.setSize(width, height);
    // TODO: either make this a 1x1 target and draw it with a new camera every time we pick,
    // or keep it up to date with the canvas on each redraw (and don't draw to it when we pick!)
    this.pickRenderTarget.setSize(width, height);

    this.canvasResolution = new Vector2(width, height);
    if (this.params?.dataset) {
      this.updateScaling(this.params.dataset.frameResolution, this.canvasResolution);
    }
  }

  public setZoom(zoom: number): void {
    this.zoomMultiplier = zoom;
    if (this.params?.dataset) {
      this.updateScaling(this.params.dataset.frameResolution, this.canvasResolution);
    }
    this.render();
  }

  /**
   * Sets the panned offset of the frame in the canvas, in normalized frame coordinates.
   * Expects x and y in a range of [-0.5, 0.5], where [0, 0] means the frame will be centered
   * and [-0.5, -0.5] means the top right corner of the frame will be centered in the canvas view.
   */
  public setPan(x: number, y: number): void {
    this.panOffset = new Vector2(x, y);
    this.setUniform("panOffset", this.panOffset);

    // Adjust the line mesh position with scaling and panning
    this.line.position.set(
      2 * this.panOffset.x * this.frameToCanvasCoordinates.x,
      2 * this.panOffset.y * this.frameToCanvasCoordinates.y,
      0
    );
    this.vectorField.setPosition(this.panOffset, this.frameToCanvasCoordinates);
    this.render();
  }

  private updateScaling(frameResolution: Vector2 | null, canvasResolution: Vector2 | null): void {
    if (!frameResolution || !canvasResolution) {
      return;
    }
    this.setUniform("canvasSizePx", canvasResolution);
    // Both the frame and the canvas have coordinates in a range of [0, 1] in the x and y axis.
    // However, the canvas may have a different aspect ratio than the frame, so we need to scale
    // the frame to fit within the canvas while maintaining the aspect ratio.
    const canvasAspect = canvasResolution.x / canvasResolution.y;
    const frameAspect = frameResolution.x / frameResolution.y;
    const unscaledFrameSizeInCanvasCoords: Vector2 = new Vector2(1, 1);
    if (canvasAspect > frameAspect) {
      // Canvas has a wider aspect ratio than the frame, so proportional height is 1
      // and we scale width accordingly.
      unscaledFrameSizeInCanvasCoords.x = canvasAspect / frameAspect;
    } else {
      unscaledFrameSizeInCanvasCoords.y = frameAspect / canvasAspect;
    }

    // Get final size by applying the current zoom level, where `zoomMultiplier=2` means the frame is 2x
    // larger than its base size. Save this to use when calculating units with the scale bar.
    this.frameSizeInCanvasCoordinates = unscaledFrameSizeInCanvasCoords.clone().multiplyScalar(this.zoomMultiplier);

    // Transforms from [0, 1] space of the canvas to the [0, 1] space of the frame by dividing by the zoom level.
    // ex: Let's say our frame has the same aspect ratio as the canvas, but our zoom is set to 2x.
    // Assuming that the [0, 0] position of the frame and the canvas are in the same position,
    // the position [1, 1] on the canvas should map to [0.5, 0.5] on the frame.
    const canvasToFrameCoordinates = unscaledFrameSizeInCanvasCoords.clone().divideScalar(this.zoomMultiplier);
    this.setUniform("canvasToFrameScale", canvasToFrameCoordinates);

    // Invert to get the frame to canvas coordinates. The line mesh is in frame coordinates, so transform it to
    // canvas coordinates so it matches the zoomed frame.
    this.frameToCanvasCoordinates = new Vector2(1 / canvasToFrameCoordinates.x, 1 / canvasToFrameCoordinates.y);

    this.line.scale.set(this.frameToCanvasCoordinates.x, this.frameToCanvasCoordinates.y, 1);
    // The line mesh is centered at [0,0]. Adjust the line mesh position with scaling and panning
    this.line.position.set(
      2 * this.panOffset.x * this.frameToCanvasCoordinates.x,
      2 * this.panOffset.y * this.frameToCanvasCoordinates.y,
      0
    );
    this.vectorField.setPosition(this.panOffset, this.frameToCanvasCoordinates);
    this.vectorField.setScale(this.frameToCanvasCoordinates, this.canvasResolution || new Vector2(1, 1));
  }

  /**
   * Forces a reload of the current frame, even if it's already loaded. If a
   * different frame is in the process of being loaded, the reload will be
   * called on that pending frame.
   */
  private forceFrameReload(): void {
    // Force update on the current frame or the frame that's currently being loaded
    const frame = this.pendingFrame !== -1 ? this.pendingFrame : this.currentFrame;
    this.setFrame(frame, true).then(() => {
      this.render();
    });
  }

  // PARAM HANDLING /////////////////////////////////////////////////////////////////////////

  private async handleNewDataset(dataset: Dataset | null): Promise<void> {
    if (dataset === null) {
      return;
    }
    if (dataset.outliers) {
      this.setUniform("outlierData", packDataTexture(Array.from(dataset.outliers), FeatureDataType.U8));
    } else {
      this.setUniform("outlierData", packDataTexture([0], FeatureDataType.U8));
    }
    this.vectorField.setDataset(dataset);
    await this.forceFrameReload();
    this.updateScaling(dataset.frameResolution, this.canvasResolution);
  }

  private setOutlineColor(color: Color): void {
    this.setUniform("outlineColor", color);

    // Update line color
    if (Array.isArray(this.line.material)) {
      this.line.material.forEach((mat) => {
        (mat as LineBasicMaterial).color = color;
      });
    } else {
      (this.line.material as LineBasicMaterial).color = color;
    }
  }

  public setBackgroundColor(color: Color): void {
    this.setUniform("backgroundColor", color);
  }

  /** Set the color of the area outside the frame in the canvas. */
  public setCanvasBackgroundColor(color: Color): void {
    this.setUniform("canvasBackgroundColor", color);
  }

  private setOutlierDrawMode(mode: DrawMode, color: Color): void {
    this.setUniform("outlierDrawMode", mode);
    if (mode === DrawMode.USE_COLOR) {
      this.setUniform("outlierColor", color);
    }
  }

  private setOutOfRangeDrawMode(mode: DrawMode, color: Color): void {
    this.setUniform("outOfRangeDrawMode", mode);
    if (mode === DrawMode.USE_COLOR) {
      this.setUniform("outOfRangeColor", color);
    }
  }

  private updateTrackData(dataset: Dataset | null, track: Track | null): void {
    if (!track || !track.centroids || track.centroids.length === 0 || !dataset) {
      return;
    }
    // Make a new array of the centroid positions in pixel coordinates.
    // Points are in 3D while centroids are pairs of 2D coordinates in a 1D array
    this.points = new Float32Array(track.duration() * 3);

    // Tracks may be missing objects for some timepoints, so use the last known good value as a fallback
    let lastTrackIndex = 0;
    for (let i = 0; i < track.duration(); i++) {
      const absTime = i + track.startTime();

      let trackIndex = track.times.findIndex((t) => t === absTime);
      if (trackIndex === -1) {
        // Track has no object for this time, use fallback
        trackIndex = lastTrackIndex;
      } else {
        lastTrackIndex = trackIndex;
      }

      // Normalize from pixel coordinates to canvas space [-1, 1]
      this.points[3 * i + 0] = (track.centroids[2 * trackIndex] / dataset.frameResolution.x) * 2.0 - 1.0;
      this.points[3 * i + 1] = -((track.centroids[2 * trackIndex + 1] / dataset.frameResolution.y) * 2.0 - 1.0);
      this.points[3 * i + 2] = 0;
    }
    // Assign new BufferAttribute because the old array has been discarded.
    this.line.geometry.setAttribute("position", new BufferAttribute(this.points, 3));
    this.line.geometry.getAttribute("position").needsUpdate = true;
  }

  private updateFeatureData(dataset: Dataset | null, featureKey: string | null): void {
    if (featureKey === null || dataset === null) {
      return;
    }
    if (!dataset.hasFeatureKey(featureKey)) {
      return;
    }
    const featureData = dataset.getFeatureData(featureKey)!;
    this.setUniform("featureData", featureData.tex);
  }

  private setInRangeLUT(inRangeLUT: Uint8Array): void {
    // Save the array to a texture and pass it into the shader
    if (inRangeLUT.length > 0) {
      this.setUniform("inRangeIds", packDataTexture(Array.from(inRangeLUT), FeatureDataType.U8));
    }
  }

  public setOnFrameChangeCallback(callback: (isMissing: boolean) => void): void {
    this.onFrameChangeCallback = callback;
  }

  public setParams(params: RenderCanvasStateParams): void {
    // TODO: What happens when `setParams` is called again while waiting for a Dataset to load?
    // May cause visual desync where the color ramp/feature data updates before frames load in fully
    if (this.params === params) {
      return;
    }
    const prevParams = this.params;
    this.params = params;
    // Update dataset and array data
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      this.handleNewDataset(params.dataset);
    }
    if (hasPropertyChanged(params, prevParams, ["dataset", "featureKey"])) {
      this.updateFeatureData(params.dataset, params.featureKey);
    }
    if (hasPropertyChanged(params, prevParams, ["dataset", "track"])) {
      this.updateTrackData(params.dataset, params.track);
    }
    if (hasPropertyChanged(params, prevParams, ["inRangeLUT"])) {
      this.setInRangeLUT(params.inRangeLUT);
    }

    // Basic rendering settings
    if (hasPropertyChanged(params, prevParams, ["outlierDrawSettings"])) {
      this.setOutlierDrawMode(params.outlierDrawSettings.mode, params.outlierDrawSettings.color);
    }
    if (hasPropertyChanged(params, prevParams, ["outOfRangeDrawSettings"])) {
      this.setOutOfRangeDrawMode(params.outOfRangeDrawSettings.mode, params.outOfRangeDrawSettings.color);
    }
    if (hasPropertyChanged(params, prevParams, ["outlineColor"])) {
      this.setOutlineColor(params.outlineColor);
    }

    // Update vector data
    if (hasPropertyChanged(params, prevParams, ["vectorVisible", "vectorColor", "vectorScaleFactor"])) {
      this.vectorField.setConfig({
        color: params.vectorColor,
        scaleFactor: params.vectorScaleFactor,
        visible: params.vectorVisible,
      });
    }
    if (hasPropertyChanged(params, prevParams, ["vectorMotionDeltas"])) {
      this.vectorField.setVectorData(params.vectorMotionDeltas);
    }

    // Backdrops
    if (hasPropertyChanged(params, prevParams, ["backdropKey", "backdropVisible"])) {
      this.forceFrameReload();
    }
    if (hasPropertyChanged(params, prevParams, ["backdropVisible", "objectOpacity"])) {
      if (params.backdropVisible) {
        this.setUniform("objectOpacity", clamp(params.objectOpacity, 0, 100) / 100);
      } else {
        this.setUniform("objectOpacity", 1.0);
      }
    }
    this.setUniform("backdropSaturation", clamp(params.backdropSaturation, 0, 100) / 100);
    this.setUniform("backdropBrightness", clamp(params.backdropBrightness, 0, 200) / 100);

    // Update color ramp  + palette
    if (hasPropertyChanged(params, prevParams, ["categoricalPalette"])) {
      this.categoricalPalette.dispose();
      this.categoricalPalette = new ColorRamp(params.categoricalPalette);
    }
    if (
      hasPropertyChanged(params, prevParams, [
        "dataset",
        "featureKey",
        "colorRamp",
        "colorRampRange",
        "categoricalPalette",
      ])
    ) {
      if (params.dataset !== null && params.featureKey !== null) {
        const isFeatureCategorical = params.dataset.isFeatureCategorical(params.featureKey);
        if (isFeatureCategorical) {
          this.setUniform("colorRamp", this.categoricalPalette.texture);
          this.setUniform("featureColorRampMin", 0);
          this.setUniform("featureColorRampMax", MAX_FEATURE_CATEGORIES - 1);
        } else {
          this.setUniform("colorRamp", params.colorRamp.texture);
          this.setUniform("featureColorRampMin", params.colorRampRange[0]);
          this.setUniform("featureColorRampMax", params.colorRampRange[1]);
        }
      }
    }

    this.render();
  }

  /**
   * Sets the current frame of the canvas, loading the new frame data if the
   * frame number changes.
   * @param index Index of the new frame.
   * @param forceUpdate Force a reload of the frame data, even if the frame
   * is already loaded.
   */
  public async setFrame(index: number, forceUpdate: boolean = false): Promise<void> {
    const dataset = this.params?.dataset;
    // Ignore same or bad frame indices
    if (!dataset || (!forceUpdate && this.currentFrame === index) || !dataset.isValidFrameIndex(index)) {
      return;
    }
    // Load the frame data asynchronously.
    // Save loading settings to prevent race conditions.
    const pendingDataset = dataset;
    this.pendingFrame = index;
    const pendingBackdropKey = this.params?.backdropKey ?? null;
    let backdropPromise = undefined;
    if (this.params?.backdropVisible && pendingBackdropKey !== null && dataset?.hasBackdrop(pendingBackdropKey)) {
      backdropPromise = dataset?.loadBackdrop(pendingBackdropKey, index);
    }
    const framePromise = dataset?.loadFrame(index);
    const result = await Promise.allSettled([framePromise, backdropPromise]);
    const [frame, backdrop] = result;

    const isForcingUpdateOnLoadedFrame = this.pendingFrame === -1 && this.currentFrame === index && forceUpdate;
    if ((!isForcingUpdateOnLoadedFrame && this.pendingFrame !== index) || this.params?.dataset !== pendingDataset) {
      // Drop the request if:
      // - A different frame number has been requested since the load started
      //   (and it's not the loaded frame being force-reloaded)
      // - The dataset has changed since the load started
      return;
    }

    let isMissingFile = false;

    if (backdrop.status === "fulfilled" && backdrop.value) {
      if (this.params?.backdropKey === pendingBackdropKey) {
        // Only update the backdrop if the selected key is the one we requested
        this.setUniform("backdrop", backdrop.value);
      }
    } else {
      if (backdrop.status === "rejected") {
        // Only show error message if the backdrop load encountered an error (null/undefined backdrops aren't
        // considered errors, since that means the path has been deliberately marked as missing.)
        console.error("Failed to load backdrop " + pendingBackdropKey + " for frame " + index + ": ", backdrop.reason);
        isMissingFile = true;
      }
      if (this.params?.backdropKey === pendingBackdropKey) {
        // Only clear the backdrop if the selected key (null) is the one we requested
        this.setUniform("backdrop", new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType));
      }
    }

    if (frame.status === "fulfilled" && frame.value) {
      this.setUniform("frame", frame.value);
    } else {
      if (frame.status === "rejected") {
        // Only show error message if the frame load encountered an error. (Null/undefined is okay)
        console.error("Failed to load frame " + index + ": ", frame.reason);
        isMissingFile = true;
      }
      // Set to blank
      const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
      emptyFrame.internalFormat = "RGBA8UI";
      emptyFrame.needsUpdate = true;
      this.setUniform("frame", emptyFrame);
    }

    this.onFrameChangeCallback(isMissingFile);
    // Force rescale in case frame dimensions changed
    this.updateScaling(dataset?.frameResolution || null, this.canvasResolution);
    this.currentFrame = index;
    this.pendingFrame = -1;
    this.vectorField.setFrame(this.currentFrame);
    this.render();
  }

  // RENDERING /////////////////////////////////////////////////////////////////////////////

  /**
   * Updates the range of the track path line so that it shows up the path up to the current
   * frame.
   */
  private syncTrackPathLine(): void {
    // Show nothing if track doesn't exist or doesn't have centroid data
    const track = this.params?.track;
    if (!track || !track.centroids || !this.params?.showTrackPath) {
      this.line.geometry.setDrawRange(0, 0);
      return;
    }

    // Show path up to current frame
    let range = this.currentFrame - track.startTime() + 1;

    if (range > track.duration() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }

    this.line.geometry.setDrawRange(0, range);
  }

  private syncHighlightedId(): void {
    // Hide highlight if no track is selected
    if (!this.params?.track) {
      this.setUniform("highlightedId", -1);
      return;
    }
    this.setUniform("highlightedId", this.params?.track.getIdAtTime(this.currentFrame));
  }

  public render(): void {
    this.syncHighlightedId();
    this.syncTrackPathLine();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
    this.pickMaterial.dispose();
  }

  public getIdAtPixel(x: number, y: number): number {
    const rt = this.renderer.getRenderTarget();

    this.renderer.setRenderTarget(this.pickRenderTarget);
    this.renderer.render(this.pickScene, this.camera);

    const pixbuf = new Uint8Array(4);
    this.renderer.readRenderTargetPixels(this.pickRenderTarget, x, this.pickRenderTarget.height - y, 1, 1, pixbuf);
    // restore main render target
    this.renderer.setRenderTarget(rt);

    // get 32bit value from 4 8bit values
    const value = pixbuf[0] | (pixbuf[1] << 8) | (pixbuf[2] << 16) | (pixbuf[3] << 24);
    // offset by 1 since 0 is background.
    return value - 1;
  }
}
