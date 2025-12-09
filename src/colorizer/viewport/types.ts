import type { Color, Vector2 } from "three";

import type Collection from "src/colorizer/Collection";
import type ColorRamp from "src/colorizer/ColorRamp";
import type Dataset from "src/colorizer/Dataset";
import type Track from "src/colorizer/Track";
import type { ChannelSetting, DrawMode, DrawSettings, TrackPathColorMode } from "src/colorizer/types";

export const enum CanvasType {
  CANVAS_2D = "2D",
  CANVAS_3D = "3D",
}

export type Canvas2DScaleInfo = {
  type: CanvasType.CANVAS_2D;
  /**
   * Size of the frame in [0, 1] canvas coordinates, accounting for zoom.
   */
  frameSizeInCanvasCoordinates: Vector2;
  /**
   * Transforms from [0,1] space of the canvas to the [0,1] space of the frame,
   * account for zoom.
   *
   * e.g. If frame has the same aspect ratio as the canvas and zoom is set to
   * 2x, then, assuming that the [0, 0] position of the frame and the canvas are
   * in the same position, the position [1, 1] on the canvas should map to [0.5,
   * 0.5] on the frame.
   */
  canvasToFrameCoordinates: Vector2;
  /**
   * Inverse of `canvasToFrameCoordinates`. Transforms from [0,1] space of the
   * frame to the [0,1] space of the canvas, accounting for zoom.
   */
  frameToCanvasCoordinates: Vector2;

  /**
   * Offset of the image within the canvas in normalized frame coordinates
   * ([-0.5, 0.5] range). [0, 0] means the image is centered within the canvas
   * and [-0.5, -0.5] means the top right corner of the frame will be centered
   * in the canvas view.
   */
  panOffset: Vector2;
};

export type Canvas3DScaleInfo = {
  type: CanvasType.CANVAS_3D;
};

export type CanvasScaleInfo = Canvas3DScaleInfo | Canvas2DScaleInfo;

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
