import {
  AREA_LIGHT,
  ColorizeFeature,
  Light,
  Line3d,
  LoadSpec,
  Lut,
  RawArrayLoader,
  RENDERMODE_RAYMARCH,
  SKY_LIGHT,
  TiffLoader,
  View3d,
  Volume,
  VolumeLoaderContext,
  WorkerLoader,
} from "@aics/vole-core";
import { Box3, Color, Matrix4, Quaternion, Vector2, Vector3 } from "three";
import { clamp, inverseLerp, lerp } from "three/src/math/MathUtils";

import { MAX_FEATURE_CATEGORIES } from "src/constants";

import { getPixelRatio } from "./canvas";
import { ColorRampType } from "./ColorRamp";
import { IInnerRenderCanvas } from "./IInnerRenderCanvas";
import { RenderCanvasStateParams, RenderOptions } from "./IRenderCanvas";
import {
  CanvasScaleInfo,
  CanvasType,
  ChannelRangePreset,
  DrawMode,
  FeatureDataType,
  FrameLoadResult,
  PixelIdInfo,
  TrackPathColorMode,
} from "./types";
import { getRelativeToAbsoluteChannelIndexMap, getVolumeSources } from "./utils/channels";
import {
  computeTrackLinePointsAndIds,
  computeVertexColorsFromIds,
  getGlobalIdFromSegId,
  getLineUpdateFlags,
  hasPropertyChanged,
} from "./utils/data_utils";
import { packDataTexture } from "./utils/texture_utils";

const CACHE_MAX_SIZE = 1_000_000_000;
const CONCURRENCY_LIMIT = 8;
const PREFETCH_CONCURRENCY_LIMIT = 3;

const ZOOM_IN_MULTIPLIER = 0.75;
const ZOOM_OUT_MULTIPLIER = 1 / ZOOM_IN_MULTIPLIER;

const loaderContext = new VolumeLoaderContext(CACHE_MAX_SIZE, CONCURRENCY_LIMIT, PREFETCH_CONCURRENCY_LIMIT);

export class ColorizeCanvas3D implements IInnerRenderCanvas {
  // private viewContainer: HTMLElement;
  private view3d: View3d;
  private onLoadFrameCallback: (result: FrameLoadResult) => void;
  private params: RenderCanvasStateParams | null;

  private canvasResolution: Vector2;

  private tempCanvas: HTMLCanvasElement;

  private loader: WorkerLoader | RawArrayLoader | TiffLoader | null = null;
  private volume: Volume | null = null;
  /** A Promise for the load of the initial Volume object. */
  private initializingVolumePromise: Promise<Volume> | null = null;
  /** A Promise for the load of the volume data for a single frame. */
  private volumeFrameLoadPromise: Promise<FrameLoadResult | null> | null = null;

  private pendingFrame: number;
  private currentFrame: number;

  /**
   * Maps from the local index of a backdrop, as presented in the Dataset and
   * TFE's UI, to its absolute channel index in the Volume.
   */
  private backdropIndexToAbsoluteChannelIndex: number[] | null = null;

  private linePoints: Float32Array;
  private lineIds: number[];
  private lineObject: Line3d;
  /**
   * Second copy of the base line object, with transparency + overlay enabled.
   * This allows the line to be shown "through" objects.
   */
  private lineOverlayObject: Line3d;
  private lineColors: Float32Array;

  constructor() {
    this.params = null;
    this.view3d = new View3d();
    this.canvasResolution = new Vector2(10, 10);
    this.setResolution(10, 10);
    this.view3d.setShowAxis(true);
    this.view3d.setVolumeRenderMode(RENDERMODE_RAYMARCH);
    this.initLights();

    this.linePoints = new Float32Array(0);
    this.lineColors = new Float32Array(0);
    this.lineIds = [];
    this.lineObject = new Line3d();
    this.lineOverlayObject = new Line3d();

    // TODO: Allow users to control opacity of the overlay line
    this.lineOverlayObject.setOpacity(0.25);
    this.lineOverlayObject.setRenderAsOverlay(true);

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.style.width = "10px";
    this.tempCanvas.style.height = "10px";
    this.pendingFrame = -1;
    this.currentFrame = -1;

    this.onLoadFrameCallback = () => {};

    this.getScreenSpaceMatrix = this.getScreenSpaceMatrix.bind(this);
    this.getIdAtPixel = this.getIdAtPixel.bind(this);
  }

  // Camera/mouse event handlers

  handleDragEvent(_x: number, _y: number): boolean {
    return false;
  }

  handleScrollEvent(_offsetX: number, _offsetY: number, _scrollDelta: number): boolean {
    return false;
  }

  private scaleCameraPosition(scale: number): void {
    const cameraState = this.view3d.getCameraState();
    const position = new Vector3(...cameraState.position);
    const target = new Vector3(...cameraState.target);
    const positionDelta = position.clone().sub(target);
    const newPosition = target.add(positionDelta.multiplyScalar(scale));
    this.view3d.setCameraState({
      position: newPosition.toArray(),
    });
  }

  handleZoomIn(): boolean {
    this.scaleCameraPosition(ZOOM_IN_MULTIPLIER);
    return true;
  }

  handleZoomOut(): boolean {
    this.scaleCameraPosition(ZOOM_OUT_MULTIPLIER);
    return true;
  }

  resetView(): boolean {
    this.view3d.resetCamera();
    return true;
  }

  private initLights(): void {
    const lights = [new Light(SKY_LIGHT), new Light(AREA_LIGHT)];
    lights[0].mColorTop = new Vector3(0.3, 0.3, 0.3);
    lights[0].mColorMiddle = new Vector3(0.3, 0.3, 0.3);
    lights[0].mColorBottom = new Vector3(0.3, 0.3, 0.3);
    lights[1].mTheta = (14 * Math.PI) / 180.0;
    lights[1].mPhi = (54 * Math.PI) / 180.0;
    lights[1].mColor = new Vector3(0.3, 0.3, 0.3);
    this.view3d.updateLights(lights);
  }

  get domElement(): HTMLElement {
    return this.view3d.getDOMElement();
  }

  get canvas(): HTMLCanvasElement {
    return this.view3d.getCanvasDOMElement();
  }

  get resolution(): Vector2 {
    return this.canvasResolution.clone();
  }

  get scaleInfo(): CanvasScaleInfo {
    return {
      type: CanvasType.CANVAS_3D,
    };
  }

  setResolution(width: number, height: number): void {
    this.view3d.resize(null, width, height);
    this.canvasResolution.set(width, height);
    const pixelRatio = getPixelRatio();
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
  }

  private configureColorizeFeature(volume: Volume, channelIndex: number): void {
    if (!this.params) {
      return;
    }
    const dataset = this.params.dataset;
    const featureKey = this.params.featureKey;
    if (dataset !== null && featureKey !== null) {
      const featureData = dataset.getFeatureData(featureKey);
      if (featureData) {
        const isCategorical = dataset.isFeatureCategorical(featureKey);
        const ramp = isCategorical ? this.params.categoricalPaletteRamp : this.params.colorRamp;
        const range = isCategorical ? [0, MAX_FEATURE_CATEGORIES - 1] : this.params.colorRampRange;
        const feature: ColorizeFeature = {
          idsToFeatureValue: featureData.tex,
          featureValueToColor: ramp.texture,
          useRepeatingColor: ramp.type === ColorRampType.CATEGORICAL,
          inRangeIds: packDataTexture(Array.from(this.params.inRangeLUT), FeatureDataType.U8),
          outlierData: packDataTexture(Array.from(dataset.outliers ?? []), FeatureDataType.U8),
          featureMin: range[0],
          featureMax: range[1],
          outlineColor: this.params.outlineColor.clone().convertLinearToSRGB(),
          outlineAlpha: 1,
          outlierColor: this.params.outlierDrawSettings.color.clone().convertLinearToSRGB(),
          outOfRangeColor: this.params.outOfRangeDrawSettings.color.clone().convertLinearToSRGB(),
          outlierDrawMode: this.params.outlierDrawSettings.mode,
          outOfRangeDrawMode: this.params.outOfRangeDrawSettings.mode,
          hideOutOfRange: this.params.outOfRangeDrawSettings.mode === DrawMode.HIDE,
          frameToGlobalIdLookup: dataset.frameToGlobalIdLookup ?? new Map(),
        };
        this.view3d.setChannelColorizeFeature(volume, channelIndex, feature);
      }
    }
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
    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setColor(color, trackPathColorMode === TrackPathColorMode.USE_FEATURE_COLOR);
      lineObject.setLineWidth(trackPathWidthPx);
    }
  }

  private updateLineGeometry(points: Float32Array, colors: Float32Array): void {
    if (!this.params || !this.params.track || !this.params.dataset) {
      return;
    }
    if (!this.view3d.hasLineObject(this.lineObject)) {
      this.view3d.addLineObject(this.lineObject);
      this.view3d.addLineObject(this.lineOverlayObject);
    }

    for (const lineObject of [this.lineObject, this.lineOverlayObject]) {
      lineObject.setLineVertexData(points, colors);
      if (this.volume) {
        lineObject.setScale(new Vector3(1, 1, 1).divide(this.volume.physicalSize));
        lineObject.setTranslation(new Vector3(-0.5, -0.5, -0.5));
      }
    }
  }

  private handleColorRampUpdate(prevParams: RenderCanvasStateParams | null, params: RenderCanvasStateParams): boolean {
    if (
      hasPropertyChanged(params, prevParams, [
        "colorRamp",
        "colorRampRange",
        "categoricalPaletteRamp",
        "dataset",
        "featureKey",
        "inRangeLUT",
        "outOfRangeDrawSettings",
        "outlierDrawSettings",
        "outlineColor",
      ])
    ) {
      if (this.volume) {
        // Update color ramp for all channels
        const segChannel = params.dataset?.frames3d?.segmentationChannel ?? 0;
        for (let i = 0; i < this.volume.numChannels; i++) {
          if (i === segChannel) {
            this.configureColorizeFeature(this.volume, i);
          } else {
            this.view3d.setChannelColorizeFeature(this.volume, i, null);
          }
        }
        return true;
      }
    }
    return false;
  }

  private handleDatasetUpdate(prevParams: RenderCanvasStateParams | null, params: RenderCanvasStateParams): boolean {
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      if (params.dataset !== null && params.dataset.has3dFrames() && params.dataset.frames3d) {
        if (this.volume) {
          this.view3d.removeAllVolumes();
          this.volume.cleanup();
          this.volume = null;
        }
        const sources = getVolumeSources(params.dataset.frames3d);
        this.initializingVolumePromise = this.loadNewVolume(sources);
        this.initializingVolumePromise.then(() => {
          this.setFrame(params.pendingFrame);
        });
        return true;
      }
    }
    return false;
  }

  private handleLineUpdate(prevParams: RenderCanvasStateParams | null, params: RenderCanvasStateParams): boolean {
    const { geometryNeedsUpdate, vertexColorNeedsUpdate, materialNeedsUpdate } = getLineUpdateFlags(prevParams, params);
    let needsRender = false;

    if (geometryNeedsUpdate || vertexColorNeedsUpdate) {
      if (geometryNeedsUpdate && params.dataset && params.track) {
        const { ids, points } = computeTrackLinePointsAndIds(params.dataset, params.track, params.showTrackPathBreaks);
        this.lineIds = ids;
        this.linePoints = points;
      }
      if (vertexColorNeedsUpdate) {
        this.lineColors = computeVertexColorsFromIds(this.lineIds, params);
      }
      this.updateLineGeometry(this.linePoints, this.lineColors);
      needsRender = true;
    }
    if (materialNeedsUpdate) {
      this.updateLineMaterial();
      needsRender = true;
    }
    return needsRender;
  }

  private isValidBackdropIndex(backdropIndex: number): boolean {
    return (
      this.backdropIndexToAbsoluteChannelIndex !== null &&
      backdropIndex >= 0 &&
      backdropIndex < this.backdropIndexToAbsoluteChannelIndex.length &&
      this.backdropIndexToAbsoluteChannelIndex[backdropIndex] >= 0
    );
  }

  /**
   * Returns the min-max range for a given backdrop channel based on the given
   * range preset. Returns `null` if the preset cannot be calculated (e.g. no
   * volume is loaded or the backdrop index is invalid).
   */
  public getBackdropChannelRangePreset(backdropIndex: number, preset: ChannelRangePreset): [number, number] | null {
    if (!this.volume || !this.backdropIndexToAbsoluteChannelIndex || !this.isValidBackdropIndex(backdropIndex)) {
      return null;
    }
    const channelIndex = this.backdropIndexToAbsoluteChannelIndex[backdropIndex];
    const histogram = this.volume.getHistogram(channelIndex);
    let newMin = 0;
    let newMax = 0;
    switch (preset) {
      case ChannelRangePreset.NONE: {
        newMin = histogram.getDataMin();
        newMax = histogram.getDataMax();
        break;
      }
      case ChannelRangePreset.DEFAULT: {
        // Ramp over 50th to 98th percentile
        const pct50Bin = histogram.findBinOfPercentile(0.5);
        const pct98Bin = histogram.findBinOfPercentile(0.983);
        newMin = histogram.getBinRange(pct50Bin)[0];
        newMax = histogram.getBinRange(pct98Bin)[1];
        break;
      }
      case ChannelRangePreset.IJ_AUTO: {
        const [minIJBin, maxIJBin] = histogram.findAutoIJBins();
        newMin = histogram.getBinRange(minIJBin)[0];
        newMax = histogram.getBinRange(maxIJBin)[1];
        break;
      }
      case ChannelRangePreset.AUTO_2: {
        // Ramp over middle 80%
        const [minBestFitBin, maxBestFitBin] = histogram.findBestFitBins();
        newMin = histogram.getBinRange(minBestFitBin)[0];
        newMax = histogram.getBinRange(maxBestFitBin)[1];
        break;
      }
      default:
        return null;
    }
    return [newMin, newMax];
  }

  public getBackdropChannelDataRange(backdropIndex: number): [number, number] | null {
    if (!this.volume || !this.backdropIndexToAbsoluteChannelIndex || !this.isValidBackdropIndex(backdropIndex)) {
      return null;
    }
    const channelIndex = this.backdropIndexToAbsoluteChannelIndex[backdropIndex];
    return [this.volume.getChannel(channelIndex).rawMin, this.volume.getChannel(channelIndex).rawMax];
  }

  private updateVolumeChannels(
    volume: Volume,
    channelSettings: RenderCanvasStateParams["channelSettings"],
    backdropIndexToChannelIndex: number[]
  ): void {
    for (let backdropIdx = 0; backdropIdx < backdropIndexToChannelIndex.length; backdropIdx++) {
      const settings = channelSettings[backdropIdx];
      const channelIndex = backdropIndexToChannelIndex[backdropIdx];
      const colorArr: [number, number, number] = [
        settings.color.r * 255 * settings.opacity,
        settings.color.g * 255 * settings.opacity,
        settings.color.b * 255 * settings.opacity,
      ];
      this.view3d.setVolumeChannelOptions(volume, channelIndex, {
        enabled: settings.visible,
        color: colorArr,
        isosurfaceEnabled: false,
      });
      const histogram = volume.getHistogram(channelIndex);
      const minBin = histogram.findFractionalBinOfValue(settings.min);
      const maxBin = histogram.findFractionalBinOfValue(settings.max);
      const lut = new Lut().createFromMinMax(minBin, maxBin);

      volume.setLut(channelIndex, lut);
    }
    if (volume.isLoaded()) {
      this.view3d.updateActiveChannels(volume);
      this.view3d.updateLuts(volume);
      this.view3d.redraw();
    }
  }

  private handleChannelUpdate(prevParams: RenderCanvasStateParams | null, params: RenderCanvasStateParams): boolean {
    if (
      hasPropertyChanged(params, prevParams, ["channelSettings"]) &&
      this.volume &&
      this.backdropIndexToAbsoluteChannelIndex
    ) {
      this.updateVolumeChannels(this.volume, params.channelSettings, this.backdropIndexToAbsoluteChannelIndex);
      return true;
    }
    return false;
  }

  public setParams(params: RenderCanvasStateParams): Promise<void> {
    if (this.params === params) {
      return Promise.resolve();
    }
    const prevParams = this.params;
    this.params = params;

    const didColorRampUpdate = this.handleColorRampUpdate(prevParams, params);
    const didDatasetUpdate = this.handleDatasetUpdate(prevParams, params);
    const didLineUpdate = this.handleLineUpdate(prevParams, params);
    const didChannelUpdate = this.handleChannelUpdate(prevParams, params);
    const needsRender = didColorRampUpdate || didDatasetUpdate || didLineUpdate || didChannelUpdate;

    if (needsRender) {
      this.render({ synchronous: false });
    }

    // Eventually volume change is handled here?
    return Promise.resolve();
  }

  private async loadNewVolume(sources: string[]): Promise<Volume> {
    if (!this.params) {
      throw new Error("Cannot load volume without parameters.");
    }
    await loaderContext.onOpen();

    console.log("Loading volume from path:", sources);
    this.loader = await loaderContext.createLoader(sources);
    this.loader.syncMultichannelLoading(true);

    const loadSpec = new LoadSpec();
    loadSpec.time = this.params.pendingFrame;
    const segChannel = this.params.dataset?.frames3d?.segmentationChannel ?? 0;
    const volume = await this.loader.createVolume(loadSpec, (v: Volume, channelIndex: number) => {
      const currentVol = v;

      this.view3d.onVolumeData(currentVol, [channelIndex]);
      if (channelIndex === segChannel) {
        this.view3d.setVolumeChannelEnabled(currentVol, channelIndex, true);
        this.configureColorizeFeature(currentVol, channelIndex);
      } else {
        this.view3d.setVolumeChannelEnabled(currentVol, channelIndex, false);
      }
      this.view3d.updateActiveChannels(currentVol);
      this.view3d.updateLuts(currentVol);

      if (this.params && this.backdropIndexToAbsoluteChannelIndex) {
        this.updateVolumeChannels(volume, this.params.channelSettings, this.backdropIndexToAbsoluteChannelIndex);
      }
    });
    this.view3d.addVolume(volume);
    this.volume = volume;

    this.backdropIndexToAbsoluteChannelIndex = getRelativeToAbsoluteChannelIndexMap(
      sources,
      volume.imageInfo.numChannelsPerSource,
      this.params.dataset?.frames3d?.backdrops
    );

    this.view3d.setVolumeChannelEnabled(volume, segChannel, true);
    this.view3d.setVolumeChannelOptions(volume, segChannel, {
      isosurfaceEnabled: false,
      isosurfaceOpacity: 1.0,
      enabled: true,
      color: [1, 1, 1],
      emissiveColor: [0, 0, 0],
    });
    this.view3d.enablePicking(volume, true, segChannel);
    this.view3d.setInterpolationEnabled(volume, true);

    this.view3d.updateDensity(volume, 0.5);
    this.view3d.updateExposure(0.6);
    this.view3d.setVolumeRotation(volume, [0, 0, 0]);
    this.view3d.setVolumeTranslation(volume, [0, 0, 0]);
    this.view3d.setVolumeScale(volume, [1, 1, 1]);
    this.view3d.setShowBoundingBox(volume, true);
    this.view3d.setBoundingBoxColor(volume, [0.5, 0.5, 0.5]);
    this.view3d.resetCamera();

    this.updateVolumeChannels(volume, this.params.channelSettings, this.backdropIndexToAbsoluteChannelIndex);
    this.updateLineGeometry(this.linePoints, this.lineColors);

    // TODO: Look at gamma/levels setting? Vole-app looks good at levels
    // 0,75,255
    // this.view3d.setGamma(volume, 0, 75, 255);

    await this.loader.loadVolumeData(volume);
    return volume;
  }

  setFrame(requestedFrame: number): Promise<FrameLoadResult | null> {
    if (!this.params?.dataset?.isValidFrameIndex(requestedFrame)) {
      return Promise.resolve(null);
    }
    if (requestedFrame === this.currentFrame) {
      this.pendingFrame = -1;
      return Promise.resolve({
        frame: this.currentFrame,
        frameError: false,
        backdropKey: null,
        backdropError: false,
      });
    }
    if (requestedFrame === this.pendingFrame && this.volumeFrameLoadPromise) {
      return this.volumeFrameLoadPromise;
    }
    if (!this.volume && !this.initializingVolumePromise) {
      return Promise.resolve(null);
    }

    const loadVolumeFrame = async (): Promise<FrameLoadResult | null> => {
      if (!this.volume || !this.loader) {
        await this.initializingVolumePromise;
        if (!this.volume) {
          throw new Error("No volume was loaded");
        }
      }
      await this.view3d.setTime(this.volume, requestedFrame);
      if (requestedFrame !== this.pendingFrame) {
        // This frame request has been superceded by another request
        return null;
      }
      this.currentFrame = requestedFrame;
      this.pendingFrame = -1;
      this.render({ synchronous: true });
      const result: FrameLoadResult = {
        frame: requestedFrame,
        frameError: false,
        backdropKey: null,
        backdropError: false,
      };
      this.onLoadFrameCallback(result);
      return result;
    };
    this.pendingFrame = requestedFrame;
    this.volumeFrameLoadPromise = loadVolumeFrame();
    return this.volumeFrameLoadPromise;
  }

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onLoadFrameCallback = callback;
  }

  public setOnRenderCallback(callback: (() => void) | null): void {
    this.view3d.setOnRenderCallback(callback);
  }

  private syncTrackPathLine(): void {
    // Show nothing if track doesn't exist
    if (!this.params || !this.params.track || !this.params.showTrackPath) {
      this.lineObject.setNumSegmentsVisible(0);
      this.lineOverlayObject.setNumSegmentsVisible(0);
      return;
    }
    // Show path up to current frame
    const track = this.params.track;
    let range = this.currentFrame - track.startTime();
    if (range > track.duration() || range < 0) {
      // Hide track if we are outside the track range
      range = 0;
    }
    this.lineObject.setNumSegmentsVisible(range);
    this.lineOverlayObject.setNumSegmentsVisible(range);
  }

  private syncSelectedId(): void {
    if (!this.volume || !this.params || !this.params.dataset) {
      return;
    }
    const id = this.params.track ? this.params.track.getIdAtTime(this.currentFrame) : -1;
    this.view3d.setSelectedID(this.volume, this.params.dataset.frames3d?.segmentationChannel ?? 0, id);
  }

  render(options?: RenderOptions): void {
    this.syncTrackPathLine();
    this.syncSelectedId();
    this.view3d.redraw(options?.synchronous);
  }

  dispose(): void {
    this.view3d.removeLineObject(this.lineObject);
    this.view3d.removeLineObject(this.lineOverlayObject);
    this.lineObject.cleanup();
    this.lineOverlayObject.cleanup();
    this.view3d.removeAllVolumes();
  }

  getIdAtPixel(x: number, y: number): PixelIdInfo | null {
    const dataset = this.params?.dataset;
    if (this.volume?.isLoaded() && dataset) {
      const segId = this.view3d.hitTest(x, y);
      if (segId === -1) {
        // Background hit
        return null;
      }
      const globalId = getGlobalIdFromSegId(dataset.frameToGlobalIdLookup, this.currentFrame, segId);
      return { segId, globalId };
    }
    return null;
  }

  public getScreenSpaceMatrix(): Matrix4 {
    if (!this.volume) {
      // Return an identity matrix if the volume is not loaded
      return new Matrix4();
    }

    // 1. Normalize from volume voxel coordinates to world space. Also,
    //    translate so that the center of the volume is at (0, 0, 0).
    const volumeScale = new Vector3(1, 1, 1)
      .multiply(this.volume.physicalPixelSize)
      .divideScalar(this.volume.physicalScale);
    const normalizeVoxelToWorld = new Matrix4().compose(
      this.volume.normPhysicalSize.clone().multiplyScalar(-0.5), // Translate to center
      new Quaternion(0, 0, 0, 1),
      volumeScale
    );

    // 2. Get the view projection matrix, which transforms from world space to
    //    screen space in the [-1, 1] range.
    const viewProjectionMatrix = this.view3d.getViewProjectionMatrix();

    // 3. Scale the [-1, 1] range to canvas pixels, and move the origin to the
    //    top left corner of the canvas. Normalize the Z axis to the [0, 1] range.
    const viewProjectionToScreen = new Matrix4().compose(
      new Vector3(0.5 * this.canvasResolution.x, 0.5 * this.canvasResolution.y, 0.5), // Translate origin
      new Quaternion(0, 0, 0, 1),
      new Vector3(0.5 * this.canvasResolution.x, -0.5 * this.canvasResolution.y, 0.5) // Scale to screen
    );

    return viewProjectionToScreen.multiply(viewProjectionMatrix).multiply(normalizeVoxelToWorld);
  }

  public getDepthToScaleFn(screenSpaceMatrix: Matrix4): (depth: number) => { scale: number; clipOpacity: number } {
    if (!this.volume) {
      return () => ({ scale: 1, clipOpacity: 1 });
    }
    // Determine min and max Z depth of the volume in screen space, using the
    // corners.
    const box3d = new Box3(new Vector3(0, 0, 0), this.volume.imageInfo.originalSize.clone().subScalar(1));
    box3d.applyMatrix4(screenSpaceMatrix);
    const minZ = Math.max(0.01, Math.min(box3d.min.z, box3d.max.z));
    const maxZ = Math.min(1, Math.max(box3d.min.z, box3d.max.z));

    return (depth: number): { scale: number; clipOpacity: number } => {
      const depthT = clamp(inverseLerp(minZ, maxZ, depth), 0, 1);
      return {
        // Scale by distance from camera
        scale: (depth - 1) * -60 - 1,
        // Make objects more transparent if they are further away
        clipOpacity: lerp(0.8, 0.1, depthT),
      };
    };
  }
}
