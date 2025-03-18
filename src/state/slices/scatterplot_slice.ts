import { StateCreator } from "zustand";

import { Dataset } from "../../colorizer";
import { PlotRangeType } from "../../colorizer/types";
import { SCATTERPLOT_TIME_FEATURE } from "../../components/Tabs/scatter_plot_data_utils";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

type ScatterPlotSliceState = {
  scatterXAxis: string | null;
  scatterYAxis: string | null;
  scatterRangeType: PlotRangeType;
};

type ScatterPlotSliceActions = {
  setScatterXAxis: (xAxis: string | null) => void;
  setScatterYAxis: (yAxis: string | null) => void;
  setScatterRangeType: (rangeType: PlotRangeType) => void;
};

export type ScatterPlotSlice = ScatterPlotSliceState & ScatterPlotSliceActions;

const isAxisKeyValid = (dataset: Dataset | null, featureKey: string | null): boolean => {
  return (
    dataset === null ||
    featureKey === null ||
    dataset.hasFeatureKey(featureKey) ||
    featureKey === SCATTERPLOT_TIME_FEATURE.value
  );
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
