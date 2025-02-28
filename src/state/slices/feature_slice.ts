import { StateCreator } from "zustand";

import { Dataset } from "../../colorizer";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

type FeatureSliceState = {
  featureKey: string | null;
};

type FeatureSliceActions = {
  setFeatureKey: (dataset: Dataset, key: string) => void;
};

export type FeatureSlice = FeatureSliceState & FeatureSliceActions;

export const createFeatureSlice: StateCreator<FeatureSlice, [], [], FeatureSlice> = (set) => ({
  featureKey: null,
  setFeatureKey: (dataset: Dataset, key: string) => {
    if (dataset.hasFeatureKey(key)) {
      set({ featureKey: key });
    } else {
      throw new Error(`Feature key not found in dataset: ${key}`);
    }
  },
});

export const addFeatureDerivedStateSubscribers = (store: SubscribableStore<DatasetSlice & FeatureSlice>): void => {
  // When dataset updates, check if feature key is still valid for the dataset.
  // - If dataset is null, set feature key to null.
  // - If dataset is missing feature key, set feature key to default.
  // - If dataset has feature key, do nothing.
  addDerivedStateSubscriber(
    store,
    (state) => [state.dataset, state.featureKey],
    ([dataset, featureKey]) => {
      if (dataset === null) {
        return { featureKey: null };
      } else if (featureKey === null || !dataset.hasFeatureKey(featureKey)) {
        return { featureKey: dataset.featureKeys[0] };
      } else {
        return { featureKey };
      }
    }
  );
};
