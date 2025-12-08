import { RenderCanvasStateParams } from "src/colorizer/viewport/types";

/** Subset of IRenderCanvasParams */
export type TrackPathParams = Pick<
  RenderCanvasStateParams,
  | "dataset"
  | "track"
  | "featureKey"
  | "colorRamp"
  | "colorRampRange"
  | "categoricalPaletteRamp"
  | "inRangeLUT"
  | "outOfRangeDrawSettings"
  | "outlierDrawSettings"
  | "trackPathColorMode"
  | "outlineColor"
  | "trackPathColor"
  | "trackPathWidthPx"
  | "showTrackPath"
  | "showTrackPathBreaks"
>;
