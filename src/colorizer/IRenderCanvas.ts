import { Matrix4, Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";
import { CanvasScaleInfo, FrameLoadResult, PixelIdInfo } from "./types";

export type RenderCanvasStateParams = Pick<
  ViewerStoreState,
  | "dataset"
  | "collection"
  | "datasetKey"
  | "pendingFrame"
  | "featureKey"
  | "track"
  | "showTrackPath"
  | "showTrackPathBreaks"
  | "colorRamp"
  | "colorRampRange"
  | "categoricalPaletteRamp"
  | "outlineColor"
  | "edgeColor"
  | "edgeColorAlpha"
  | "edgeMode"
  | "trackPathColor"
  | "trackPathWidthPx"
  | "trackPathColorMode"
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
  pendingFrame: state.pendingFrame,
  track: state.track,
  showTrackPath: state.showTrackPath,
  showTrackPathBreaks: state.showTrackPathBreaks,
  colorRamp: state.colorRamp,
  colorRampRange: state.colorRampRange,
  categoricalPaletteRamp: state.categoricalPaletteRamp,
  outlineColor: state.outlineColor,
  edgeColor: state.edgeColor,
  edgeMode: state.edgeMode,
  edgeColorAlpha: state.edgeColorAlpha,
  trackPathColor: state.trackPathColor,
  trackPathWidthPx: state.trackPathWidthPx,
  trackPathColorMode: state.trackPathColorMode,
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
  /**
   * Returns a DOM element that can be used to mount the canvas.
   */
  get domElement(): HTMLElement;

  get canvas(): HTMLCanvasElement;

  /** (X,Y) resolution of the canvas, in pixels. */
  get resolution(): Vector2;

  /** Gets information about canvas scaling. Switches types for 2D and 3D
   * canvases.
   */
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

  render(synchronous?: boolean): void;

  /**
   * Disposes of the canvas and its resources.
   */
  dispose(): void;

  /**
   * Gets the ID of the segmentation at a pixel coordinate in the canvas, where
   * `(0,0)` is the top left corner.
   *
   * @returns
   * - If there is a segmentation present, returns an object containing the
   *   segmentation ID and the global ID (if one exists).
   * - If there is no segmentation present, returns `null`.
   */
  getIdAtPixel(x: number, y: number): PixelIdInfo | null;
}

export interface IInnerRenderCanvas extends IRenderCanvas {
  /**
   * Sets a callback function that will be called whenever the canvas is
   * rendered.
   */
  setOnRenderCallback(callback: null | (() => void)): void;

  /**
   * Returns a Matrix4 that projects from a 3D coordinate (in frame
   * pixels/volume voxels) to a 2D canvas pixel coordinate, where
   * (X=0, Y=0) is the top left corner of the canvas, and a depth value.
   *
   * The Z coordinate is used to store the depth in a [0, 1] range, where 0 is
   * the closest to the camera and 1 is the farthest from the camera.
   */
  getScreenSpaceMatrix(): Matrix4;

  /**
   * Returns a function that converts a depth value for some object to the
   * opacity (when covered) and scale of an annotation marker that should be
   * rendered over it.
   * @param screenSpaceMatrix The screen space matrix that projects from 3D coordinates to
   */
  getDepthToScaleFn(screenSpaceMatrix: Matrix4): (depth: number) => { scale: number; clipOpacity: number };
}
