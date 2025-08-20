import {
  Color,
  DataTexture,
  GLSL3,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  RGBAIntegerFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Uniform,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial";
import { LineSegments2 } from "three/addons/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry";
import { clamp } from "three/src/math/MathUtils";

import { MAX_FEATURE_CATEGORIES } from "../constants";
import { get2DCanvasScaling } from "./canvas/utils";
import {
  CANVAS_BACKGROUND_COLOR_DEFAULT,
  EDGE_COLOR_ALPHA_DEFAULT,
  EDGE_COLOR_DEFAULT,
  FRAME_BACKGROUND_COLOR_DEFAULT,
  INITIAL_TRACK_PATH_BUFFER_SIZE,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
} from "./constants";
import {
  Canvas2DScaleInfo,
  CanvasType,
  DrawMode,
  FeatureDataType,
  FrameLoadResult,
  PixelIdInfo,
  TrackPathColorMode,
} from "./types";
import {
  computeTrackLinePointsAndIds,
  computeVertexColorsFromIds,
  getGlobalIdFromSegId,
  getLineUpdateFlags,
  hasPropertyChanged,
  normalizePointsTo2dCanvasSpace,
} from "./utils/data_utils";
import { convertCanvasOffsetPxToFrameCoords, getFrameSizeInScreenPx } from "./utils/math_utils";
import { packDataTexture } from "./utils/texture_utils";

import ColorRamp, { ColorRampType } from "./ColorRamp";
import Dataset from "./Dataset";
import { IInnerRenderCanvas } from "./IInnerRenderCanvas";
import { RenderCanvasStateParams, RenderOptions } from "./IRenderCanvas";
import VectorField from "./VectorField";

import pickFragmentShader from "./shaders/cellId_RGBA8U.frag";
import vertexShader from "./shaders/colorize.vert";
import fragmentShader from "./shaders/colorize_RGBA8U.frag";

export const BACKGROUND_ID = -1;
const MIN_PAN_OFFSET = -0.5;
const MAX_PAN_OFFSET = 0.5;
const MAX_INVERSE_ZOOM = 2; // 0.5x zoom
const MIN_INVERSE_ZOOM = 0.1; // 10x zoom
const MOUSE_SCROLL_ZOOM_FACTOR = 0.001;
const TRACK_PAD_SCROLL_ZOOM_FACTOR = 0.005;

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
  /** LUT mapping from segmentation ID (raw pixel value) to the global ID. */
  segIdToGlobalId: DataTexture;
  segIdOffset: number;

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
  edgeColor: Color;
  edgeColorAlpha: number;
  highlightedId: number;
  hideOutOfRange: boolean;
  outlierDrawMode: number;
  outOfRangeDrawMode: number;
  useRepeatingCategoricalColors: boolean;
};

type ColorizeUniforms = { [K in keyof ColorizeUniformTypes]: Uniform<ColorizeUniformTypes[K]> };

const getDefaultUniforms = (): ColorizeUniforms => {
  const emptyBackdrop = new DataTexture(new Uint8Array([1, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
  emptyFrame.internalFormat = "RGBA8UI";
  emptyFrame.needsUpdate = true;
  const emptyOverlay = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  const emptySegIdToGlobalId = new DataTexture(new Uint8Array([0]), 1, 1, RGBAFormat, UnsignedByteType);

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
    segIdToGlobalId: new Uniform(emptySegIdToGlobalId),
    segIdOffset: new Uniform(0),
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
    backgroundColor: new Uniform(new Color(FRAME_BACKGROUND_COLOR_DEFAULT)),
    outlineColor: new Uniform(new Color(OUTLINE_COLOR_DEFAULT)),
    edgeColor: new Uniform(new Color(EDGE_COLOR_DEFAULT)),
    edgeColorAlpha: new Uniform(EDGE_COLOR_ALPHA_DEFAULT),
    canvasBackgroundColor: new Uniform(new Color(CANVAS_BACKGROUND_COLOR_DEFAULT)),
    outlierColor: new Uniform(new Color(OUTLIER_COLOR_DEFAULT)),
    outOfRangeColor: new Uniform(new Color(OUT_OF_RANGE_COLOR_DEFAULT)),
    outlierDrawMode: new Uniform(DrawMode.USE_COLOR),
    outOfRangeDrawMode: new Uniform(DrawMode.USE_COLOR),
    useRepeatingCategoricalColors: new Uniform(false),
  };
};

export default class ColorizeCanvas2D implements IInnerRenderCanvas {
  private geometry: PlaneGeometry;
  private material: ShaderMaterial;
  private pickMaterial: ShaderMaterial;
  private mesh: Mesh;
  private pickMesh: Mesh;

  private vectorField: VectorField;
  // TODO: Use LineSegments2 instead of Line2 to support visualizing
  // discontinuities in the track path line. This will require a refactor of how
  // line vertices are calculated, since vertices will be repeated.
  /** Rendered track line that shows the trajectory of a cell. */
  private line: LineSegments2;
  /** Line used as an outline around the main line during certain coloring modes. */
  private bgLine: LineSegments2;
  /** Object IDs corresponding to each vertex in track line. */
  private lineIds: number[];
  private linePoints: Float32Array;
  private lineColors: Float32Array;
  private lineBufferSize: number;

  private savedScaleInfo: Canvas2DScaleInfo;
  private lastFrameLoadResult: FrameLoadResult | null;

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

  // TODO: Force params to be provided in constructor?
  protected params: RenderCanvasStateParams | null;

  protected canvasResolution: Vector2;

  protected currentFrame: number;
  private pendingFrame: number;

  private onFrameLoadCallback: (result: FrameLoadResult) => void;
  private onRenderCallback: (() => void) | null;

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
    this.scene.background = new Color(CANVAS_BACKGROUND_COLOR_DEFAULT);
    this.scene.add(this.mesh);

    this.vectorField = new VectorField();
    this.scene.add(this.vectorField.sceneObject);

    this.pickScene = new Scene();
    this.pickScene.add(this.pickMesh);

    // Configure track lines
    this.lineBufferSize = INITIAL_TRACK_PATH_BUFFER_SIZE;
    this.linePoints = new Float32Array(this.lineBufferSize);
    this.lineColors = new Float32Array(this.lineBufferSize);
    this.lineIds = [-1];

    const lineGeometry = new LineSegmentsGeometry();
    lineGeometry.setPositions(this.linePoints);
    const lineMaterial = new LineMaterial({
      color: OUTLINE_COLOR_DEFAULT,
      linewidth: 1.0,
    });
    const bgLineMaterial = new LineMaterial({
      // TODO: Make background color configurable if canvas background color can
      // be changed.
      color: FRAME_BACKGROUND_COLOR_DEFAULT,
      linewidth: 2.0,
    });
    this.line = new LineSegments2(lineGeometry, lineMaterial);
    this.bgLine = new LineSegments2(lineGeometry, bgLineMaterial);
    // Disable frustum culling for the line so it's always visible; prevents a bug
    // where the line disappears when the camera is zoomed in and panned.
    this.line.frustumCulled = false;
    this.bgLine.frustumCulled = false;

    this.bgLine.renderOrder = 0;
    this.line.renderOrder = 1;

    this.scene.add(this.line);
    this.scene.add(this.bgLine);

    this.pickRenderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
    });
    this.renderer = new WebGLRenderer({ antialias: true });
    this.checkPixelRatio();

    this.params = null;

    this.canvasResolution = new Vector2(1, 1);
    this.currentFrame = -1;
    this.pendingFrame = -1;
    this.lastFrameLoadResult = null;
    this.savedScaleInfo = {
      type: CanvasType.CANVAS_2D,
      frameSizeInCanvasCoordinates: new Vector2(1, 1),
      canvasToFrameCoordinates: new Vector2(1, 1),
      frameToCanvasCoordinates: new Vector2(1, 1),
      panOffset: new Vector2(0, 0),
    };

    this.zoomMultiplier = 1;
    this.panOffset = new Vector2(0, 0);

    this.onFrameLoadCallback = () => {};
    this.onRenderCallback = null;

    this.render = this.render.bind(this);
    this.updateScaling = this.updateScaling.bind(this);
    this.setFrame = this.setFrame.bind(this);
    this.getIdAtPixel = this.getIdAtPixel.bind(this);
  }

  private setUniform<U extends keyof ColorizeUniformTypes>(name: U, value: ColorizeUniformTypes[U]): void {
    this.material.uniforms[name].value = value;
    this.pickMaterial.uniforms[name].value = value;
  }

  public get resolution(): Vector2 {
    return this.canvasResolution.clone();
  }

  public get scaleInfo(): Canvas2DScaleInfo {
    return this.savedScaleInfo;
  }

  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public get canvas(): HTMLCanvasElement {
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
    this.canvas.width = Math.round(width * this.renderer.getPixelRatio());
    this.canvas.height = Math.round(height * this.renderer.getPixelRatio());
    // TODO: either make this a 1x1 target and draw it with a new camera every time we pick,
    // or keep it up to date with the canvas on each redraw (and don't draw to it when we pick!)
    this.pickRenderTarget.setSize(width, height);

    this.canvasResolution = new Vector2(width, height);
    if (this.params?.dataset) {
      this.updateScaling(this.params.dataset.frameResolution, this.canvasResolution);
    }
  }

  /**
   * Returns the full size of the frame in screen pixels, including offscreen pixels.
   */
  private getCurrentFrameSizePx(): Vector2 {
    const canvasSizePx = this.resolution;
    const frameResolution = this.params?.dataset?.frameResolution ?? canvasSizePx;
    return getFrameSizeInScreenPx(canvasSizePx, frameResolution, this.zoomMultiplier);
  }

  private setZoom(zoom: number): void {
    this.zoomMultiplier = zoom;
    if (this.params?.dataset) {
      this.updateScaling(this.params.dataset.frameResolution, this.canvasResolution);
    }
    this.updateLineMaterial();
    this.render();
  }

  /**
   * Sets the panned offset of the frame in the canvas, in normalized frame coordinates.
   * Expects x and y in a range of [-0.5, 0.5], where [0, 0] means the frame will be centered
   * and [-0.5, -0.5] means the top right corner of the frame will be centered in the canvas view.
   */
  private setPan(newOffset: Vector2): void {
    this.panOffset = newOffset.clone();
    this.setUniform("panOffset", this.panOffset);

    // Adjust the line mesh position with scaling and panning
    this.line.position.set(
      2 * this.panOffset.x * this.savedScaleInfo.frameToCanvasCoordinates.x,
      2 * this.panOffset.y * this.savedScaleInfo.frameToCanvasCoordinates.y,
      0
    );
    this.bgLine.position.copy(this.line.position);
    this.vectorField.setPosition(this.panOffset, this.savedScaleInfo.frameToCanvasCoordinates);
    this.render();
  }

  private offsetPanByPixels(dx: number, dy: number): void {
    const frameSizePx = this.getCurrentFrameSizePx();
    // Normalize dx/dy (change in pixels) to frame coordinates
    const newPanOffset = this.panOffset.clone();
    newPanOffset.x += dx / frameSizePx.x;
    newPanOffset.y += -dy / frameSizePx.y;
    // Clamp panning
    newPanOffset.x = clamp(newPanOffset.x, MIN_PAN_OFFSET, MAX_PAN_OFFSET);
    newPanOffset.y = clamp(newPanOffset.y, MIN_PAN_OFFSET, MAX_PAN_OFFSET);
    this.setPan(newPanOffset);
  }

  handleDragEvent(dx: number, dy: number): boolean {
    this.offsetPanByPixels(dx, dy);
    return true;
  }

  private handleZoom(inverseZoomDelta: number): void {
    let newInverseZoom = 1 / this.zoomMultiplier + inverseZoomDelta;
    newInverseZoom = clamp(newInverseZoom, MIN_INVERSE_ZOOM, MAX_INVERSE_ZOOM);
    this.setZoom(1 / newInverseZoom);
  }

  handleScrollEvent(offsetX: number, offsetY: number, scrollDelta: number): boolean {
    // Zoom with respect to the pointer; keeps the mouse in the same position relative to the underlying
    // frame by panning as the zoom changes.
    const canvasSizePx = this.canvasResolution;
    const startingFrameSizePx = this.getCurrentFrameSizePx();
    const canvasOffsetPx = new Vector2(offsetX, offsetY);
    const currentMousePosition = convertCanvasOffsetPxToFrameCoords(
      canvasSizePx,
      startingFrameSizePx,
      canvasOffsetPx,
      this.panOffset
    );

    // If scroll delta > 25, it's (most likely) a mouse scroll.
    const isMouseScroll = Math.abs(scrollDelta) > 25;
    const scaleFactor = isMouseScroll ? MOUSE_SCROLL_ZOOM_FACTOR : TRACK_PAD_SCROLL_ZOOM_FACTOR;
    this.handleZoom(scrollDelta * scaleFactor);

    // Add some offset after zooming to keep the mouse in the same position
    // relative to the frame.
    const newFrameSizePx = this.getCurrentFrameSizePx();
    const newMousePosition = convertCanvasOffsetPxToFrameCoords(
      canvasSizePx,
      newFrameSizePx,
      canvasOffsetPx,
      this.panOffset
    );
    const newOffset = this.panOffset.clone().add(newMousePosition.sub(currentMousePosition));
    this.setPan(newOffset);

    return true;
  }

  handleZoomIn(): boolean {
    this.handleZoom(-0.25);
    return true;
  }

  handleZoomOut(): boolean {
    const inverseZoom = 1 / this.zoomMultiplier;
    // Little hack because the minimum zoom level is 0.1x, but all the other zoom levels
    // are in increments of 0.25x. This ensures zooming all the way in and back out will return
    // the zoom to 1.0x.
    this.handleZoom(inverseZoom === MIN_INVERSE_ZOOM ? 0.15 : 0.25);
    return true;
  }

  resetView(): boolean {
    this.setPan(new Vector2(0, 0));
    this.setZoom(1.0);
    return true;
  }

  private updateScaling(frameResolution: Vector2 | null, canvasResolution: Vector2 | null): void {
    if (!frameResolution || !canvasResolution) {
      return;
    }
    this.savedScaleInfo = get2DCanvasScaling(frameResolution, canvasResolution, this.zoomMultiplier, this.panOffset);
    const { frameToCanvasCoordinates, canvasToFrameCoordinates } = this.savedScaleInfo;

    this.setUniform("canvasSizePx", canvasResolution);
    this.setUniform("canvasToFrameScale", canvasToFrameCoordinates);

    this.line.scale.set(frameToCanvasCoordinates.x, frameToCanvasCoordinates.y, 1);
    // The line mesh is centered at [0,0]. Adjust the line mesh position with scaling and panning
    this.line.position.set(
      2 * this.panOffset.x * frameToCanvasCoordinates.x,
      2 * this.panOffset.y * frameToCanvasCoordinates.y,
      0
    );
    this.bgLine.scale.copy(this.line.scale);
    this.bgLine.position.copy(this.line.position);
    this.vectorField.setPosition(this.panOffset, frameToCanvasCoordinates);
    this.vectorField.setScale(frameToCanvasCoordinates, this.canvasResolution || new Vector2(1, 1));
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

  // TRACK PATH LINE  ////////////////////////////////////////////////////////////////

  /**
   * Updates the line geometry with new vertex positions and vertex colors.
   */
  private updateLineGeometry(points: Float32Array, colors: Float32Array): void {
    if (points.length === 0 || colors.length === 0) {
      return;
    }
    let geometry = this.line.geometry;
    // Reuse the same geometry object unless the buffer size is too small.
    // See https://threejs.org/manual/#en/how-to-update-things
    if (points.length > this.lineBufferSize) {
      geometry.dispose();
      geometry = new LineSegmentsGeometry();
      this.lineBufferSize = points.length;
    }
    geometry.setPositions(points);
    geometry.setColors(colors);

    this.line.geometry = geometry;
    this.bgLine.geometry = geometry;
  }

  private updateLineMaterial(): void {
    if (!this.params) {
      return;
    }
    const { trackPathColorMode, outlineColor, trackPathColor, trackPathWidthPx } = this.params;
    const modeToColor = {
      [TrackPathColorMode.USE_FEATURE_COLOR]: new Color("#ffffff"),
      [TrackPathColorMode.USE_OUTLINE_COLOR]: outlineColor,
      [TrackPathColorMode.USE_CUSTOM_COLOR]: trackPathColor,
    };
    const color = modeToColor[trackPathColorMode];

    // Scale line width slightly with zoom.
    const baseLineWidth = trackPathWidthPx + (this.zoomMultiplier - 1.0) * 0.5;
    this.line.material.color = color;
    this.line.material.linewidth = baseLineWidth;
    this.line.material.vertexColors = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    this.line.material.needsUpdate = true;

    // Show line outline only when coloring by feature color
    const isColoredByFeature = trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR;
    this.bgLine.material.linewidth = isColoredByFeature ? baseLineWidth + 2 : 0;
    this.bgLine.material.needsUpdate = true;
  }

  // PARAM HANDLING //////////////////////////////////////////////////////////////

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

  private setOutlierDrawMode(mode: DrawMode, color: Color): void {
    this.setUniform("outlierDrawMode", mode);
    if (mode === DrawMode.USE_COLOR) {
      this.setUniform("outlierColor", color.clone());
    }
  }

  private setOutOfRangeDrawMode(mode: DrawMode, color: Color): void {
    this.setUniform("outOfRangeDrawMode", mode);
    if (mode === DrawMode.USE_COLOR) {
      this.setUniform("outOfRangeColor", color.clone());
    }
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

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onFrameLoadCallback = callback;
  }

  public setOnRenderCallback(callback: null | (() => void)): void {
    this.onRenderCallback = callback;
  }

  public async setParams(params: RenderCanvasStateParams): Promise<void> {
    // TODO: What happens when `setParams` is called again while waiting for a Dataset to load?
    // May cause visual desync where the color ramp/feature data updates before frames load in fully
    if (this.params === params) {
      return;
    }
    const promises: Promise<void>[] = [];
    const prevParams = this.params;
    this.params = params;
    // Update dataset and array data
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      promises.push(this.handleNewDataset(params.dataset));
    }
    if (hasPropertyChanged(params, prevParams, ["dataset", "featureKey"])) {
      this.updateFeatureData(params.dataset, params.featureKey);
    }
    if (hasPropertyChanged(params, prevParams, ["inRangeLUT"])) {
      this.setInRangeLUT(params.inRangeLUT);
    }

    // Basic rendering settings
    if (hasPropertyChanged(params, prevParams, ["outlierDrawSettings"])) {
      this.setOutlierDrawMode(
        params.outlierDrawSettings.mode,
        params.outlierDrawSettings.color.clone().convertLinearToSRGB()
      );
    }
    if (hasPropertyChanged(params, prevParams, ["outOfRangeDrawSettings"])) {
      this.setOutOfRangeDrawMode(
        params.outOfRangeDrawSettings.mode,
        params.outOfRangeDrawSettings.color.clone().convertLinearToSRGB()
      );
    }
    if (hasPropertyChanged(params, prevParams, ["outlineColor"])) {
      this.setUniform("outlineColor", params.outlineColor.clone().convertLinearToSRGB());
    }
    if (hasPropertyChanged(params, prevParams, ["edgeColor", "edgeColorAlpha", "edgeMode"])) {
      if (params.edgeMode === DrawMode.HIDE) {
        this.setUniform("edgeColor", new Color(0, 0, 0));
        this.setUniform("edgeColorAlpha", 0);
      } else {
        this.setUniform("edgeColor", params.edgeColor.clone().convertLinearToSRGB());
        this.setUniform("edgeColorAlpha", clamp(params.edgeColorAlpha, 0, 1));
      }
    }

    // Update track path data
    const { geometryNeedsUpdate, vertexColorNeedsUpdate, materialNeedsUpdate } = getLineUpdateFlags(prevParams, params);

    if (geometryNeedsUpdate || vertexColorNeedsUpdate) {
      if (geometryNeedsUpdate && params.dataset && params.track) {
        const { ids, points } = computeTrackLinePointsAndIds(params.dataset, params.track, params.showTrackPathBreaks);
        this.lineIds = ids;
        this.linePoints = normalizePointsTo2dCanvasSpace(points, params.dataset);
      }
      if (vertexColorNeedsUpdate) {
        this.lineColors = computeVertexColorsFromIds(this.lineIds, this.params);
      }
      this.updateLineGeometry(this.linePoints, this.lineColors);
    }
    if (materialNeedsUpdate) {
      this.updateLineMaterial();
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

    // Update color ramp + palette
    if (
      hasPropertyChanged(params, prevParams, [
        "dataset",
        "featureKey",
        "colorRamp",
        "colorRampRange",
        "categoricalPaletteRamp",
      ])
    ) {
      if (params.dataset !== null && params.featureKey !== null) {
        const isFeatureCategorical = params.dataset.isFeatureCategorical(params.featureKey);
        if (isFeatureCategorical) {
          this.setUniform("colorRamp", params.categoricalPaletteRamp.texture);
          this.setUniform("featureColorRampMin", 0);
          this.setUniform("featureColorRampMax", MAX_FEATURE_CATEGORIES - 1);
          this.setUniform("useRepeatingCategoricalColors", true);
        } else {
          this.setUniform("colorRamp", params.colorRamp.texture);
          this.setUniform("featureColorRampMin", params.colorRampRange[0]);
          this.setUniform("featureColorRampMax", params.colorRampRange[1]);
          // Numeric values can sometimes use repeating categorical colors, such as the glasbey palettes.
          this.setUniform("useRepeatingCategoricalColors", params.colorRamp.type === ColorRampType.CATEGORICAL);
        }
      }
    }

    this.render();
    await Promise.all(promises);
    return;
  }

  public async setFrame(index: number, forceUpdate: boolean = false): Promise<FrameLoadResult | null> {
    const dataset = this.params?.dataset;
    if (!dataset || !dataset.isValidFrameIndex(index)) {
      // Out of bounds
      return null;
    }
    if (!forceUpdate && this.currentFrame === index) {
      // Reloading current frame, skip request
      return this.lastFrameLoadResult;
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
      return this.lastFrameLoadResult;
    }

    let frameError = false;
    let backdropError = false;

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
        backdropError = true;
      }
      if (this.params?.backdropKey === pendingBackdropKey) {
        // Only clear the backdrop if the selected key (null) is the one we requested
        this.setUniform("backdrop", new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType));
      }
    }

    if (frame.status === "fulfilled" && frame.value) {
      this.setUniform("frame", frame.value);
      const globalIdLookup = dataset.frameToGlobalIdLookup?.get(index);
      if (globalIdLookup) {
        this.setUniform("segIdOffset", globalIdLookup.minSegId);
        this.setUniform("segIdToGlobalId", globalIdLookup.texture);
      }
    } else {
      if (frame.status === "rejected") {
        // Only show error message if the frame load encountered an error. (Null/undefined is okay)
        console.error("Failed to load frame " + index + ": ", frame.reason);
        frameError = true;
      }
      // Set to blank
      const emptyFrame = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAIntegerFormat, UnsignedByteType);
      emptyFrame.internalFormat = "RGBA8UI";
      emptyFrame.needsUpdate = true;
      this.setUniform("frame", emptyFrame);
    }

    // Force rescale in case frame dimensions changed
    this.updateScaling(dataset?.frameResolution || null, this.canvasResolution);
    this.currentFrame = index;
    this.pendingFrame = -1;
    this.vectorField.setFrame(this.currentFrame);
    this.render();
    const frameLoadResult: FrameLoadResult = {
      frame: index,
      frameError,
      backdropKey: pendingBackdropKey,
      backdropError,
    };
    this.lastFrameLoadResult = frameLoadResult;
    this.onFrameLoadCallback(frameLoadResult);
    return frameLoadResult;
  }

  public getScreenSpaceMatrix(): Matrix4 {
    if (!this.params || !this.params.dataset) {
      return new Matrix4();
    }
    // 1. Go from centroid coordinates (in frame pixels) to normalized frame
    //    coordinates, where (0,0) is the center of the frame and axes are in
    //    the [-0.5, 0.5] range.
    const frameResolution = this.params.dataset.frameResolution;
    const framePixelsToNormFrameCoords = new Matrix4().compose(
      new Vector3(-0.5, -0.5, 0), // Shift so (0,0) is the center of the frame
      new Quaternion(), // No rotation
      new Vector3(1 / frameResolution.x, 1 / frameResolution.y, 1) // Scale to normalized coordinates
    );

    // 2. Apply pan offset, flipping Y axis.
    const panningOffset = new Matrix4().makeTranslation(this.panOffset.x, this.panOffset.y * -1, 0);

    // 3. Scale back to onscreen canvas pixels, and move origin back to top left corner.
    const frameToCanvasPxScale = this.scaleInfo.frameToCanvasCoordinates.clone().multiply(this.canvasResolution);
    const normFrameCoordsToCanvasPixels = new Matrix4().compose(
      new Vector3(...this.canvasResolution.clone().multiplyScalar(0.5).toArray(), 0), // Move origin to top left corner
      new Quaternion(), // No rotation
      new Vector3(frameToCanvasPxScale.x, frameToCanvasPxScale.y, 0) // Scale to canvas pixels, also Z=0
    );

    // Combine all transformations into a single matrix
    return normFrameCoordsToCanvasPixels.multiply(panningOffset).multiply(framePixelsToNormFrameCoords);
  }

  // RENDERING /////////////////////////////////////////////////////////////////////////////

  /**
   * Updates the range of the track path line so that it shows up the path up to
   * the current frame.
   */
  private syncTrackPathLine(): void {
    // Show nothing if track doesn't exist or doesn't have centroid data
    const track = this.params?.track;
    if (!track || !track.centroids || !this.params?.showTrackPath) {
      this.line.geometry.instanceCount = 0;
      return;
    }

    // Show path up to current frame
    let range = this.currentFrame - track.startTime();

    if (range >= track.duration() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }

    this.line.geometry.instanceCount = Math.max(0, range);
  }

  private syncHighlightedId(): void {
    // Hide highlight if no track is selected
    if (!this.params?.track) {
      this.setUniform("highlightedId", -1);
      return;
    }
    this.setUniform("highlightedId", this.params?.track.getIdAtTime(this.currentFrame));
  }

  public render(_options?: RenderOptions): void {
    this.checkPixelRatio();
    this.syncHighlightedId();
    this.syncTrackPathLine();

    this.renderer.render(this.scene, this.camera);
    this.onRenderCallback?.();
  }

  public dispose(): void {
    this.material.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
    this.pickMaterial.dispose();
  }

  public getIdAtPixel(x: number, y: number): PixelIdInfo | null {
    const dataset = this.params?.dataset;
    if (!dataset) {
      return null;
    }

    const rt = this.renderer.getRenderTarget();

    this.renderer.setRenderTarget(this.pickRenderTarget);
    this.renderer.render(this.pickScene, this.camera);

    const pixbuf = new Uint8Array(4);
    this.renderer.readRenderTargetPixels(this.pickRenderTarget, x, this.pickRenderTarget.height - y, 1, 1, pixbuf);
    // restore main render target
    this.renderer.setRenderTarget(rt);

    // get 32bit value from 4 8bit values
    const segId = pixbuf[0] | (pixbuf[1] << 8) | (pixbuf[2] << 16) | (pixbuf[3] << 24);

    if (segId === 0) {
      return null;
    }
    const globalId = getGlobalIdFromSegId(dataset.frameToGlobalIdLookup, this.currentFrame, segId);
    return { segId, globalId };
  }

  public getDepthToScaleFn(_screenSpaceMatrix: Matrix4): (depth: number) => { scale: number; clipOpacity: number } {
    return () => {
      return {
        scale: this.zoomMultiplier,
        clipOpacity: 1.0,
      };
    };
  }
}
