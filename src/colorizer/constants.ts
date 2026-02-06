import { Color } from "three";

import { PlotRangeType, type ScatterPlotConfig, type VectorConfig, VectorTooltipMode } from "./types";

export const DEFAULT_PLAYBACK_FPS = 10;
export const MAX_FEATURE_CATEGORIES = 12;

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
  color: new Color(0x575757),
  scaleFactor: 4,
  tooltipMode: VectorTooltipMode.MAGNITUDE,
  scaleThicknessByMagnitude: false,
  thickness: 1,
});

export const getDefaultScatterPlotConfig = (): ScatterPlotConfig => ({
  xAxis: null,
  yAxis: null,
  rangeType: PlotRangeType.ALL_TIME,
});

/**
 * Default name for a collection descriptor JSON, which provides relative
 * filepaths to one or more datasets.
 */
export const DEFAULT_COLLECTION_FILENAME = "collection.json";

/**
 * Default name for the manifest JSON, which provides relative filepaths
 * to the elements (frames, feature data, centroids, etc.) of this dataset.
 */
export const DEFAULT_DATASET_FILENAME = "manifest.json";

export const CSV_COL_ID = "ID";
// Column constants for segmentation ID, time, and track are used to validate
// data when parsing CSV files and check for mismatches with the current
// dataset.
export const CSV_COL_SEG_ID = "Label";
export const CSV_COL_TIME = "Frame";
export const CSV_COL_TIME_WITH_UNITS = "Time (frames)";
export const CSV_COL_TRACK = "Track";
export const CSV_COL_FILTERED = "Filtered";
export const CSV_COL_OUTLIER = "Outlier";
