import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";
import { FrameLoadResult } from "./types";

export const renderCanvasStateParamsSelector = (state: ViewerStoreState) => ({
  dataset: state.dataset,
  featureKey: state.featureKey,
  track: state.track,
  showTrackPath: state.showTrackPath,
  colorRamp: state.colorRamp,
  colorRampRange: state.colorRampRange,
  categoricalPaletteRamp: state.categoricalPaletteRamp,
  outlineColor: state.outlineColor,
  outlierDrawSettings: state.outlierDrawSettings,
  outOfRangeDrawSettings: state.outOfRangeDrawSettings,
  inRangeLUT: state.inRangeLUT,
  vectorMotionDeltas: state.vectorMotionDeltas,
  vectorVisible: state.vectorVisible,
  vectorColor: state.vectorColor,
  vectorScaleFactor: state.vectorScaleFactor,
  backdropKey: state.backdropKey,
  backdropVisible: state.backdropVisible,
  objectOpacity: state.objectOpacity,
  backdropSaturation: state.backdropSaturation,
  backdropBrightness: state.backdropBrightness,
});

export type RenderCanvasStateParams = ReturnType<typeof renderCanvasStateParamsSelector>;

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
