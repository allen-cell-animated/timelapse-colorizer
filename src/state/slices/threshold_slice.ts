import { StateCreator } from "zustand";

import { FeatureThreshold } from "../../colorizer";
import { getInRangeLUT, validateThresholds } from "../../colorizer/utils/data_utils";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { CollectionSlice } from "./collection_slice";
import { DatasetSlice } from "./dataset_slice";

type ThresholdSliceState = {
  thresholds: FeatureThreshold[];

  // Derived state
  /** Lookup table from object ID to whether it is in range (=1) or not (=0). */
  inRangeLUT: Uint8Array;
};

type ThresholdSliceActions = {
  setThresholds: (thresholds: FeatureThreshold[]) => void;
};

export type ThresholdSlice = ThresholdSliceState & ThresholdSliceActions;

export const createThresholdSlice: StateCreator<ThresholdSlice & DatasetSlice, [], [], ThresholdSlice> = (
  set,
  get
) => ({
  thresholds: [],
  inRangeLUT: new Uint8Array(0),
  setThresholds: (thresholds) => {
    const dataset = get().dataset;
    if (!dataset) {
      set({ thresholds });
    } else {
      set({ thresholds: validateThresholds(dataset, thresholds) });
    }
  },
});

export const addThresholdDerivedStateSubscribers = (
  store: SubscribableStore<ThresholdSlice & DatasetSlice & CollectionSlice>
): void => {
  // Compute in-range lookup table on thresholds or dataset change
  // TODO: Use workers for calculation to avoid slowing UI thread
  addDerivedStateSubscriber(
    store,
    (state) => [state.thresholds, state.dataset],
    ([thresholds, dataset]) => ({ inRangeLUT: dataset ? getInRangeLUT(dataset, thresholds) : new Uint8Array(0) })
  );

  // Validate thresholds on dataset change
  addDerivedStateSubscriber(
    store,
    (state) => state.dataset,
    (dataset) => {
      const thresholds = store.getState().thresholds;
      if (dataset) {
        return { thresholds: validateThresholds(dataset, thresholds) };
      }
      return undefined;
    }
  );

  // Clear thresholds on collections change
  // TODO: Show warning before switching collections if thresholds will be lost
  // TODO: Should we clear this at all?
  addDerivedStateSubscriber(
    store,
    (state) => state.collection,
    () => ({ thresholds: [] })
  );
};
