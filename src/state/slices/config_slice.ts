import { Color } from "three";
import { clamp } from "three/src/math/MathUtils";
import { StateCreator } from "zustand";

import {
  DrawMode,
  DrawSettings,
  EDGE_COLOR_ALPHA_DEFAULT,
  EDGE_COLOR_DEFAULT,
  isTabType,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
  TabType,
  TrackPathColorMode,
} from "@/colorizer";
import {
  decodeBoolean,
  decodeFloat,
  decodeHexAlphaColor,
  decodeHexColor,
  encodeMaybeBoolean,
  encodeMaybeColor,
  encodeMaybeColorWithAlpha,
  encodeMaybeNumber,
  parseDrawMode,
  parseDrawSettings,
  parseTrackPathMode,
  UrlParam,
} from "@/colorizer/utils/url_utils";
import type { SerializedStoreData } from "@/state/types";
import { setValueIfDefined } from "@/state/utils/data_validation";

export const OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};

export const OUTLIER_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUTLIER_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};

export type ConfigSliceState = {
  showTrackPath: boolean;
  trackPathColor: Color;
  trackPathColorMode: TrackPathColorMode;
  trackPathWidthPx: number;
  showTrackPathBreaks: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  showLegendDuringExport: boolean;
  showHeaderDuringExport: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  outlineColor: Color;
  edgeColor: Color;
  edgeColorAlpha: number;
  edgeMode: DrawMode;
  openTab: TabType;
};

export type ConfigSliceSerializableState = Pick<
  ConfigSliceState,
  | "showTrackPath"
  | "trackPathColor"
  | "trackPathColorMode"
  | "trackPathWidthPx"
  | "showTrackPathBreaks"
  | "showScaleBar"
  | "showTimestamp"
  | "outOfRangeDrawSettings"
  | "outlierDrawSettings"
  | "outlineColor"
  | "edgeColor"
  | "edgeColorAlpha"
  | "edgeMode"
  | "openTab"
>;

export type ConfigSliceActions = {
  setShowTrackPath: (showTrackPath: boolean) => void;
  setTrackPathColor: (trackPathColor: Color) => void;
  setTrackPathWidthPx: (trackPathWidthPx: number) => void;
  setTrackPathColorMode: (trackPathColorMode: TrackPathColorMode) => void;
  setShowTrackPathBreaks: (showTrackPathDiscontinuities: boolean) => void;
  setShowScaleBar: (showScaleBar: boolean) => void;
  setShowTimestamp: (showTimestamp: boolean) => void;
  setShowLegendDuringExport: (showLegendDuringExport: boolean) => void;
  setShowHeaderDuringExport: (showHeaderDuringExport: boolean) => void;
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (outlierDrawSettings: DrawSettings) => void;
  setOutlineColor: (outlineColor: Color) => void;
  setEdgeColor: (edgeColor: Color, alpha: number) => void;
  setEdgeMode: (edgeMode: DrawMode) => void;
  setOpenTab: (openTab: TabType) => void;
};

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  // State
  showTrackPath: true,
  trackPathColor: new Color(OUTLINE_COLOR_DEFAULT),
  trackPathWidthPx: 1.5,
  trackPathColorMode: TrackPathColorMode.USE_OUTLINE_COLOR,
  showTrackPathBreaks: false,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  outOfRangeDrawSettings: OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT,
  outlierDrawSettings: OUTLIER_DRAW_SETTINGS_DEFAULT,
  outlineColor: new Color(OUTLINE_COLOR_DEFAULT),
  edgeColor: new Color(EDGE_COLOR_DEFAULT),
  edgeColorAlpha: EDGE_COLOR_ALPHA_DEFAULT,
  edgeMode: DrawMode.USE_COLOR,
  openTab: TabType.TRACK_PLOT,

  // Actions
  setShowTrackPath: (showTrackPath) => set({ showTrackPath }),
  setTrackPathColor: (trackPathColor) => set({ trackPathColor }),
  setTrackPathWidthPx: (trackPathWidthPx) => set({ trackPathWidthPx: clamp(trackPathWidthPx, 0, 100) }),
  setTrackPathColorMode: (trackPathColorMode) => set({ trackPathColorMode }),
  setShowTrackPathBreaks: (showTrackPathDiscontinuities) => set({ showTrackPathBreaks: showTrackPathDiscontinuities }),
  setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
  setShowTimestamp: (showTimestamp) => set({ showTimestamp }),
  setShowLegendDuringExport: (showLegendDuringExport) => set({ showLegendDuringExport }),
  setShowHeaderDuringExport: (showHeaderDuringExport) => set({ showHeaderDuringExport }),
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings) => set({ outOfRangeDrawSettings }),
  setOutlierDrawSettings: (outlierDrawSettings) => set({ outlierDrawSettings }),
  setOutlineColor: (outlineColor) => set({ outlineColor }),
  setEdgeColor: (edgeColor, alpha) => set({ edgeColor, edgeColorAlpha: clamp(alpha, 0, 1) }),
  setEdgeMode: (edgeMode) => set({ edgeMode }),
  setOpenTab: (openTab) => set({ openTab }),
});

export const serializeConfigSlice = (slice: Partial<ConfigSliceSerializableState>): SerializedStoreData => {
  return {
    [UrlParam.SHOW_PATH]: encodeMaybeBoolean(slice.showTrackPath),
    [UrlParam.PATH_COLOR]: encodeMaybeColor(slice.trackPathColor),
    [UrlParam.PATH_WIDTH]: encodeMaybeNumber(slice.trackPathWidthPx),
    [UrlParam.PATH_COLOR_MODE]: slice.trackPathColorMode?.toString(),
    [UrlParam.SHOW_PATH_BREAKS]: encodeMaybeBoolean(slice.showTrackPathBreaks),
    [UrlParam.SHOW_SCALEBAR]: encodeMaybeBoolean(slice.showScaleBar),
    [UrlParam.SHOW_TIMESTAMP]: encodeMaybeBoolean(slice.showTimestamp),
    // Export settings are currently not serialized.
    [UrlParam.FILTERED_COLOR]: encodeMaybeColor(slice.outOfRangeDrawSettings?.color),
    [UrlParam.FILTERED_MODE]: slice.outOfRangeDrawSettings?.mode.toString(),
    [UrlParam.OUTLIER_COLOR]: encodeMaybeColor(slice.outlierDrawSettings?.color),
    [UrlParam.OUTLIER_MODE]: slice.outlierDrawSettings?.mode.toString(),
    [UrlParam.OUTLINE_COLOR]: encodeMaybeColor(slice.outlineColor),
    [UrlParam.EDGE_MODE]: slice.edgeMode?.toString(),
    [UrlParam.EDGE_COLOR]: encodeMaybeColorWithAlpha(slice.edgeColor, slice.edgeColorAlpha),
    [UrlParam.OPEN_TAB]: slice.openTab,
  };
};

/** Selects state values that serialization depends on. */
export const selectConfigSliceSerializationDeps = (slice: ConfigSlice): ConfigSliceSerializableState => ({
  showTrackPath: slice.showTrackPath,
  trackPathColor: slice.trackPathColor,
  trackPathWidthPx: slice.trackPathWidthPx,
  trackPathColorMode: slice.trackPathColorMode,
  showTrackPathBreaks: slice.showTrackPathBreaks,
  showScaleBar: slice.showScaleBar,
  showTimestamp: slice.showTimestamp,
  outOfRangeDrawSettings: slice.outOfRangeDrawSettings,
  outlierDrawSettings: slice.outlierDrawSettings,
  outlineColor: slice.outlineColor,
  edgeMode: slice.edgeMode,
  edgeColor: slice.edgeColor,
  edgeColorAlpha: slice.edgeColorAlpha,
  openTab: slice.openTab,
});

export const loadConfigSliceFromParams = (slice: ConfigSlice, params: URLSearchParams): void => {
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_PATH)), slice.setShowTrackPath);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_SCALEBAR)), slice.setShowScaleBar);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_TIMESTAMP)), slice.setShowTimestamp);
  setValueIfDefined(decodeFloat(params.get(UrlParam.PATH_WIDTH)), slice.setTrackPathWidthPx);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_PATH_BREAKS)), slice.setShowTrackPathBreaks);

  slice.setOutOfRangeDrawSettings(
    parseDrawSettings(
      params.get(UrlParam.FILTERED_COLOR),
      params.get(UrlParam.FILTERED_MODE),
      OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT
    )
  );
  slice.setOutlierDrawSettings(
    parseDrawSettings(
      params.get(UrlParam.OUTLIER_COLOR),
      params.get(UrlParam.OUTLIER_MODE),
      OUTLIER_DRAW_SETTINGS_DEFAULT
    )
  );
  const outlineColorParam = decodeHexColor(params.get(UrlParam.OUTLINE_COLOR));
  if (outlineColorParam) {
    slice.setOutlineColor(new Color(outlineColorParam));
  }
  const trackPathColorParam = decodeHexColor(params.get(UrlParam.PATH_COLOR));
  if (trackPathColorParam) {
    slice.setTrackPathColor(new Color(trackPathColorParam));
  }
  const trackPathColorModeParam = parseTrackPathMode(params.get(UrlParam.PATH_COLOR_MODE));
  if (trackPathColorModeParam !== undefined) {
    slice.setTrackPathColorMode(trackPathColorModeParam);
  }
  const edgeColorParam = decodeHexAlphaColor(params.get(UrlParam.EDGE_COLOR));
  if (edgeColorParam) {
    slice.setEdgeColor(edgeColorParam.color, clamp(edgeColorParam.alpha, 0, 1));
  }
  const edgeModeParam = parseDrawMode(params.get(UrlParam.EDGE_MODE));
  if (edgeModeParam !== undefined) {
    slice.setEdgeMode(edgeModeParam);
  }

  const openTabParam = params.get(UrlParam.OPEN_TAB);
  if (openTabParam && isTabType(openTabParam)) {
    slice.setOpenTab(openTabParam as TabType);
  }
};
