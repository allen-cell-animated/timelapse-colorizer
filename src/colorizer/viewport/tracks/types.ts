import type { Color } from "three";

import type ColorRamp from "src/colorizer/ColorRamp";
import type Dataset from "src/colorizer/Dataset";
import type Track from "src/colorizer/Track";
import type { DrawSettings, TrackOutlineColorMode, TrackPathColorMode } from "src/colorizer/types";

/** Subset of RenderCanvasParams */
export type TrackPathParams = {
  dataset: Dataset | null;
  track: Track | null;
  featureKey: string | null;
  colorRamp: ColorRamp;
  colorRampRange: [number, number];
  categoricalPaletteRamp: ColorRamp;
  outlierDrawSettings: DrawSettings;
  outlineColor: Color;
  outlineColorMode: TrackOutlineColorMode;
  outOfRangeDrawSettings: DrawSettings;
  inRangeLUT: Uint8Array;
  // Track-specific settings
  showTrackPath: boolean;
  showTrackPathBreaks: boolean;
  trackPathColor: Color;
  trackPathColorRamp: ColorRamp;
  trackPathWidthPx: number;
  trackPathColorMode: TrackPathColorMode;
  trackPathPastSteps: number;
  trackPathFutureSteps: number;
  showAllTrackPathPastSteps: boolean;
  showAllTrackPathFutureSteps: boolean;
  persistTrackPathWhenOutOfRange: boolean;
};
