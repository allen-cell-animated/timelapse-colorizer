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
import { SerializedStoreData } from "../types";

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
  const ret: SerializedStoreData = {};
  ret[UrlParam.SHOW_PATH] = encodeMaybeBoolean(slice.showTrackPath);
  ret[UrlParam.SHOW_SCALEBAR] = encodeMaybeBoolean(slice.showScaleBar);
  ret[UrlParam.SHOW_TIMESTAMP] = encodeMaybeBoolean(slice.showTimestamp);
  // Export settings are currently not serialized.
  ret[UrlParam.FILTERED_COLOR] = encodeMaybeColor(slice.outOfRangeDrawSettings?.color);
  ret[UrlParam.FILTERED_MODE] = slice.outOfRangeDrawSettings?.mode.toString();
  ret[UrlParam.OUTLIER_COLOR] = encodeMaybeColor(slice.outlierDrawSettings?.color);
  ret[UrlParam.OUTLIER_MODE] = slice.outlierDrawSettings?.mode.toString();
  ret[UrlParam.OUTLINE_COLOR] = encodeMaybeColor(slice.outlineColor);

  ret[UrlParam.OPEN_TAB] = slice.openTab;
  return ret;
};

/** Selects state values that serialization depends on. */
export const configSliceSerializationDependencies = (slice: ConfigSlice): ConfigSliceSerializableState => ({
  showTrackPath: slice.showTrackPath,
  showScaleBar: slice.showScaleBar,
  showTimestamp: slice.showTimestamp,
  outOfRangeDrawSettings: slice.outOfRangeDrawSettings,
  outlierDrawSettings: slice.outlierDrawSettings,
  outlineColor: slice.outlineColor,
  openTab: slice.openTab,
});

export const loadConfigSliceFromParams = (slice: ConfigSlice, params: URLSearchParams): void => {
  const showPathParam = decodeBoolean(params.get(UrlParam.SHOW_PATH));
  if (showPathParam !== undefined) {
    slice.setShowTrackPath(showPathParam);
  }
  const showScaleBarParam = decodeBoolean(params.get(UrlParam.SHOW_SCALEBAR));
  if (showScaleBarParam !== undefined) {
    slice.setShowScaleBar(showScaleBarParam);
  }
  const showTimestampParam = decodeBoolean(params.get(UrlParam.SHOW_TIMESTAMP));
  if (showTimestampParam !== undefined) {
    slice.setShowTimestamp(showTimestampParam);
  }

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
