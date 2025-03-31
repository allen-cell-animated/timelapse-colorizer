import {
  AREA_LIGHT,
  Light,
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
import { Vector2, Vector3 } from "three";

import { CanvasScaleInfo, CanvasType, FrameLoadResult } from "./types";

import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";

const CACHE_MAX_SIZE = 1_000_000_000;
const CONCURRENCY_LIMIT = 8;
const PREFETCH_CONCURRENCY_LIMIT = 3;
const loaderContext = new VolumeLoaderContext(CACHE_MAX_SIZE, CONCURRENCY_LIMIT, PREFETCH_CONCURRENCY_LIMIT);

export class ColorizeCanvas3D implements IRenderCanvas {
  // private viewContainer: HTMLElement;
  private view3d: View3d;
  private onLoadFrameCallback: (result: FrameLoadResult) => void;
  // private params: RenderCanvasStateParams;

  private canvasResolution: Vector2;

  private tempCanvas: HTMLCanvasElement;

  private loader: WorkerLoader | RawArrayLoader | TiffLoader | null = null;
  private volume: Volume | null = null;
  private pendingVolumePromise: Promise<FrameLoadResult> | null = null;
  private pendingFrame: number;
  private currentFrame: number;

  /**
   * View3d requires a div to be passed in, and it mounts the ThreeJS panel to that div.
   * See if I can get away with just grabbing the child element of the div?
   * Or it also seems like ThreeJS will just create its own div...
   */

  constructor(_params: RenderCanvasStateParams) {
    // this.params = params;

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

  get domElement(): HTMLCanvasElement {
    // I hope this works
    return this.view3d.getCanvasDOMElement();
  }

  get resolution(): Vector2 {
    return this.canvasResolution.clone();
  }

  getScaleInfo(): CanvasScaleInfo {
    return {
      type: CanvasType.CANVAS_3D,
    };
  }

  setResolution(width: number, height: number): void {
    this.view3d.resize(null, width, height);
    this.canvasResolution.set(width, height);
  }

  setParams(_params: RenderCanvasStateParams): Promise<void> {
    // this.params = params;
    // Eventually volume change is handled here?
    return Promise.resolve();
  }

  private async loadInitialVolume(path: string | string[]): Promise<Volume> {
    await loaderContext.onOpen();

    // Setup volume loader and load an example volume
    const loader = await loaderContext.createLoader(path);
    const loadSpec = new LoadSpec();
    const volume = await loader.createVolume(loadSpec, (v: Volume, channelIndex: number) => {
      const currentVol = v;

      // currently, this must be called when channel data arrives (here in this callback)
      this.view3d.onVolumeData(currentVol, [channelIndex]);

      // Get histogram from channel data
      const histogram = currentVol.getHistogram(channelIndex);

      // Use colorize
      const lut = new Lut().createLabelColors(histogram);
      currentVol.setColorPalette(channelIndex, lut.lut);
      currentVol.setColorPaletteAlpha(channelIndex, 1.0);

      // these calls tell the viewer that things are out of date
      this.view3d.updateActiveChannels(currentVol);
      this.view3d.updateLuts(currentVol);
      this.view3d.redraw();
    });
    this.view3d.addVolume(volume);

    this.view3d.setVolumeChannelEnabled(volume, 0, true);
    this.view3d.setVolumeChannelOptions(volume, 0, {
      isosurfaceEnabled: false,
      isosurfaceOpacity: 1.0,
      enabled: true,
      color: [1, 1, 1],
      emissiveColor: [0, 0, 0],
    });

    this.view3d.updateDensity(volume, 0.5);
    this.view3d.updateExposure(0.6);
    this.view3d.setVolumeRotation(volume, [0, 0, 0]);
    this.view3d.setVolumeTranslation(volume, [0, 0, 0]);
    this.view3d.setVolumeScale(volume, [1, 1, 1]);
    this.view3d.setShowBoundingBox(volume, true);
    this.view3d.setBoundingBoxColor(volume, [0.5, 0.5, 0.5]);
    this.view3d.resetCamera();
    // TODO: Look at gamma/levels settings? Vole-app looks good at levels
    // 0,75,255
    // this.view3d.setGamma(volume, 0, 75, 255);

    this.loader = loader;
    this.volume = volume;

    await loader.loadVolumeData(volume);
    return volume;
  }

  setFrame(requestedFrame: number): Promise<FrameLoadResult | null> {
    if (requestedFrame === this.currentFrame) {
      this.pendingFrame = -1;
      return Promise.resolve({
        frame: this.currentFrame,
        isFrameLoaded: true,
        backdropKey: null,
        isBackdropLoaded: true,
      });
    }
    if (requestedFrame === this.pendingFrame && this.pendingVolumePromise) {
      return this.pendingVolumePromise;
    }

    const loadVolumeFrame = async (): Promise<FrameLoadResult> => {
      if (!this.volume || !this.loader) {
        await this.loadInitialVolume([
          "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr",
        ]);
      }
      await this.view3d.setTime(this.volume!, requestedFrame);

      this.render(true);
      this.currentFrame = requestedFrame;
      this.pendingFrame = -1;
      const result = {
        frame: requestedFrame,
        isFrameLoaded: true,
        backdropKey: null,
        isBackdropLoaded: true,
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

  render(synchronous: boolean = false): void {
    this.view3d.redraw(synchronous);
  }

  dispose(): void {
    this.view3d.removeAllVolumes();
  }

  getIdAtPixel(_x: number, _y: number): number {
    return 0;
  }
}
