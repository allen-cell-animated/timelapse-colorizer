import type { StateCreator } from "zustand";

import type { ColorRamp, Dataset } from "src/colorizer";
import { type DISPLAY_COLOR_RAMP_LINEAR_KEYS, KNOWN_COLOR_RAMPS } from "src/colorizer/colors/color_ramps";
import { getColorMap } from "src/colorizer/utils/data_utils";
import {
  decodeBoolean,
  encodeBoolean,
  encodeNumber,
  URL_COLOR_RAMP_REVERSED_SUFFIX,
  UrlParam,
} from "src/colorizer/utils/url_utils";

import type { SerializedStoreData, SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import type { DatasetSlice } from "./dataset_slice";

const DEFAULT_COLOR_RAMP_KEY = "matplotlib-turbo" satisfies (typeof DISPLAY_COLOR_RAMP_LINEAR_KEYS)[number];

export type Plot3dSliceState = {
  plot3dXAxis: string | null;
  plot3dYAxis: string | null;
  plot3dZAxis: string | null;

  plot3dShowVectors: boolean;
  plot3dVectorBins: number;
  plot3dVectorScale: number;
  plot3dVectorColorRampKey: string;
  plot3dVectorColorRampReversed: boolean;
  /**
   * Minimum number of deltas required for a bin to be included in the vector
   * field.
   */
  plot3dVectorThreshold: number;

  plot3dLineWidth: number;
  plot3dLineMovingAverageWindow: number;

  plot3dUseGaussian: boolean;
  plot3dGaussianBandwidthPct: number;

  // Derived state
  plot3dColorRamp: ColorRamp;
};

export type Plot3dSliceSerializableState = Pick<
  Plot3dSliceState,
  | "plot3dXAxis"
  | "plot3dYAxis"
  | "plot3dZAxis"
  | "plot3dShowVectors"
  | "plot3dVectorBins"
  | "plot3dVectorScale"
  | "plot3dVectorColorRampKey"
  | "plot3dVectorColorRampReversed"
  | "plot3dVectorThreshold"
  | "plot3dLineWidth"
  | "plot3dLineMovingAverageWindow"
  | "plot3dUseGaussian"
  | "plot3dGaussianBandwidthPct"
>;

export type Plot3dSliceActions = {
  setPlot3dXAxis: (xAxis: string | null) => void;
  setPlot3dYAxis: (yAxis: string | null) => void;
  setPlot3dZAxis: (zAxis: string | null) => void;
  setPlot3dShowVectors: (showVectors: boolean) => void;
  setPlot3dVectorBins: (bins: number) => void;
  setPlot3dVectorScale: (scale: number) => void;
  setPlot3dVectorColorRampKey: (key: string) => void;
  setPlot3dVectorColorRampReversed: (reversed: boolean) => void;
  setPlot3dVectorThreshold: (threshold: number) => void;
  setPlot3dLineWidth: (width: number) => void;
  setPlot3dLineMovingAverageWindow: (windowSize: number) => void;
  setPlot3dUseGaussian: (applyGaussian: boolean) => void;
  setPlot3dGaussianBandwidthPct: (bandwidthPct: number) => void;
};

export type Plot3dSlice = Plot3dSliceState & Plot3dSliceActions;

const isAxisKeyValid = (dataset: Dataset | null, featureKey: string | null): boolean => {
  return dataset === null || featureKey === null || dataset.hasFeatureKey(featureKey);
};

export const createPlot3dSlice: StateCreator<DatasetSlice & Plot3dSlice, [], [], Plot3dSlice> = (set, get) => ({
  // State
  plot3dXAxis: null,
  plot3dYAxis: null,
  plot3dZAxis: null,

  plot3dShowVectors: true,
  plot3dVectorBins: 25,
  plot3dVectorScale: 1.0,
  plot3dVectorColorRampKey: DEFAULT_COLOR_RAMP_KEY,
  plot3dVectorColorRampReversed: false,
  plot3dVectorThreshold: 0,

  plot3dLineWidth: 1.6,
  plot3dLineMovingAverageWindow: 1,

  plot3dUseGaussian: false,
  plot3dGaussianBandwidthPct: 10,

  // Derived state
  plot3dColorRamp: getColorMap(KNOWN_COLOR_RAMPS, DEFAULT_COLOR_RAMP_KEY),

  // Actions
  setPlot3dXAxis: (xAxis) => {
    if (!isAxisKeyValid(get().dataset, xAxis)) {
      throw new Error(`Plot3dSlice.setPlot3dXAxis: Axis key '${xAxis}' was not found in dataset.`);
    }
    set({ plot3dXAxis: xAxis });
  },
  setPlot3dYAxis: (yAxis) => {
    if (!isAxisKeyValid(get().dataset, yAxis)) {
      throw new Error(`Plot3dSlice.setPlot3dYAxis: Axis key '${yAxis}' was not found in dataset.`);
    }
    set({ plot3dYAxis: yAxis });
  },
  setPlot3dZAxis: (zAxis) => {
    if (!isAxisKeyValid(get().dataset, zAxis)) {
      throw new Error(`Plot3dSlice.setPlot3dZAxis: Axis key '${zAxis}' was not found in dataset.`);
    }
    set({ plot3dZAxis: zAxis });
  },
  setPlot3dShowVectors: (showVectors) => set({ plot3dShowVectors: showVectors }),
  setPlot3dVectorBins: (bins) => {
    bins = Math.round(bins);
    if (bins <= 0 || !isFinite(bins)) {
      return;
    }
    set({ plot3dVectorBins: bins });
  },
  setPlot3dVectorScale: (scale) => {
    if (scale <= 0 || !isFinite(scale)) {
      return;
    }
    set({ plot3dVectorScale: scale });
  },
  setPlot3dVectorColorRampKey: (key) => {
    if (!KNOWN_COLOR_RAMPS.has(key)) {
      throw new Error(`Plot3dSlice.setPlot3dVectorColorRampKey: Unknown color ramp key: '${key}'`);
    }
    set({ plot3dVectorColorRampKey: key });
  },
  setPlot3dVectorColorRampReversed: (reversed) => set({ plot3dVectorColorRampReversed: reversed }),
  setPlot3dVectorThreshold: (threshold) => {
    if (!isFinite(threshold) || threshold < 0) {
      return;
    }
    set({ plot3dVectorThreshold: threshold });
  },
  setPlot3dLineWidth: (width) => {
    if (width <= 0 || !isFinite(width)) {
      return;
    }
    set({ plot3dLineWidth: width });
  },
  setPlot3dLineMovingAverageWindow: (windowSize) => {
    if (windowSize <= 0 || !isFinite(windowSize)) {
      return;
    }
    windowSize = Math.round(windowSize);
    const nextOddInteger = Math.floor(windowSize / 2) * 2 + 1;
    set({ plot3dLineMovingAverageWindow: nextOddInteger });
  },
  setPlot3dUseGaussian: (applyGaussian) => set({ plot3dUseGaussian: applyGaussian }),
  setPlot3dGaussianBandwidthPct: (bandwidthPct) => {
    if (bandwidthPct <= 0 || !isFinite(bandwidthPct)) {
      return;
    }
    set({ plot3dGaussianBandwidthPct: bandwidthPct });
  },
});

export const addPlot3dDerivedStateSubscribers = (store: SubscribableStore<DatasetSlice & Plot3dSlice>): void => {
  // Validate axes when the dataset changes
  addDerivedStateSubscriber(
    store,
    (state) => state.dataset,
    (dataset) => {
      if (!dataset) {
        return;
      }
      const { plot3dXAxis, plot3dYAxis, plot3dZAxis } = store.getState();
      if (!isAxisKeyValid(dataset, plot3dXAxis)) {
        store.setState({ plot3dXAxis: null });
      }
      if (!isAxisKeyValid(dataset, plot3dYAxis)) {
        store.setState({ plot3dYAxis: null });
      }
      if (!isAxisKeyValid(dataset, plot3dZAxis)) {
        store.setState({ plot3dZAxis: null });
      }
    }
  );

  // Update derived color ramp when key or reversed state changes
  addDerivedStateSubscriber(
    store,
    (state) => [state.plot3dVectorColorRampKey, state.plot3dVectorColorRampReversed],
    ([key, reversed]) => {
      store.getState().plot3dColorRamp.dispose();
      return {
        plot3dColorRamp: getColorMap(KNOWN_COLOR_RAMPS, key, { reversed }),
      };
    }
  );
};

export const serializePlot3dSlice = (slice: Partial<Plot3dSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (slice.plot3dXAxis !== null && slice.plot3dXAxis !== undefined) {
    ret[UrlParam.PLOT3D_X_AXIS] = slice.plot3dXAxis;
  }
  if (slice.plot3dYAxis !== null && slice.plot3dYAxis !== undefined) {
    ret[UrlParam.PLOT3D_Y_AXIS] = slice.plot3dYAxis;
  }
  if (slice.plot3dZAxis !== null && slice.plot3dZAxis !== undefined) {
    ret[UrlParam.PLOT3D_Z_AXIS] = slice.plot3dZAxis;
  }
  if (slice.plot3dShowVectors !== undefined) {
    ret[UrlParam.PLOT3D_SHOW_VECTORS] = encodeBoolean(slice.plot3dShowVectors);
  }
  if (slice.plot3dVectorBins !== undefined) {
    ret[UrlParam.PLOT3D_VECTOR_BINS] = slice.plot3dVectorBins.toString();
  }
  if (slice.plot3dVectorScale !== undefined) {
    ret[UrlParam.PLOT3D_VECTOR_SCALE] = encodeNumber(slice.plot3dVectorScale);
  }
  if (slice.plot3dVectorColorRampKey !== undefined) {
    ret[UrlParam.PLOT3D_VECTOR_COLOR_RAMP] =
      slice.plot3dVectorColorRampKey + (slice.plot3dVectorColorRampReversed ? URL_COLOR_RAMP_REVERSED_SUFFIX : "");
  }
  if (slice.plot3dVectorThreshold !== undefined) {
    ret[UrlParam.PLOT3D_VECTOR_THRESHOLD] = encodeNumber(slice.plot3dVectorThreshold);
  }
  if (slice.plot3dLineWidth !== undefined) {
    ret[UrlParam.PLOT3D_LINE_WIDTH] = encodeNumber(slice.plot3dLineWidth);
  }
  if (slice.plot3dLineMovingAverageWindow !== undefined) {
    ret[UrlParam.PLOT3D_AVERAGE_LINE_WINDOW] = slice.plot3dLineMovingAverageWindow.toString();
  }
  if (slice.plot3dUseGaussian !== undefined) {
    ret[UrlParam.PLOT3D_USE_GAUSSIAN] = encodeBoolean(slice.plot3dUseGaussian);
  }
  if (slice.plot3dGaussianBandwidthPct !== undefined) {
    ret[UrlParam.PLOT3D_GAUSSIAN_BANDWIDTH] = encodeNumber(slice.plot3dGaussianBandwidthPct);
  }
  return ret;
};

export const selectPlot3dSliceSerializationDeps = (slice: Plot3dSlice): Plot3dSliceSerializableState => ({
  plot3dXAxis: slice.plot3dXAxis,
  plot3dYAxis: slice.plot3dYAxis,
  plot3dZAxis: slice.plot3dZAxis,
  plot3dShowVectors: slice.plot3dShowVectors,
  plot3dVectorBins: slice.plot3dVectorBins,
  plot3dVectorScale: slice.plot3dVectorScale,
  plot3dVectorColorRampKey: slice.plot3dVectorColorRampKey,
  plot3dVectorColorRampReversed: slice.plot3dVectorColorRampReversed,
  plot3dVectorThreshold: slice.plot3dVectorThreshold,
  plot3dLineWidth: slice.plot3dLineWidth,
  plot3dLineMovingAverageWindow: slice.plot3dLineMovingAverageWindow,
  plot3dUseGaussian: slice.plot3dUseGaussian,
  plot3dGaussianBandwidthPct: slice.plot3dGaussianBandwidthPct,
});

export const loadPlot3dSliceFromParams = (slice: Plot3dSlice & DatasetSlice, params: URLSearchParams): void => {
  const dataset = slice.dataset;

  const plot3dXAxis = params.get(UrlParam.PLOT3D_X_AXIS);
  if (plot3dXAxis !== null && isAxisKeyValid(dataset, plot3dXAxis)) {
    slice.setPlot3dXAxis(plot3dXAxis);
  }

  const plot3dYAxis = params.get(UrlParam.PLOT3D_Y_AXIS);
  if (plot3dYAxis !== null && isAxisKeyValid(dataset, plot3dYAxis)) {
    slice.setPlot3dYAxis(plot3dYAxis);
  }

  const plot3dZAxis = params.get(UrlParam.PLOT3D_Z_AXIS);
  if (plot3dZAxis !== null && isAxisKeyValid(dataset, plot3dZAxis)) {
    slice.setPlot3dZAxis(plot3dZAxis);
  }

  const plot3dShowVectors = decodeBoolean(params.get(UrlParam.PLOT3D_SHOW_VECTORS));
  if (plot3dShowVectors !== undefined) {
    slice.setPlot3dShowVectors(plot3dShowVectors);
  }

  const plot3dVectorBinsParam = params.get(UrlParam.PLOT3D_VECTOR_BINS);
  if (plot3dVectorBinsParam !== null) {
    const bins = parseInt(plot3dVectorBinsParam, 10);
    if (!isNaN(bins) && bins > 0) {
      slice.setPlot3dVectorBins(bins);
    }
  }

  const plot3dVectorScaleParam = params.get(UrlParam.PLOT3D_VECTOR_SCALE);
  if (plot3dVectorScaleParam !== null) {
    const scale = parseFloat(plot3dVectorScaleParam);
    if (!isNaN(scale) && scale > 0) {
      slice.setPlot3dVectorScale(scale);
    }
  }

  const plot3dVectorColorRampParam = params.get(UrlParam.PLOT3D_VECTOR_COLOR_RAMP);
  if (plot3dVectorColorRampParam) {
    const [key, reversed] = plot3dVectorColorRampParam.split(URL_COLOR_RAMP_REVERSED_SUFFIX);
    if (KNOWN_COLOR_RAMPS.has(key)) {
      slice.setPlot3dVectorColorRampKey(key);
      slice.setPlot3dVectorColorRampReversed(reversed !== undefined);
    }
  }

  const plot3dVectorThresholdParam = params.get(UrlParam.PLOT3D_VECTOR_THRESHOLD);
  if (plot3dVectorThresholdParam !== null) {
    const threshold = parseFloat(plot3dVectorThresholdParam);
    if (!isNaN(threshold) && threshold >= 0) {
      slice.setPlot3dVectorThreshold(threshold);
    }
  }

  const plot3dLineWidthParam = params.get(UrlParam.PLOT3D_LINE_WIDTH);
  if (plot3dLineWidthParam !== null) {
    const lineWidth = parseFloat(plot3dLineWidthParam);
    if (!isNaN(lineWidth) && lineWidth > 0) {
      slice.setPlot3dLineWidth(lineWidth);
    }
  }

  const plot3dLineMAWindowParam = params.get(UrlParam.PLOT3D_AVERAGE_LINE_WINDOW);
  if (plot3dLineMAWindowParam !== null) {
    const windowSize = parseInt(plot3dLineMAWindowParam, 10);
    if (!isNaN(windowSize) && windowSize > 0) {
      slice.setPlot3dLineMovingAverageWindow(windowSize);
    }
  }

  const plot3dUseGaussian = decodeBoolean(params.get(UrlParam.PLOT3D_USE_GAUSSIAN));
  if (plot3dUseGaussian !== undefined) {
    slice.setPlot3dUseGaussian(plot3dUseGaussian);
  }

  const plot3dGaussianBandwidthParam = params.get(UrlParam.PLOT3D_GAUSSIAN_BANDWIDTH);
  if (plot3dGaussianBandwidthParam !== null) {
    const bandwidthPct = parseFloat(plot3dGaussianBandwidthParam);
    if (!isNaN(bandwidthPct) && bandwidthPct > 0) {
      slice.setPlot3dGaussianBandwidthPct(bandwidthPct);
    }
  }
};
