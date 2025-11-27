import type { Color, Vector2 } from "three";

import type { ColorRamp, Dataset, Track } from "src/colorizer";
import type Collection from "src/colorizer/Collection";
import type {
  CanvasScaleInfo,
  ChannelSetting,
  DrawMode,
  DrawSettings,
  FrameLoadResult,
  PixelIdInfo,
  TrackPathColorMode,
} from "src/colorizer/types";

// Standalone type for render canvas state params
export type RenderCanvasStateParams = {
  dataset: Dataset | null;
  collection: Collection | null;
  datasetKey: string | null;
  pendingFrame: number;
  featureKey: string | null;
  track: Track | null;
  showTrackPath: boolean;
  showTrackPathBreaks: boolean;
  colorRamp: ColorRamp;
  colorRampRange: [number, number];
  categoricalPaletteRamp: ColorRamp;
  outlineColor: Color;
  edgeColor: Color;
  edgeColorAlpha: number;
  edgeMode: DrawMode;
  trackPathColor: Color;
  trackPathWidthPx: number;
  trackPathColorMode: TrackPathColorMode;
  outlierDrawSettings: DrawSettings;
  outOfRangeDrawSettings: DrawSettings;
  inRangeLUT: Uint8Array;
  vectorMotionDeltas: Float32Array | null;
  vectorVisible: boolean;
  vectorColor: Color;
  vectorScaleFactor: number;
  vectorScaleThicknessByMagnitude: boolean;
  vectorThickness: number;
  backdropKey: string | null;
  backdropVisible: boolean;
  channelSettings: ChannelSetting[];
  objectOpacity: number;
  backdropSaturation: number;
  backdropBrightness: number;
  interpolate3d: boolean;
};

export type RenderOptions = {
  /** If true, renders synchronously. */
  synchronous?: boolean;
};

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

  render(options?: RenderOptions): void;

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

  //// Handlers for user interaction /////

  /**
   * Handler called during mouse drag events.
   * @param dx Change in mouse X position in pixels.
   * @param dy Change in mouse Y position in pixels.
   * @return `true` if the canvas re-rendered in response to the event.
   */
  handleDragEvent(dx: number, dy: number): boolean;

  /**
   * Handles a mouse wheel scroll event.
   * @param mouseOffsetX Mouse X position in pixels relative to the canvas.
   * @param mouseOffsetY Mouse Y position in pixels relative to the canvas.
   * @param scrollDelta `event.deltaY` value from the scroll event. Larger
   * values (>= 25) may indicate track pad interactions.
   * @return `true` if the canvas re-rendered in response to the event.
   */
  handleScrollEvent(mouseOffsetX: number, mouseOffsetY: number, scrollDelta: number): boolean;

  /**
   * Handler called when the user clicks a zoom-in button or other action.
   * @returns `true` if the canvas re-rendered in response to the event.
   */
  handleZoomIn(): boolean;

  /**
   * Handler called when the user clicks a zoom-out button or other action.
   * @returns `true` if the canvas re-rendered in response to the event.
   */
  handleZoomOut(): boolean;

  /** Resets the camera view to the default.
   * @return `true` if the canvas re-rendered in response to the event.
   */
  resetView(): boolean;
}
