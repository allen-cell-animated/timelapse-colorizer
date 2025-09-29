import { StateCreator } from "zustand";

import { Dataset } from "@/colorizer";
import { TIME_FEATURE_KEY } from "@/colorizer/Dataset";
import { PlotRangeType } from "@/colorizer/types";
import { decodeScatterPlotRangeType, encodeScatterPlotRangeType, UrlParam } from "@/colorizer/utils/url_utils";
import { DEPRECATED_SCATTERPLOT_TIME_KEY } from "@/constants";
import { SerializedStoreData, SubscribableStore } from "@/state/types";
import { addDerivedStateSubscriber } from "@/state/utils/store_utils";

import { DatasetSlice } from "./dataset_slice";

export type ScatterPlotSliceState = {
  scatterXAxis: string | null;
  scatterYAxis: string | null;
  scatterRangeType: PlotRangeType;
};

export type ScatterPlotSliceSerializableState = Pick<
  ScatterPlotSliceState,
  "scatterXAxis" | "scatterYAxis" | "scatterRangeType"
>;

export type ScatterPlotSliceActions = {
  setScatterXAxis: (xAxis: string | null) => void;
  setScatterYAxis: (yAxis: string | null) => void;
  setScatterRangeType: (rangeType: PlotRangeType) => void;
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
  scatterRangeType: PlotRangeType.ALL_TIME,

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
  setScatterRangeType: (rangeType) => set({ scatterRangeType: rangeType }),
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
  if (slice.scatterRangeType !== undefined) {
    ret[UrlParam.SCATTERPLOT_RANGE_MODE] = encodeScatterPlotRangeType(slice.scatterRangeType);
  }
  return ret;
};

/** Selects state values that serialization depends on. */
export const selectScatterPlotSliceSerializationDeps = (
  slice: ScatterPlotSlice
): ScatterPlotSliceSerializableState => ({
  scatterXAxis: slice.scatterXAxis,
  scatterYAxis: slice.scatterYAxis,
  scatterRangeType: slice.scatterRangeType,
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

  const scatterRangeType = decodeScatterPlotRangeType(params.get(UrlParam.SCATTERPLOT_RANGE_MODE));
  if (scatterRangeType !== undefined) {
    slice.setScatterRangeType(scatterRangeType);
  }
};
