import type { StateCreator } from "zustand";

import { deserializeFeatureList, serializeFeatureList, UrlParam } from "src/colorizer/utils/url_utils";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

import type { DatasetSlice } from "./dataset_slice";

export type CorrelationSliceState = {
  /** Current list of features selected for the correlation plot calculation. */
  correlationFeatures: string[];
};

export type CorrelationSliceSerializableState = Pick<CorrelationSliceState, "correlationFeatures">;

export type CorrelationSliceActions = {
  setCorrelationFeatures: (features: string[]) => void;
};

export type CorrelationSlice = CorrelationSliceState & CorrelationSliceActions;

export const createCorrelationSlice: StateCreator<CorrelationSlice & DatasetSlice, [], [], CorrelationSlice> = (
  set,
  get
) => ({
  correlationFeatures: [],

  setCorrelationFeatures: (features: string[]) => {
    const { dataset } = get();
    if (dataset) {
      features = features.filter((key) => dataset.hasFeatureKey(key));
    }
    set({ correlationFeatures: features });
  },
});

export const addCorrelationDerivedStateSubscribers = (
  store: SubscribableStore<CorrelationSlice & DatasetSlice>
): void => {
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset }),
    ({ dataset }) => {
      if (dataset === null) {
        return {};
      }
      // Validate that all correlation features are in the dataset.
      const newFeatures = store.getState().correlationFeatures.filter((feature) => dataset.hasFeatureKey(feature));
      if (newFeatures.length === store.getState().correlationFeatures.length) {
        // Make no changes if all features are valid
        return {};
      }
      return {
        correlationFeatures: newFeatures,
      };
    }
  );
};

export const serializeCorrelationSlice = (
  slice: Partial<CorrelationSliceSerializableState & DatasetSlice>
): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (slice.correlationFeatures) {
    ret[UrlParam.CORRELATION_PLOT_FEATURES] = serializeFeatureList(
      slice.correlationFeatures,
      slice.dataset ?? undefined
    );
  }
  return ret;
};

export const selectCorrelationSliceSerializationDeps = (
  slice: CorrelationSlice
): CorrelationSliceSerializableState => ({
  correlationFeatures: slice.correlationFeatures,
});

export const loadCorrelationSliceFromParams = (
  slice: CorrelationSlice & DatasetSlice,
  params: URLSearchParams
): void => {
  const featuresParam = params.get(UrlParam.CORRELATION_PLOT_FEATURES);
  if (featuresParam !== null) {
    const features = deserializeFeatureList(featuresParam, slice.dataset ?? undefined);
    if (features !== undefined) {
      slice.setCorrelationFeatures(features);
    }
  }
};
