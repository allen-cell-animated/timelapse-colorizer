import { Color } from "three";
import { StateCreator } from "zustand";

import {
  DrawMode,
  DrawSettings,
  isTabType,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
  TabType,
} from "../../colorizer";
import {
  decodeBoolean,
  decodeHexColor,
  encodeMaybeBoolean,
  encodeMaybeColor,
  parseDrawSettings,
  UrlParam,
} from "../../colorizer/utils/url_utils";
import type { SerializedStoreData } from "../types";
import { setValueIfDefined } from "../utils/data_validation";

const OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};
const OUTLIER_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUTLIER_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};

export type ConfigSliceState = {
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  showLegendDuringExport: boolean;
  showHeaderDuringExport: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  outlineColor: Color;
  openTab: TabType;
};

export type ConfigSliceSerializableState = Pick<
  ConfigSliceState,
  | "showTrackPath"
  | "showScaleBar"
  | "showTimestamp"
  | "outOfRangeDrawSettings"
  | "outlierDrawSettings"
  | "outlineColor"
  | "openTab"
>;

export type ConfigSliceActions = {
  setShowTrackPath: (showTrackPath: boolean) => void;
  setShowScaleBar: (showScaleBar: boolean) => void;
  setShowTimestamp: (showTimestamp: boolean) => void;
  setShowLegendDuringExport: (showLegendDuringExport: boolean) => void;
  setShowHeaderDuringExport: (showHeaderDuringExport: boolean) => void;
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (outlierDrawSettings: DrawSettings) => void;
  setOutlineColor: (outlineColor: Color) => void;
  setOpenTab: (openTab: TabType) => void;
};

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  // State
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  outOfRangeDrawSettings: OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT,
  outlierDrawSettings: OUTLIER_DRAW_SETTINGS_DEFAULT,
  outlineColor: new Color(OUTLINE_COLOR_DEFAULT),
  openTab: TabType.TRACK_PLOT,

  // Actions
  setShowTrackPath: (showTrackPath) => set({ showTrackPath }),
  setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
  setShowTimestamp: (showTimestamp) => set({ showTimestamp }),
  setShowLegendDuringExport: (showLegendDuringExport) => set({ showLegendDuringExport }),
  setShowHeaderDuringExport: (showHeaderDuringExport) => set({ showHeaderDuringExport }),
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings) => set({ outOfRangeDrawSettings }),
  setOutlierDrawSettings: (outlierDrawSettings) => set({ outlierDrawSettings }),
  setOutlineColor: (outlineColor) => set({ outlineColor }),
  setOpenTab: (openTab) => set({ openTab }),
});

export const serializeConfigSlice = (slice: Partial<ConfigSliceSerializableState>): SerializedStoreData => {
  return {
    [UrlParam.SHOW_PATH]: encodeMaybeBoolean(slice.showTrackPath),
    [UrlParam.SHOW_SCALEBAR]: encodeMaybeBoolean(slice.showScaleBar),
    [UrlParam.SHOW_TIMESTAMP]: encodeMaybeBoolean(slice.showTimestamp),
    // Export settings are currently not serialized.
    [UrlParam.FILTERED_COLOR]: encodeMaybeColor(slice.outOfRangeDrawSettings?.color),
    [UrlParam.FILTERED_MODE]: slice.outOfRangeDrawSettings?.mode.toString(),
    [UrlParam.OUTLIER_COLOR]: encodeMaybeColor(slice.outlierDrawSettings?.color),
    [UrlParam.OUTLIER_MODE]: slice.outlierDrawSettings?.mode.toString(),
    [UrlParam.OUTLINE_COLOR]: encodeMaybeColor(slice.outlineColor),
    [UrlParam.OPEN_TAB]: slice.openTab,
  };
};

/** Selects state values that serialization depends on. */
export const selectConfigSliceSerializationDeps = (slice: ConfigSlice): ConfigSliceSerializableState => ({
  showTrackPath: slice.showTrackPath,
  showScaleBar: slice.showScaleBar,
  showTimestamp: slice.showTimestamp,
  outOfRangeDrawSettings: slice.outOfRangeDrawSettings,
  outlierDrawSettings: slice.outlierDrawSettings,
  outlineColor: slice.outlineColor,
  openTab: slice.openTab,
});

export const loadConfigSliceFromParams = (slice: ConfigSlice, params: URLSearchParams): void => {
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_PATH)), slice.setShowTrackPath);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_SCALEBAR)), slice.setShowScaleBar);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_TIMESTAMP)), slice.setShowTimestamp);

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

  const openTabParam = params.get(UrlParam.OPEN_TAB);
  if (openTabParam && isTabType(openTabParam)) {
    slice.setOpenTab(openTabParam as TabType);
  }
};
