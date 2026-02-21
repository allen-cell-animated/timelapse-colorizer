import { Color } from "three";
import { clamp } from "three/src/math/MathUtils";
import type { StateCreator } from "zustand";

import {
  type ColorRamp,
  DEFAULT_DIVERGING_COLOR_RAMP_KEY,
  DrawMode,
  type DrawSettings,
  EDGE_COLOR_ALPHA_DEFAULT,
  EDGE_COLOR_DEFAULT,
  isTabType,
  KNOWN_COLOR_RAMPS,
  OUT_OF_RANGE_COLOR_DEFAULT,
  OUTLIER_COLOR_DEFAULT,
  OUTLINE_COLOR_DEFAULT,
  SelectionOutlineColorMode,
  TabType,
  TrackPathColorMode,
} from "src/colorizer";
import { getColorMap } from "src/colorizer/utils/data_utils";
import {
  decodeBoolean,
  decodeFloat,
  decodeHexAlphaColor,
  decodeHexColor,
  deserializeTrackPathSteps,
  encodeMaybeBoolean,
  encodeMaybeColor,
  encodeMaybeColorWithAlpha,
  encodeMaybeNumber,
  parseDrawMode,
  parseDrawSettings,
  parseTrackOutlineColorMode,
  parseTrackPathMode,
  serializeTrackPathSteps,
  URL_COLOR_RAMP_REVERSED_SUFFIX,
  UrlParam,
} from "src/colorizer/utils/url_utils";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { setValueIfDefined } from "src/state/utils/data_validation";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

const OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUT_OF_RANGE_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};

const OUTLIER_DRAW_SETTINGS_DEFAULT: DrawSettings = {
  color: new Color(OUTLIER_COLOR_DEFAULT),
  mode: DrawMode.USE_COLOR,
};

export type ConfigSliceState = {
  // Track settings
  showTrackPath: boolean;
  trackPathColor: Color;
  trackPathColorRampKey: string;
  /** Derived from the track path color ramp key and reversed state. */
  trackPathColorRamp: ColorRamp;
  trackPathIsColorRampReversed: boolean;
  trackPathColorMode: TrackPathColorMode;
  trackPathWidthPx: number;
  showTrackPathBreaks: boolean;
  trackPathFutureSteps: number;
  trackPathPastSteps: number;
  showAllTrackPathFutureSteps: boolean;
  showAllTrackPathPastSteps: boolean;

  /**
   * Whether track paths should be shown when all past/future steps are enabled,
   * but the current timestamp is outside the range of the track.
   */
  persistTrackPathWhenOutOfRange: boolean;

  // Viewport settings
  showScaleBar: boolean;
  showTimestamp: boolean;
  /** Whether to interpolate 3D data. True by default. */
  interpolate3d: boolean;

  // Export settings
  showLegendDuringExport: boolean;
  showHeaderDuringExport: boolean;

  // Object settings
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  outlineColor: Color;
  outlineColorMode: SelectionOutlineColorMode;
  edgeColor: Color;
  edgeColorAlpha: number;
  edgeMode: DrawMode;

  // UI state
  openTab: TabType;
};

export type ConfigSliceSerializableState = Pick<
  ConfigSliceState,
  | "showTrackPath"
  | "trackPathColor"
  | "trackPathColorMode"
  | "trackPathColorRampKey"
  | "trackPathIsColorRampReversed"
  | "trackPathWidthPx"
  | "showTrackPathBreaks"
  | "trackPathFutureSteps"
  | "showAllTrackPathFutureSteps"
  | "showAllTrackPathPastSteps"
  | "trackPathPastSteps"
  | "persistTrackPathWhenOutOfRange"
  | "showScaleBar"
  | "showTimestamp"
  | "outOfRangeDrawSettings"
  | "outlierDrawSettings"
  | "outlineColor"
  | "outlineColorMode"
  | "edgeColor"
  | "edgeColorAlpha"
  | "edgeMode"
  | "openTab"
  | "interpolate3d"
>;

export type ConfigSliceActions = {
  setShowTrackPath: (showTrackPath: boolean) => void;
  setTrackPathColor: (trackPathColor: Color) => void;
  setTrackPathWidthPx: (trackPathWidthPx: number) => void;
  setTrackPathColorRampKey: (trackPathColorRampKey: string) => void;
  setTrackPathIsColorRampReversed: (trackPathIsColorRampReversed: boolean) => void;
  setTrackPathColorMode: (trackPathColorMode: TrackPathColorMode) => void;
  setShowTrackPathBreaks: (showTrackPathDiscontinuities: boolean) => void;
  setTrackPathFutureSteps: (trackPathFutureSteps: number) => void;
  setTrackPathPastSteps: (trackPathPastSteps: number) => void;
  setShowAllTrackPathFutureSteps: (showAllTrackPathFutureSteps: boolean) => void;
  setShowAllTrackPathPastSteps: (showAllTrackPathPastSteps: boolean) => void;
  setPersistTrackPathWhenOutOfRange: (persistTrackPathWhenOutOfRange: boolean) => void;
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
  setInterpolate3d: (interpolate3d: boolean) => void;
  setOutlineColorMode: (outlineColorMode: SelectionOutlineColorMode) => void;
};

export const addConfigDerivedStateSubscribers = (store: SubscribableStore<ConfigSlice>): void => {
  addDerivedStateSubscriber(
    store,
    (state) => [state.trackPathColorRampKey, state.trackPathIsColorRampReversed],
    ([key, reversed]) => {
      store.getState().trackPathColorRamp.dispose();
      return { trackPathColorRamp: getColorMap(KNOWN_COLOR_RAMPS, key, { reversed, mirrored: true }) };
    }
  );
};

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  // State
  showTrackPath: true,
  trackPathColor: new Color(OUTLINE_COLOR_DEFAULT),
  trackPathWidthPx: 1.5,
  trackPathColorRampKey: DEFAULT_DIVERGING_COLOR_RAMP_KEY,
  trackPathColorRamp: getColorMap(KNOWN_COLOR_RAMPS, DEFAULT_DIVERGING_COLOR_RAMP_KEY, { mirrored: true }),
  trackPathIsColorRampReversed: false,
  trackPathColorMode: TrackPathColorMode.USE_OUTLINE_COLOR,
  showTrackPathBreaks: false,
  trackPathFutureSteps: 0,
  trackPathPastSteps: 25,
  showAllTrackPathFutureSteps: false,
  showAllTrackPathPastSteps: true,
  persistTrackPathWhenOutOfRange: false,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  outOfRangeDrawSettings: OUT_OF_RANGE_DRAW_SETTINGS_DEFAULT,
  outlierDrawSettings: OUTLIER_DRAW_SETTINGS_DEFAULT,
  outlineColor: new Color(OUTLINE_COLOR_DEFAULT),
  outlineColorMode: SelectionOutlineColorMode.USE_AUTO_COLOR,
  edgeColor: new Color(EDGE_COLOR_DEFAULT),
  edgeColorAlpha: EDGE_COLOR_ALPHA_DEFAULT,
  edgeMode: DrawMode.USE_COLOR,

  // 3D mode
  interpolate3d: true,

  // UI state
  openTab: TabType.TRACK_PLOT,

  // Actions
  setShowTrackPath: (showTrackPath) => set({ showTrackPath }),
  setTrackPathColor: (trackPathColor) => set({ trackPathColor }),
  setTrackPathWidthPx: (trackPathWidthPx) => set({ trackPathWidthPx: clamp(trackPathWidthPx, 0, 100) }),
  setTrackPathColorRampKey: (key) =>
    set((state) => {
      if (!KNOWN_COLOR_RAMPS.has(key)) {
        throw new Error(`Unknown color ramp key: ${key}`);
      } else if (key === state.trackPathColorRampKey) {
        return {};
      }
      return {
        trackPathColorRampKey: key,
        trackPathIsColorRampReversed: false,
      };
    }),
  setTrackPathIsColorRampReversed: (trackPathIsColorRampReversed) => set({ trackPathIsColorRampReversed }),
  setTrackPathColorMode: (trackPathColorMode) => set({ trackPathColorMode }),
  setShowTrackPathBreaks: (showTrackPathDiscontinuities) => set({ showTrackPathBreaks: showTrackPathDiscontinuities }),
  setTrackPathFutureSteps: (trackPathFutureSteps) =>
    set({ trackPathFutureSteps: Math.max(0, Math.round(trackPathFutureSteps)) }),
  setTrackPathPastSteps: (trackPathPastSteps) =>
    set({ trackPathPastSteps: Math.max(0, Math.round(trackPathPastSteps)) }),
  setShowAllTrackPathFutureSteps: (showAllTrackPathFutureSteps) => set({ showAllTrackPathFutureSteps }),
  setShowAllTrackPathPastSteps: (showAllTrackPathPastSteps) => set({ showAllTrackPathPastSteps }),
  setPersistTrackPathWhenOutOfRange: (persistTrackPathWhenOutOfRange) => set({ persistTrackPathWhenOutOfRange }),

  setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
  setShowTimestamp: (showTimestamp) => set({ showTimestamp }),
  setShowLegendDuringExport: (showLegendDuringExport) => set({ showLegendDuringExport }),
  setShowHeaderDuringExport: (showHeaderDuringExport) => set({ showHeaderDuringExport }),
  setOutOfRangeDrawSettings: (outOfRangeDrawSettings) => set({ outOfRangeDrawSettings }),
  setOutlierDrawSettings: (outlierDrawSettings) => set({ outlierDrawSettings }),
  setOutlineColor: (outlineColor) => set({ outlineColor }),
  setOutlineColorMode: (outlineColorMode) => set({ outlineColorMode }),
  setEdgeColor: (edgeColor, alpha) => set({ edgeColor, edgeColorAlpha: clamp(alpha, 0, 1) }),
  setEdgeMode: (edgeMode) => set({ edgeMode }),
  setOpenTab: (openTab) => set({ openTab }),
  setInterpolate3d: (interpolate3d) => set({ interpolate3d }),
});

export const serializeConfigSlice = (slice: Partial<ConfigSliceSerializableState>): SerializedStoreData => {
  return {
    [UrlParam.SHOW_PATH]: encodeMaybeBoolean(slice.showTrackPath),
    [UrlParam.PATH_COLOR]: encodeMaybeColor(slice.trackPathColor),
    [UrlParam.PATH_WIDTH]: encodeMaybeNumber(slice.trackPathWidthPx),
    [UrlParam.PATH_COLOR_RAMP]: slice.trackPathColorRampKey
      ? slice.trackPathColorRampKey + (slice.trackPathIsColorRampReversed ? URL_COLOR_RAMP_REVERSED_SUFFIX : "")
      : undefined,
    [UrlParam.PATH_COLOR_MODE]: slice.trackPathColorMode?.toString(),
    [UrlParam.SHOW_PATH_BREAKS]: encodeMaybeBoolean(slice.showTrackPathBreaks),
    [UrlParam.PATH_STEPS]: serializeTrackPathSteps(
      slice.trackPathPastSteps,
      slice.trackPathFutureSteps,
      slice.showAllTrackPathPastSteps,
      slice.showAllTrackPathFutureSteps
    ),
    [UrlParam.PATH_PERSIST_OUT_OF_RANGE]: encodeMaybeBoolean(slice.persistTrackPathWhenOutOfRange),
    [UrlParam.SHOW_SCALEBAR]: encodeMaybeBoolean(slice.showScaleBar),
    [UrlParam.SHOW_TIMESTAMP]: encodeMaybeBoolean(slice.showTimestamp),
    // Export settings are currently not serialized.
    [UrlParam.FILTERED_COLOR]: encodeMaybeColor(slice.outOfRangeDrawSettings?.color),
    [UrlParam.FILTERED_MODE]: slice.outOfRangeDrawSettings?.mode.toString(),
    [UrlParam.OUTLIER_COLOR]: encodeMaybeColor(slice.outlierDrawSettings?.color),
    [UrlParam.OUTLIER_MODE]: slice.outlierDrawSettings?.mode.toString(),
    [UrlParam.OUTLINE_COLOR]: encodeMaybeColor(slice.outlineColor),
    [UrlParam.OUTLINE_COLOR_MODE]: slice.outlineColorMode?.toString(),
    [UrlParam.EDGE_MODE]: slice.edgeMode?.toString(),
    [UrlParam.EDGE_COLOR]: encodeMaybeColorWithAlpha(slice.edgeColor, slice.edgeColorAlpha),
    [UrlParam.OPEN_TAB]: slice.openTab,
    [UrlParam.INTERPOLATE_3D]: encodeMaybeBoolean(slice.interpolate3d),
  };
};

/** Selects state values that serialization depends on. */
export const selectConfigSliceSerializationDeps = (slice: ConfigSlice): ConfigSliceSerializableState => ({
  showTrackPath: slice.showTrackPath,
  trackPathColor: slice.trackPathColor,
  trackPathWidthPx: slice.trackPathWidthPx,
  trackPathColorRampKey: slice.trackPathColorRampKey,
  trackPathIsColorRampReversed: slice.trackPathIsColorRampReversed,
  trackPathColorMode: slice.trackPathColorMode,
  showTrackPathBreaks: slice.showTrackPathBreaks,
  showScaleBar: slice.showScaleBar,
  showTimestamp: slice.showTimestamp,
  trackPathFutureSteps: slice.trackPathFutureSteps,
  trackPathPastSteps: slice.trackPathPastSteps,
  showAllTrackPathFutureSteps: slice.showAllTrackPathFutureSteps,
  showAllTrackPathPastSteps: slice.showAllTrackPathPastSteps,
  persistTrackPathWhenOutOfRange: slice.persistTrackPathWhenOutOfRange,
  outOfRangeDrawSettings: slice.outOfRangeDrawSettings,
  outlierDrawSettings: slice.outlierDrawSettings,
  outlineColor: slice.outlineColor,
  outlineColorMode: slice.outlineColorMode,
  edgeMode: slice.edgeMode,
  edgeColor: slice.edgeColor,
  edgeColorAlpha: slice.edgeColorAlpha,
  openTab: slice.openTab,
  interpolate3d: slice.interpolate3d,
});

export const loadConfigSliceFromParams = (slice: ConfigSlice, params: URLSearchParams): void => {
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_PATH)), slice.setShowTrackPath);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_SCALEBAR)), slice.setShowScaleBar);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_TIMESTAMP)), slice.setShowTimestamp);
  setValueIfDefined(decodeFloat(params.get(UrlParam.PATH_WIDTH)), slice.setTrackPathWidthPx);
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_PATH_BREAKS)), slice.setShowTrackPathBreaks);
  setValueIfDefined(
    decodeBoolean(params.get(UrlParam.PATH_PERSIST_OUT_OF_RANGE)),
    slice.setPersistTrackPathWhenOutOfRange
  );
  setValueIfDefined(decodeBoolean(params.get(UrlParam.INTERPOLATE_3D)), slice.setInterpolate3d);

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
  const outlineColorModeParam = parseTrackOutlineColorMode(params.get(UrlParam.OUTLINE_COLOR_MODE));
  if (outlineColorModeParam !== undefined) {
    slice.setOutlineColorMode(outlineColorModeParam);
  }
  const trackPathColorParam = decodeHexColor(params.get(UrlParam.PATH_COLOR));
  if (trackPathColorParam) {
    slice.setTrackPathColor(new Color(trackPathColorParam));
  }

  const trackPathColorRampParam = params.get(UrlParam.PATH_COLOR_RAMP);
  if (trackPathColorRampParam) {
    const [key, reversed] = trackPathColorRampParam.split(URL_COLOR_RAMP_REVERSED_SUFFIX);
    if (KNOWN_COLOR_RAMPS.has(key)) {
      slice.setTrackPathColorRampKey(key);
      slice.setTrackPathIsColorRampReversed(reversed !== undefined);
    }
  }

  const trackPathColorModeParam = parseTrackPathMode(params.get(UrlParam.PATH_COLOR_MODE));
  if (trackPathColorModeParam !== undefined) {
    slice.setTrackPathColorMode(trackPathColorModeParam);
  }
  const trackPathStepsParam = deserializeTrackPathSteps(params.get(UrlParam.PATH_STEPS));
  if (trackPathStepsParam) {
    slice.setTrackPathPastSteps(trackPathStepsParam.pastSteps);
    slice.setTrackPathFutureSteps(trackPathStepsParam.futureSteps);
    slice.setShowAllTrackPathPastSteps(trackPathStepsParam.showAllPastSteps);
    slice.setShowAllTrackPathFutureSteps(trackPathStepsParam.showAllFutureSteps);
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
