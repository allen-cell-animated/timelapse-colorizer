import { StateCreator } from "zustand";

import { FeatureThreshold } from "../../colorizer";
import { getInRangeLUT } from "../../colorizer/utils/data_utils";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
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

export const createThresholdSlice: StateCreator<ThresholdSlice, [], [], ThresholdSlice> = (set, _get) => ({
  thresholds: [],
  inRangeLUT: new Uint8Array(0),
  setThresholds: (thresholds) => {
    set({ thresholds });
  },
});

export const addThresholdDerivedStateSubscribers = (store: SubscribableStore<ThresholdSlice & DatasetSlice>): void => {
  addDerivedStateSubscriber(
    store,
    (state) => [state.thresholds, state.dataset],
    // TODO: Use workers for calculation to avoid slowing UI thread
    ([thresholds, dataset]) => ({ inRangeLUT: dataset ? getInRangeLUT(dataset, thresholds) : new Uint8Array(0) })
  );
};
