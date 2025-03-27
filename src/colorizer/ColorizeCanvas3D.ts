import {
  AREA_LIGHT,
  Light,
  LoadSpec,
  RENDERMODE_RAYMARCH,
  SKY_LIGHT,
  View3d,
  Volume,
  VolumeLoaderContext,
} from "@aics/vole-core";
import { render } from "react-dom";
import { Vector2, Vector3 } from "three";

import { CanvasScaleInfo, CanvasType, FrameLoadResult } from "./types";

import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";

const CACHE_MAX_SIZE = 1_000_000_000;
const CONCURRENCY_LIMIT = 8;
const PREFETCH_CONCURRENCY_LIMIT = 3;
const loaderContext = new VolumeLoaderContext(CACHE_MAX_SIZE, CONCURRENCY_LIMIT, PREFETCH_CONCURRENCY_LIMIT);

export class ColorizeCanvas3D implements IRenderCanvas {
  private viewContainer: HTMLElement;
  private view3d: View3d;
  private onLoadFrameCallback: (result: FrameLoadResult) => void;
  private params: RenderCanvasStateParams;

  private tempCanvas: HTMLCanvasElement;

  private volumePromise: Promise<FrameLoadResult> | null = null;

  /**
   * View3d requires a div to be passed in, and it mounts the ThreeJS panel to that div.
   * See if I can get away with just grabbing the child element of the div?
   * Or it also seems like ThreeJS will just create its own div...
   */

  constructor(params: RenderCanvasStateParams) {
    this.params = params;
    this.viewContainer = document.createElement("div");
    this.view3d = new View3d({ parentElement: this.viewContainer });
    this.view3d.loaderContext = loaderContext;
    this.setResolution(10, 10);
    this.view3d.setShowAxis(true);
    this.initLights();
    this.view3d.setVolumeRenderMode(RENDERMODE_RAYMARCH);

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.style.width = "10px";
    this.tempCanvas.style.height = "10px";

    this.onLoadFrameCallback = () => {};
  }

  private initLights() {
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
    const view3dElement = this.view3d.getDOMElement();
    if (view3dElement.children.length === 0) {
      return this.tempCanvas;
    }
    return view3dElement.children[0] as HTMLCanvasElement;
  }

  get resolution(): Vector2 {
    return new Vector2(this.viewContainer.clientWidth, this.viewContainer.clientHeight);
  }

  getScaleInfo(): CanvasScaleInfo {
    return {
      type: CanvasType.CANVAS_3D,
    };
  }

  setResolution(width: number, height: number): void {
    this.viewContainer.style.width = `${width}px`;
    this.viewContainer.style.height = `${height}px`;
    this.view3d.resize(null, width, height);
  }

  setParams(params: RenderCanvasStateParams): Promise<void> {
    this.params = params;
    return Promise.resolve();
  }

  setFrame(_requestedFrame: number): Promise<FrameLoadResult | null> {
    if (this.volumePromise) {
      return this.volumePromise;
    }
    const loadInitialVolume = async (): Promise<FrameLoadResult> => {
      console.log("Awaiting onOpen");
      await loaderContext.onOpen();

      // Setup volume loader and load an example volume
      console.log("Setting up loader");
      const loader = await loaderContext.createLoader([
        "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/1.zarr",
        "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/2.zarr",
      ]);
      const loadSpec = new LoadSpec();
      const volume = await loader.createVolume(loadSpec, (v: Volume, channelIndex: number) => {
        const currentVol = v;

        // currently, this must be called when channel data arrives (here in this callback)
        this.view3d.onVolumeData(currentVol, [channelIndex]);

        this.view3d.setVolumeChannelEnabled(currentVol, channelIndex, true);

        // these calls tell the viewer that things are out of date
        this.view3d.updateActiveChannels(currentVol);
        this.view3d.updateLuts(currentVol);
        this.view3d.redraw();
        console.log("Volume loaded");
      });
      this.view3d.addVolume(volume);
      this.view3d.updateDensity(volume, 12.5);
      this.view3d.updateExposure(0.75);
      await loader.loadVolumeData(volume);
      this.render();
      return {
        frame: 0,
        isFrameLoaded: true,
        backdropKey: null,
        isBackdropLoaded: true,
      };
    };
    this.volumePromise = loadInitialVolume();
    return this.volumePromise as Promise<FrameLoadResult>;
  }

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onLoadFrameCallback = callback;
  }

  render(): void {
    this.view3d.redraw();
  }

  dispose(): void {
    this.view3d.removeAllVolumes();
  }

  getIdAtPixel(_x: number, _y: number): number {
    return 0;
  }
}
