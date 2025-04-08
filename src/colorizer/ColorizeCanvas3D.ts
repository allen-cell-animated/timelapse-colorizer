import {
  AREA_LIGHT,
  ColorizeFeature,
  Light,
  LoadSpec,
  RawArrayLoader,
  RENDERMODE_RAYMARCH,
  SKY_LIGHT,
  TiffLoader,
  View3d,
  Volume,
  VolumeLoaderContext,
  WorkerLoader,
} from "@aics/vole-core";
import { Vector2, Vector3 } from "three";

import { MAX_FEATURE_CATEGORIES } from "../constants";
import { CanvasScaleInfo, CanvasType, DrawMode, FeatureDataType, FrameLoadResult } from "./types";
import { hasPropertyChanged } from "./utils/data_utils";
import { packDataTexture } from "./utils/texture_utils";

import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";

const CACHE_MAX_SIZE = 1_000_000_000;
const CONCURRENCY_LIMIT = 8;
const PREFETCH_CONCURRENCY_LIMIT = 3;
const loaderContext = new VolumeLoaderContext(CACHE_MAX_SIZE, CONCURRENCY_LIMIT, PREFETCH_CONCURRENCY_LIMIT);

export class ColorizeCanvas3D implements IRenderCanvas {
  // private viewContainer: HTMLElement;
  private view3d: View3d;
  private onLoadFrameCallback: (result: FrameLoadResult) => void;
  private params: RenderCanvasStateParams;

  private canvasResolution: Vector2;

  private tempCanvas: HTMLCanvasElement;

  private loader: WorkerLoader | RawArrayLoader | TiffLoader | null = null;
  private volume: Volume | null = null;
  private initializingVolumePromise: Promise<Volume> | null = null;
  private pendingVolumePromise: Promise<FrameLoadResult> | null = null;
  private pendingFrame: number;
  private currentFrame: number;

  constructor(params: RenderCanvasStateParams) {
    this.params = params;

    this.view3d = new View3d();
    this.view3d.loaderContext = loaderContext;
    this.canvasResolution = new Vector2(10, 10);
    this.setResolution(10, 10);
    this.view3d.setShowAxis(true);
    this.view3d.setVolumeRenderMode(RENDERMODE_RAYMARCH);
    this.initLights();

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.style.width = "10px";
    this.tempCanvas.style.height = "10px";
    this.pendingFrame = -1;
    this.currentFrame = -1;

    this.onLoadFrameCallback = () => {};
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
  }

  private configureColorizeFeature(volume: Volume, channelIndex: number): void {
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
          inRangeIds: packDataTexture(Array.from(this.params.inRangeLUT), FeatureDataType.U8),
          outlierData: packDataTexture(Array.from(dataset.outliers ?? []), FeatureDataType.U8),
          featureMin: range[0],
          featureMax: range[1],
          outlineColor: this.params.outlineColor,
          outlierColor: this.params.outlierDrawSettings.color,
          outOfRangeColor: this.params.outOfRangeDrawSettings.color,
          outlierDrawMode: this.params.outlierDrawSettings.mode,
          outOfRangeDrawMode: this.params.outOfRangeDrawSettings.mode,
          hideOutOfRange: this.params.outOfRangeDrawSettings.mode === DrawMode.HIDE,
          timeToIdOffset: dataset.frameIdOffset ?? new Uint32Array([0]),
        };
        // TODO: This needs to be called again AFTER each channel has loaded.
        // Maybe setup this colorizing in the volume loader callback?
        this.view3d.setChannelColorizeFeature(volume, channelIndex, feature);
      }
    }
  }

  setParams(params: RenderCanvasStateParams): Promise<void> {
    if (this.params === params) {
      return Promise.resolve();
    }
    const prevParams = this.params;
    this.params = params;

    // Update color ramp
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
        "outlierDrawSettings",
        "outOfRangeDrawSettings",
      ])
    ) {
      if (this.volume) {
        // Update color ramp for all channels
        for (let i = 0; i < this.volume.numChannels; i++) {
          this.configureColorizeFeature(this.volume, i);
        }
      }
    }

    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      if (params.dataset !== null && params.dataset.has3dFrames() && params.dataset.frames3dSrc) {
        if (this.volume) {
          this.view3d.removeAllVolumes();
          this.volume.cleanup();
          this.volume = null;
        }
        this.loadNewVolume(params.dataset.frames3dSrc).then(() => {
          this.setFrame(this.params.pendingFrame);
        });
      }
    }

    this.render(false);

    // Eventually volume change is handled here?
    return Promise.resolve();
  }

  private async loadNewVolume(path: string | string[]): Promise<Volume> {
    await loaderContext.onOpen();

    this.loader = await loaderContext.createLoader(path);
    const loadSpec = new LoadSpec();
    loadSpec.time = this.params.pendingFrame;
    const volume = await this.loader.createVolume(loadSpec, (v: Volume, channelIndex: number) => {
      const currentVol = v;

      this.view3d.onVolumeData(currentVol, [channelIndex]);

      this.configureColorizeFeature(currentVol, channelIndex);

      this.view3d.updateActiveChannels(currentVol);
      this.view3d.updateLuts(currentVol);
      this.view3d.redraw();
    });
    this.view3d.addVolume(volume);

    const segChannel = this.params.dataset?.segmentationChannel ?? 0;
    this.view3d.setVolumeChannelEnabled(volume, segChannel, true);
    this.view3d.setVolumeChannelOptions(volume, segChannel, {
      isosurfaceEnabled: false,
      isosurfaceOpacity: 1.0,
      enabled: true,
      color: [1, 1, 1],
      emissiveColor: [0, 0, 0],
    });
    this.view3d.enablePicking(volume, true, segChannel);

    this.view3d.updateDensity(volume, 0.5);
    this.view3d.updateExposure(0.6);
    this.view3d.setVolumeRotation(volume, [0, 0, 0]);
    this.view3d.setVolumeTranslation(volume, [0, 0, 0]);
    this.view3d.setVolumeScale(volume, [1, 1, 1]);
    this.view3d.setShowBoundingBox(volume, true);
    this.view3d.setBoundingBoxColor(volume, [0.5, 0.5, 0.5]);
    this.view3d.resetCamera();

    // TODO: Look at gamma/levels setting? Vole-app looks good at levels
    // 0,75,255
    // this.view3d.setGamma(volume, 0, 75, 255);

    this.volume = volume;

    await this.loader.loadVolumeData(volume);
    return volume;
  }

  setFrame(requestedFrame: number): Promise<FrameLoadResult | null> {
    if (requestedFrame === this.currentFrame) {
      this.pendingFrame = -1;
      return Promise.resolve({
        frame: this.currentFrame,
        frameError: false,
        backdropKey: null,
        backdropError: false,
      });
    }
    if (requestedFrame === this.pendingFrame && this.pendingVolumePromise) {
      return this.pendingVolumePromise;
    }
    if (!this.volume && !this.initializingVolumePromise) {
      return Promise.resolve(null);
    }

    const loadVolumeFrame = async (): Promise<FrameLoadResult> => {
      if (!this.volume || !this.loader) {
        await this.initializingVolumePromise;
        if (!this.volume) {
          throw new Error("No volume was loaded");
        }
      }
      await this.view3d.setTime(this.volume, requestedFrame);

      this.render(true);
      this.currentFrame = requestedFrame;
      this.pendingFrame = -1;
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
    this.pendingVolumePromise = loadVolumeFrame();
    return this.pendingVolumePromise as Promise<FrameLoadResult>;
  }

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onLoadFrameCallback = callback;
  }

  private syncSelectedId(): void {
    if (!this.volume) {
      return;
    }
    const id = this.params.track ? this.params.track.getIdAtTime(this.currentFrame) : -1;
    this.view3d.setSelectedID(this.volume, 0, id + 1);
  }

  render(synchronous = false): void {
    this.syncSelectedId();
    this.view3d.redraw(synchronous);
  }

  dispose(): void {
    this.view3d.removeAllVolumes();
  }

  getIdAtPixel(x: number, y: number): number {
    if (this.volume?.isLoaded()) {
      return this.view3d.hitTest(x, y) - 1;
    }
    return -1;
  }
}
