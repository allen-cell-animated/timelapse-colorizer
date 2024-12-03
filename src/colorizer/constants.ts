import { Color } from "three";

import {
  DrawMode,
  PlotRangeType,
  ScatterPlotConfig,
  TabType,
  VectorConfig,
  VectorTooltipMode,
  ViewerConfig,
} from "./types";

export const BACKGROUND_COLOR_DEFAULT = 0xffffff;
export const OUTLINE_COLOR_DEFAULT = 0xff00ff;
export const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;
export const OUT_OF_RANGE_COLOR_DEFAULT = 0xdddddd;

export const VECTOR_KEY_MOTION_DELTA = "_motion_";

export const getDefaultVectorConfig = (): VectorConfig => ({
  visible: false,
  key: VECTOR_KEY_MOTION_DELTA,
  timeIntervals: 5,
  color: new Color(0x000000),
  scaleFactor: 4,
  tooltipMode: VectorTooltipMode.MAGNITUDE,
});

export const getDefaultViewerConfig = (): ViewerConfig => ({
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  keepRangeBetweenDatasets: false,
  /** Brightness, as an integer percentage. */
  backdropBrightness: 100,
  /** Saturation, as an integer percentage. */
  backdropSaturation: 100,
  /** Opacity, as an integer percentage. */
  objectOpacity: 100,
  outOfRangeDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUT_OF_RANGE_COLOR_DEFAULT) },
  outlierDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUTLIER_COLOR_DEFAULT) },
  outlineColor: new Color(OUTLINE_COLOR_DEFAULT),
  openTab: TabType.TRACK_PLOT,
  vectorConfig: getDefaultVectorConfig(),
}); // Use a function instead of a constant to avoid sharing the same object reference.

export const getDefaultScatterPlotConfig = (): ScatterPlotConfig => ({
  xAxis: null,
  yAxis: null,
  rangeType: PlotRangeType.ALL_TIME,
});
