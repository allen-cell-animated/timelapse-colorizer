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
  RGBAIntegerFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

import ColorRamp from "./ColorRamp";
import Dataset from "./Dataset";
import { FeatureDataType } from "./types";
import { packDataTexture } from "./utils/texture_utils";
import vertexShader from "./shaders/colorize.vert";
import fragmentShader from "./shaders/colorize_RGBA8U.frag";
import pickFragmentShader from "./shaders/cellId_RGBA8U.frag";
import Track from "./Track";
import CanvasOverlay from "./CanvasOverlay";
import { FeatureThreshold } from "./types";
import { DEFAULT_CATEGORICAL_PALETTES, DEFAULT_CATEGORICAL_PALETTE_ID } from "../constants";

const BACKGROUND_COLOR_DEFAULT = 0xf7f7f7;
export const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;
export const OUT_OF_RANGE_COLOR_DEFAULT = 0xdddddd;
const SELECTED_COLOR_DEFAULT = 0xff00ff;
export const BACKGROUND_ID = -1;

// MUST be synchronized with the DRAW_MODE_* constants in `colorize_RGBA8U.frag`!
/** Draw options for object types. */
export enum DrawMode {
  /** Hide this object type. */
  HIDE = 0,
  /** Use a solid color for this object type. */
  USE_COLOR = 1,
}

type ColorizeUniformTypes = {
  /** Scales from canvas coordinates to frame coordinates. */
  canvasToFrameScale: Vector2;
  frame: Texture;
  featureData: Texture;
  outlierData: Texture;
  inRangeIds: Texture;
  featureColorRampMin: number;
  featureColorRampMax: number;
  colorRamp: Texture;
  backgroundColor: Color;
  outlierColor: Color;
  outOfRangeColor: Color;
  highlightedId: number;
  hideOutOfRange: boolean;
  outlierDrawMode: number;
  outOfRangeDrawMode: number;
  useCategories: boolean;
  categoricalColors: Vector3[];
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  const emptyFeature = packDataTexture([0], FeatureDataType.F32);
  const emptyOutliers = packDataTexture([0], FeatureDataType.U8);
  const emptyInRangeIds = packDataTexture([0], FeatureDataType.U8);
  const emptyColorRamp = new ColorRamp(["black"]).texture;

  const defaultPalette = DEFAULT_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_ID)!;
  const defaultPaletteVec3 = defaultPalette.colors.map((c) => new Vector3(c.r, c.g, c.b));

  return {
    canvasToFrameScale: new Uniform(new Vector2(1, 1)),
    frame: new Uniform(emptyFrame),
    featureData: new Uniform(emptyFeature),
    outlierData: new Uniform(emptyOutliers),
    inRangeIds: new Uniform(emptyInRangeIds),
    featureColorRampMin: new Uniform(0),
    featureColorRampMax: new Uniform(1),
    colorRamp: new Uniform(emptyColorRamp),
    highlightedId: new Uniform(-1),
    hideOutOfRange: new Uniform(false),
    backgroundColor: new Uniform(new Color(BACKGROUND_COLOR_DEFAULT)),
    outlierColor: new Uniform(new Color(OUTLIER_COLOR_DEFAULT)),
    outOfRangeColor: new Uniform(new Color(OUT_OF_RANGE_COLOR_DEFAULT)),
    outlierDrawMode: new Uniform(DrawMode.USE_COLOR),
    outOfRangeDrawMode: new Uniform(DrawMode.USE_COLOR),
    categoricalColors: new Uniform(defaultPaletteVec3),
    useCategories: new Uniform(true),
  };
};

export default class ColorizeCanvas {
  private canvasContainer: HTMLDivElement;

  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private pickMaterial: ShaderMaterial;
  private mesh: Mesh;
  private pickMesh: Mesh;

  public overlay: CanvasOverlay;

  // Rendered track line that shows the trajectory of a cell.
  private line: Line;
  private showTrackPath: boolean;

  private showTimestamp: boolean;
  private showScaleBar: boolean;
  private frameToCanvasScale: Vector4;

  private scene: Scene;
  private pickScene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private pickRenderTarget: WebGLRenderTarget;

  private dataset: Dataset | null;
  private track: Track | null;
  private points: Float32Array;
  private canvasResolution: Vector2 | null;

  private featureName: string | null;
  private colorMapRangeMin: number;
  private colorMapRangeMax: number;
  private currentFrame: number;

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
    this.pickScene = new Scene();
    this.pickScene.add(this.pickMesh);

    // Configure lines
    this.points = new Float32Array([0, 0, 0]);

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(this.points, 3));
    const lineMaterial = new LineBasicMaterial({
      color: SELECTED_COLOR_DEFAULT,
      linewidth: 1.0,
    });

    this.line = new Line(lineGeometry, lineMaterial);
    this.scene.add(this.line);

    this.pickRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    });
    this.renderer = new WebGLRenderer();
    this.checkPixelRatio();

    this.dataset = null;
    this.canvasResolution = null;
    this.featureName = null;
    this.track = null;
    this.showTrackPath = false;
    this.colorMapRangeMin = 0;
    this.colorMapRangeMax = 0;
    this.currentFrame = 0;

    this.overlay = new CanvasOverlay();
    this.showScaleBar = false;
    this.showTimestamp = false;
    this.frameToCanvasScale = new Vector4(1, 1, 1, 1);

    this.render = this.render.bind(this);
    this.getCurrentFrame = this.getCurrentFrame.bind(this);
    this.setOutOfRangeDrawMode = this.setOutOfRangeDrawMode.bind(this);
    this.updateScaling = this.updateScaling.bind(this);

    // Set up the canvas overlay as a sibling in the DOM layout
    // by creating a dummy parent container.
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.appendChild(this.renderer.domElement);
    this.canvasContainer.appendChild(this.overlay.domElement);
    this.canvasContainer.style.position = "relative";
    this.overlay.domElement.style.position = "absolute";
    this.overlay.domElement.style.left = "0";
    this.overlay.domElement.style.top = "0";
  }

  /**
   * The DOM element containing the canvas and its overlay.
   */
  get domElement(): HTMLDivElement {
    return this.canvasContainer;
  }

  get canvasElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private checkPixelRatio(): void {
    if (this.renderer.getPixelRatio() !== window.devicePixelRatio) {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
  }

  setSize(width: number, height: number): void {
    this.checkPixelRatio();

    this.renderer.setSize(width, height);
    this.overlay.setSize(width, height);
    // TODO: either make this a 1x1 target and draw it with a new camera every time we pick,
    // or keep it up to date with the canvas on each redraw (and don't draw to it when we pick!)
    this.pickRenderTarget.setSize(width, height);

    this.canvasResolution = new Vector2(width, height);
    if (this.dataset) {
      this.updateScaling(this.dataset.frameResolution, this.canvasResolution);
    }
  }

  private updateScaleBar(): void {
    // Update the scale bar units
    const frameDims = this.dataset?.metadata.frameDims;
    // Ignore cases where dimensions have size 0
    const hasFrameDims = frameDims && frameDims.width !== 0 && frameDims.height !== 0;
    if (this.showScaleBar && hasFrameDims && this.canvasResolution !== null) {
      // `frameDims` are already in the provided unit scaling, so we figure out the current
      // size of the frame relative to the canvas to determine the canvas' width in units.
      // We only consider X scaling here because the scale bar is always horizontal.
      const canvasWidthInUnits = frameDims.width * this.frameToCanvasScale.x;
      const unitsPerScreenPixel = canvasWidthInUnits / this.canvasResolution.x;
      this.overlay.updateScaleBarOptions({ unitsPerScreenPixel, units: frameDims.units, visible: true });
    } else {
      this.overlay.updateScaleBarOptions({ visible: false });
    }
  }

  setScaleBarVisibility(visible: boolean): void {
    this.showScaleBar = visible;
    this.updateScaleBar();
    this.overlay.render();
  }

  private updateTimestamp(): void {
    // Calculate the current time stamp based on the current frame and the frame duration provided
    // by the dataset (optionally, hide the timestamp if the frame duration is not provided).
    // Pass along to the overlay as parameters.
    if (this.showTimestamp && this.dataset) {
      const frameDurationSec = this.dataset.metadata.frameDurationSeconds;
      if (frameDurationSec) {
        const startTimeSec = this.dataset.metadata.startTimeSeconds;
        // Note: there's some semi-redundant information here, since the current timestamp and max
        // timestamp could be calculated from the frame duration if we passed in the current + max
        // frames instead. For now, it's ok to keep those calculations here in ColorizeCanvas so the
        // overlay doesn't need to know frame numbers. The duration + start time are needed for
        // time display calculations, however.
        this.overlay.updateTimestampOptions({
          visible: true,
          frameDurationSec,
          startTimeSec,
          currTimeSec: this.currentFrame * frameDurationSec + startTimeSec,
          maxTimeSec: this.dataset.numberOfFrames * frameDurationSec + startTimeSec,
        });
        return;
      }
    }

    // Hide the timestamp if configuration is invalid or it's disabled.
    this.overlay.updateTimestampOptions({ visible: false });
  }

  setTimestampVisibility(visible: boolean): void {
    this.showTimestamp = visible;
    this.updateTimestamp();
    this.overlay.render();
  }

  private updateScaling(frameResolution: Vector2 | null, canvasResolution: Vector2 | null): void {
    if (!frameResolution || !canvasResolution) {
      return;
    }
    const canvasAspect = canvasResolution.x / canvasResolution.y;
    const frameAspect = frameResolution.x / frameResolution.y;
    // Proportion by which the frame must be scaled to maintain its aspect ratio in the canvas.
    // This is required because the canvas coordinates are defined in relative coordinates with
    // a range of [-1, 1], and don't reflect scaling/changes to the canvas aspect ratio.
    const canvasToFrameScale: Vector2 = new Vector2(1, 1);
    if (canvasAspect > frameAspect) {
      // Canvas has a wider aspect ratio than the frame, so proportional height is 1
      // and we scale width accordingly.
      canvasToFrameScale.x = canvasAspect / frameAspect;
    } else {
      canvasToFrameScale.y = frameAspect / canvasAspect;
    }
    // Inverse
    const frameToCanvasScale = new Vector4(1 / canvasToFrameScale.x, 1 / canvasToFrameScale.y, 1, 1);

    this.setUniform("canvasToFrameScale", canvasToFrameScale);
    // Scale the line mesh so the vertices line up correctly even when the canvas changes
    this.line.scale.set(frameToCanvasScale.x, frameToCanvasScale.y, 1);

    this.updateScaleBar();
  }

  public async setDataset(dataset: Dataset): Promise<void> {
    if (this.dataset !== null) {
      this.dataset.dispose();
    }
    this.dataset = dataset;
    if (this.dataset.outliers) {
      this.setUniform("outlierData", this.dataset.outliers);
    } else {
      this.setUniform("outlierData", packDataTexture([0], FeatureDataType.U8));
    }

    // Force load of frame data (clear cached frame data)
    const frame = await this.dataset?.loadFrame(this.currentFrame);
    if (!frame) {
      return;
    }
    // Save frame resolution for later calculation
    this.setUniform("frame", frame);
    this.updateScaling(this.dataset.frameResolution, this.canvasResolution);
    this.render();
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
    this.pickMaterial.uniforms[name].value = value;
  }

  setColorRamp(ramp: ColorRamp): void {
    this.setUniform("colorRamp", ramp.texture);
  }

  setBackgroundColor(color: Color): void {
    this.setUniform("backgroundColor", color);
  }

  setOutlierDrawMode(mode: DrawMode, color?: Color): void {
    this.setUniform("outlierDrawMode", mode);
    if (mode === DrawMode.USE_COLOR && color) {
      this.setUniform("outlierColor", color);
    }
  }

  setOutOfRangeDrawMode(mode: DrawMode, color?: Color): void {
    this.setUniform("outOfRangeDrawMode", mode);
    if (mode === DrawMode.USE_COLOR && color) {
      this.setUniform("outOfRangeColor", color);
    }
  }

  setSelectedTrack(track: Track | null): void {
    if (this.track && this.track?.trackId === track?.trackId) {
      return;
    }
    this.track = track;
    if (!track || !track.centroids || track.centroids.length === 0 || !this.dataset) {
      return;
    }
    // Make a new array of the centroid positions in pixel coordinates.
    // Points are in 3D while centroids are pairs of 2D coordinates in a 1D array
    this.points = new Float32Array(track.length() * 3);

    for (let i = 0; i < track.length(); i++) {
      // Normalize from pixel coordinates to canvas space [-1, 1]
      this.points[3 * i + 0] = (track.centroids[2 * i] / this.dataset.frameResolution.x) * 2.0 - 1.0;
      this.points[3 * i + 1] = -((track.centroids[2 * i + 1] / this.dataset.frameResolution.y) * 2.0 - 1.0);
      this.points[3 * i + 2] = 0;
    }
    // Assign new BufferAttribute because the old array has been discarded.
    this.line.geometry.setAttribute("position", new BufferAttribute(this.points, 3));
    this.line.geometry.getAttribute("position").needsUpdate = true;
    this.updateTrackRange();
  }

  setShowTrackPath(show: boolean): void {
    this.showTrackPath = show;
  }

  /**
   * Updates the range of the track path line so that it shows up the path up to the current
   * frame.
   */
  updateTrackRange(): void {
    // Show nothing if track doesn't exist or doesn't have centroid data
    if (!this.track || !this.track.centroids || !this.showTrackPath) {
      this.line.geometry.setDrawRange(0, 0);
      return;
    }

    // Show path up to current frame
    const trackFirstFrame = this.track.times[0];
    let range = this.currentFrame - trackFirstFrame;

    if (range > this.track.length() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }

    this.line.geometry.setDrawRange(0, range);
  }

  private updateHighlightedId(): void {
    // Hide highlight if no track is selected
    if (!this.track) {
      this.setUniform("highlightedId", -1);
      return;
    }
    this.setUniform("highlightedId", this.track.getIdAtTime(this.currentFrame));
  }

  setFeature(name: string): void {
    if (!this.dataset?.hasFeature(name)) {
      return;
    }
    const featureData = this.dataset.getFeatureData(name)!;
    this.featureName = name;
    this.setUniform("featureData", featureData.tex);
    this.render(); // re-render necessary because map range may have changed
  }

  setColorMapRangeMin(newMin: number): void {
    this.colorMapRangeMin = newMin;
    this.setUniform("featureColorRampMin", this.colorMapRangeMin);
  }

  setColorMapRangeMax(newMax: number): void {
    this.colorMapRangeMax = newMax;
    this.setUniform("featureColorRampMax", this.colorMapRangeMax);
  }

  resetColorMapRange(): void {
    if (!this.featureName) {
      return;
    }
    const featureData = this.dataset?.getFeatureData(this.featureName);
    if (featureData) {
      this.colorMapRangeMin = featureData.min;
      this.colorMapRangeMax = featureData.max;
      this.setUniform("featureColorRampMin", this.colorMapRangeMin);
      this.setUniform("featureColorRampMax", this.colorMapRangeMax);
    }
  }

  /**
   * Updates the feature thresholds used to determine what values are in and outside of range.
   * Note that this is separate from the color ramp min/max, which just controls how colors are applied.
   * @param thresholds Array of feature thresholds, which must define the feature name, min, and max.
   * If a feature name cannot be found in the dataset, it will be ignored.
   */
  setFeatureThresholds(thresholds: FeatureThreshold[]): void {
    if (!this.dataset) {
      return;
    }
    // Make new binary boolean texture (1/0) representing whether an object is in range of the
    // feature thresholds or not.
    // TODO: Optimize memory by using a true boolean array? Bit-level manipulation to fit it within Uint8Array?
    // TODO: If optimizing, use fuse operation via shader.
    const inRangeIds = new Uint8Array(this.dataset.numObjects);
    inRangeIds.fill(1);

    for (const threshold of thresholds) {
      const featureData = this.dataset.getFeatureData(threshold.featureName);
      // Ignore thresholds with features that don't exist in this dataset or whose units don't match
      if (!featureData || featureData.units !== threshold.units) {
        continue;
      }
      for (let i = 0, n = inRangeIds.length; i < n; i++) {
        if (inRangeIds[i] === 1 && (featureData.data[i] < threshold.min || featureData.data[i] > threshold.max)) {
          inRangeIds[i] = 0;
        }
      }
    }
    // Save the array to a texture and pass it into the shader
    this.setUniform("inRangeIds", packDataTexture(Array.from(inRangeIds), FeatureDataType.U8));
  }

  getColorMapRangeMin(): number {
    return this.colorMapRangeMin;
  }

  getColorMapRangeMax(): number {
    return this.colorMapRangeMax;
  }

  /**
   * @returns The number of frames in the dataset. If no dataset is loaded,
   * returns 0 by default.
   */
  getTotalFrames(): number {
    return this.dataset ? this.dataset.numberOfFrames : 0;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  public isValidFrame(index: number): boolean {
    return index >= 0 && index < this.getTotalFrames();
  }

  /**
   * Sets the current frame of the canvas, loading the new frame data if the
   * frame number changes.
   * @param index Index of the new frame.
   */
  async setFrame(index: number): Promise<void> {
    // Ignore same or bad frame indices
    if (this.currentFrame === index || !this.isValidFrame(index)) {
      return;
    }
    // New frame, so load the frame data.
    this.currentFrame = index;
    const frame = await this.dataset?.loadFrame(index);
    if (!frame) {
      return;
    }
    this.setUniform("frame", frame);
  }

  render(): void {
    this.updateHighlightedId();
    this.updateTrackRange();
    this.renderer.render(this.scene, this.camera);
    this.updateScaleBar();
    this.updateTimestamp();
    this.overlay.render();
  }

  dispose(): void {
    this.dataset?.dispose();
    this.dataset = null;
    this.material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
    this.pickMaterial.dispose();
  }

  getIdAtPixel(x: number, y: number): number {
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
