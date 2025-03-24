import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";
import { FrameLoadCallback } from "./types";

const canvasStateDeps = [
  "dataset",
  "featureKey",
  "track",
  "showTrackPath",
  "colorRamp",
  "colorRampRange",
  "categoricalPalette",
  "outlineColor",
  "outlierDrawSettings",
  "outOfRangeDrawSettings",
  "inRangeLUT",
  "vectorMotionDeltas",
  "vectorVisible",
  "vectorColor",
  "vectorScaleFactor",
  "backdropKey",
  "backdropVisible",
  "objectOpacity",
  "backdropSaturation",
  "backdropBrightness",
] as const;

export type RenderCanvasStateParams = Pick<ViewerStoreState, (typeof canvasStateDeps)[number]>;

export const renderCanvasStateParamsSelector = (state: ViewerStoreState): RenderCanvasStateParams => {
  const entries = canvasStateDeps.map((key) => [key, state[key]]);
  return Object.fromEntries(entries);
};

/**
 * A canvas that renders timelapse data.
 */
export interface IRenderCanvas {
  get domElement(): HTMLCanvasElement;
  /** (X,Y) resolution of the canvas, in pixels. */
  get resolution(): Vector2;
  setResolution(width: number, height: number): void;
  /**
   * Updates the parameters used to configure the canvas view. See
   * `CanvasStateParams` for a complete list of parameters required.
   */
  setParams(params: RenderCanvasStateParams): void;
  /**
   * Loads and renders the data for a specific frame. Returns a Promise that
   * resolves when the data is loaded and rendered onscreen.
   * @param frame The frame number to load and render. Ignores frames that are
   * out of range of the current dataset or that are already loaded.
   * @returns A `FrameLoadResult` object of the loaded frame.
   * Note that, if the frame is out of bounds, the `FrameLoadResult`'s `frame`
   * property will be whatever frame is currently loaded.
   */
  setFrame: FrameLoadCallback;
  render(): void;
  /**
   * Disposes of the canvas and its resources.
   */
  dispose(): void;
  /**
   * Gets the ID of the segmentation at a pixel coordinate in the canvas, where
   * `(0,0)` is the top left corner.
   */
  getIdAtPixel(x: number, y: number): number;
}
