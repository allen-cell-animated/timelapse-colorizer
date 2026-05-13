import type { StateCreator } from "zustand";

import type { Dataset } from "src/colorizer";
import { TIME_FEATURE_KEY } from "src/colorizer/Dataset";
import { PlotRangeType } from "src/colorizer/types";
import {
  decodeBoolean,
  decodeScatterPlotRangeType,
  encodeBoolean,
  encodeScatterPlotRangeType,
  UrlParam,
} from "src/colorizer/utils/url_utils";
import { DEPRECATED_SCATTERPLOT_TIME_KEY } from "src/constants";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

import type { DatasetSlice } from "./dataset_slice";

export type ScatterPlotSliceState = {
  scatterXAxis: string | null;
  scatterYAxis: string | null;
  scatterRangeType: PlotRangeType;

  // Histograms
  scatterShowHistograms: boolean;
  scatterHistogramBins: number;

  // Contours
  scatterShowContours: boolean;
  scatterContourCount: number;
};

export type ScatterPlotSliceSerializableState = Pick<
  ScatterPlotSliceState,
  | "scatterXAxis"
  | "scatterYAxis"
  | "scatterRangeType"
  | "scatterShowHistograms"
  | "scatterHistogramBins"
  | "scatterShowContours"
  | "scatterContourCount"
>;

export type ScatterPlotSliceActions = {
  setScatterXAxis: (xAxis: string | null) => void;
  setScatterYAxis: (yAxis: string | null) => void;
  setScatterShowHistograms: (showHistograms: boolean) => void;
  setScatterHistogramBins: (bins: number) => void;
  setScatterRangeType: (rangeType: PlotRangeType) => void;
  setScatterShowContours: (showHeatmap: boolean) => void;
  setScatterContourCount: (count: number) => void;
};

export type ScatterPlotSlice = ScatterPlotSliceState & ScatterPlotSliceActions;

const isAxisKeyValid = (dataset: Dataset | null, featureKey: string | null): boolean => {
  return dataset === null || featureKey === null || dataset.hasFeatureKey(featureKey);
};

export const createScatterPlotSlice: StateCreator<DatasetSlice & ScatterPlotSlice, [], [], ScatterPlotSlice> = (
  set,
  get
) => ({
  // State
  scatterXAxis: null,
  scatterYAxis: null,
  scatterShowHistograms: true,
  scatterHistogramBins: 20,
  scatterRangeType: PlotRangeType.ALL_TIME,
  scatterShowContours: false,
  scatterContourCount: 20,

  // Actions
  setScatterXAxis: (xAxis) => {
    if (!isAxisKeyValid(get().dataset, xAxis)) {
      throw new Error(`ScatterPlotSlice.setScatterXAxis: Axis key '${xAxis}' was not found in dataset.`);
    }
    set({ scatterXAxis: xAxis });
  },
  setScatterYAxis: (yAxis) => {
    if (!isAxisKeyValid(get().dataset, yAxis)) {
      throw new Error(`ScatterPlotSlice.setScatterYAxis: Axis key '${yAxis}' was not found in dataset.`);
    }
    set({ scatterYAxis: yAxis });
  },
  setScatterShowHistograms: (showHistograms) => {
    set({ scatterShowHistograms: showHistograms });
  },
  setScatterHistogramBins: (bins) => {
    bins = Math.round(bins);
    if (bins <= 0 || !isFinite(bins)) {
      return;
    }
    set({ scatterHistogramBins: bins });
  },
  setScatterRangeType: (rangeType) => set({ scatterRangeType: rangeType }),
  setScatterShowContours: (visibility) => set({ scatterShowContours: visibility }),
  setScatterContourCount: (count) => {
    count = Math.round(count);
    if (count <= 0 || !isFinite(count)) {
      return;
    }
    set({ scatterContourCount: count });
  },
});

export const addScatterPlotSliceDerivedStateSubscribers = (
  store: SubscribableStore<DatasetSlice & ScatterPlotSlice>
): void => {
  // Validate the scatter plot axes when the dataset changes
  addDerivedStateSubscriber(
    store,
    (state) => state.dataset,
    (dataset) => {
      const { scatterXAxis, scatterYAxis } = store.getState();
      if (!dataset) {
        return;
      }
      if (!isAxisKeyValid(dataset, scatterXAxis)) {
        store.setState({ scatterXAxis: null });
      }
      if (!isAxisKeyValid(dataset, scatterYAxis)) {
        store.setState({ scatterYAxis: null });
      }
    }
  );
};

export const serializeScatterPlotSlice = (slice: Partial<ScatterPlotSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (slice.scatterXAxis !== null && slice.scatterXAxis !== undefined) {
    ret[UrlParam.SCATTERPLOT_X_AXIS] = slice.scatterXAxis;
  }
  if (slice.scatterYAxis !== null && slice.scatterYAxis !== undefined) {
    ret[UrlParam.SCATTERPLOT_Y_AXIS] = slice.scatterYAxis;
  }
  if (slice.scatterShowHistograms !== undefined) {
    ret[UrlParam.SCATTERPLOT_SHOW_HISTOGRAMS] = encodeBoolean(slice.scatterShowHistograms);
  }
  if (slice.scatterHistogramBins !== undefined) {
    ret[UrlParam.SCATTERPLOT_BINS] = slice.scatterHistogramBins.toString();
  }
  if (slice.scatterRangeType !== undefined) {
    ret[UrlParam.SCATTERPLOT_RANGE_MODE] = encodeScatterPlotRangeType(slice.scatterRangeType);
  }
  if (slice.scatterShowContours !== undefined) {
    ret[UrlParam.SCATTERPLOT_SHOW_CONTOUR] = encodeBoolean(slice.scatterShowContours);
  }
  if (slice.scatterContourCount !== undefined) {
    ret[UrlParam.SCATTERPLOT_CONTOUR_COUNT] = slice.scatterContourCount.toString();
  }
  return ret;
};

/** Selects state values that serialization depends on. */
export const selectScatterPlotSliceSerializationDeps = (
  slice: ScatterPlotSlice
): ScatterPlotSliceSerializableState => ({
  scatterXAxis: slice.scatterXAxis,
  scatterYAxis: slice.scatterYAxis,
  scatterShowHistograms: slice.scatterShowHistograms,
  scatterHistogramBins: slice.scatterHistogramBins,
  scatterRangeType: slice.scatterRangeType,
  scatterShowContours: slice.scatterShowContours,
  scatterContourCount: slice.scatterContourCount,
});

export const loadScatterPlotSliceFromParams = (
  slice: ScatterPlotSlice & DatasetSlice,
  params: URLSearchParams
): void => {
  const dataset = slice.dataset;

  let scatterXAxis = params.get(UrlParam.SCATTERPLOT_X_AXIS);
  if (scatterXAxis === DEPRECATED_SCATTERPLOT_TIME_KEY) {
    scatterXAxis = TIME_FEATURE_KEY;
  }
  if (scatterXAxis !== null && scatterXAxis !== undefined && isAxisKeyValid(dataset, scatterXAxis)) {
    slice.setScatterXAxis(scatterXAxis);
  }

  let scatterYAxis = params.get(UrlParam.SCATTERPLOT_Y_AXIS);
  if (scatterYAxis === DEPRECATED_SCATTERPLOT_TIME_KEY) {
    scatterYAxis = TIME_FEATURE_KEY;
  }
  if (scatterYAxis !== null && scatterYAxis !== undefined && isAxisKeyValid(dataset, scatterYAxis)) {
    slice.setScatterYAxis(scatterYAxis);
  }

  const scatterShowHistograms = decodeBoolean(params.get(UrlParam.SCATTERPLOT_SHOW_HISTOGRAMS));
  if (scatterShowHistograms !== undefined) {
    slice.setScatterShowHistograms(scatterShowHistograms);
  }

  const scatterHistogramBinsParam = params.get(UrlParam.SCATTERPLOT_BINS);
  if (scatterHistogramBinsParam !== null && scatterHistogramBinsParam !== undefined) {
    const bins = parseInt(scatterHistogramBinsParam, 10);
    if (!isNaN(bins) && bins > 0) {
      slice.setScatterHistogramBins(bins);
    }
  }

  const scatterRangeType = decodeScatterPlotRangeType(params.get(UrlParam.SCATTERPLOT_RANGE_MODE));
  if (scatterRangeType !== undefined) {
    slice.setScatterRangeType(scatterRangeType);
  }

  const scatterShowContours = decodeBoolean(params.get(UrlParam.SCATTERPLOT_SHOW_CONTOUR));
  if (scatterShowContours !== undefined) {
    slice.setScatterShowContours(scatterShowContours);
  }

  const scatterContourCountParam = params.get(UrlParam.SCATTERPLOT_CONTOUR_COUNT);
  if (scatterContourCountParam !== null && scatterContourCountParam !== undefined) {
    const contourCount = parseInt(scatterContourCountParam, 10);
    if (!isNaN(contourCount) && contourCount > 0) {
      slice.setScatterContourCount(contourCount);
    }
  }
};
