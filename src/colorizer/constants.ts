import { Color } from "three";

import { PlotRangeType, ScatterPlotConfig, VectorConfig, VectorTooltipMode } from "./types";

export const FRAME_BACKGROUND_COLOR_DEFAULT = "#ffffff";
export const CANVAS_BACKGROUND_COLOR_DEFAULT = "#f7f7f7";
export const OUTLINE_COLOR_DEFAULT = "#ff00ff";
export const OUTLIER_COLOR_DEFAULT = "#c0c0c0";
export const OUT_OF_RANGE_COLOR_DEFAULT = "#dddddd";
export const EDGE_COLOR_DEFAULT = "#000000";
export const EDGE_COLOR_ALPHA_DEFAULT = 64 / 255; // ~25%

export const VECTOR_KEY_MOTION_DELTA = "_motion_";

export const INITIAL_TRACK_PATH_BUFFER_SIZE = 6; // Must be divisible by 6

export const getDefaultVectorConfig = (): VectorConfig => ({
  visible: false,
  key: VECTOR_KEY_MOTION_DELTA,
  timeIntervals: 5,
  color: new Color(0x000000),
  scaleFactor: 4,
  tooltipMode: VectorTooltipMode.MAGNITUDE,
});

export const getDefaultScatterPlotConfig = (): ScatterPlotConfig => ({
  xAxis: null,
  yAxis: null,
  rangeType: PlotRangeType.ALL_TIME,
});
