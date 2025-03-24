import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";
import { FrameLoadResult } from "./types";

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
   * Requests to load and render the image data for a specific frame.
   * @param requestedFrame The frame number to load and render.
   * @returns
   * - `null` if the frame was out of bounds or no dataset was set.
   * - A `FrameLoadResult` object if the frame was loaded and rendered.
   */
  setFrame: (requestedFrame: number) => Promise<FrameLoadResult | null>;
  /**
   * Sets a callback function that will be called whenever any frame is loaded.
   */
  setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void;

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
