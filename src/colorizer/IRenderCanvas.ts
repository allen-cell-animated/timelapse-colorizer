import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";
import { CanvasScaleInfo, FrameLoadResult } from "./types";

export type RenderCanvasStateParams = Pick<
  ViewerStoreState,
  | "dataset"
  | "collection"
  | "datasetKey"
  | "featureKey"
  | "track"
  | "showTrackPath"
  | "colorRamp"
  | "colorRampRange"
  | "categoricalPaletteRamp"
  | "outlineColor"
  | "outlierDrawSettings"
  | "outOfRangeDrawSettings"
  | "inRangeLUT"
  | "vectorMotionDeltas"
  | "vectorVisible"
  | "vectorColor"
  | "vectorScaleFactor"
  | "backdropKey"
  | "backdropVisible"
  | "objectOpacity"
  | "backdropSaturation"
  | "backdropBrightness"
>;

export const renderCanvasStateParamsSelector = (state: ViewerStoreState): RenderCanvasStateParams => ({
  dataset: state.dataset,
  collection: state.collection,
  datasetKey: state.datasetKey,
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

/**
 * A canvas that renders timelapse data.
 */
export interface IRenderCanvas {
  get domElement(): HTMLCanvasElement;

  /** (X,Y) resolution of the canvas, in pixels. */
  get resolution(): Vector2;

  /** Gets information about canvas scaling. Switches types for 2D and 3D
   * canvases. */
  get scaleInfo(): CanvasScaleInfo;

  setResolution(width: number, height: number): void;

  /**
   * Updates the parameters used to configure the canvas view. See
   * `CanvasStateParams` for a complete list of parameters required.
   */
  setParams(params: RenderCanvasStateParams): Promise<void>;
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
