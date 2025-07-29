import { StateCreator } from "zustand";

import { FeatureThreshold } from "../../colorizer";
import { validateThresholds } from "../../colorizer/utils/data_utils";
import { deserializeThresholds, serializeThresholds, UrlParam } from "../../colorizer/utils/url_utils";
import { SerializedStoreData, SubscribableStore } from "../types";
import { addDerivedStateSubscriber, makeDebouncedCallback } from "../utils/store_utils";
import { CollectionSlice } from "./collection_slice";
import { DatasetSlice } from "./dataset_slice";

import { getSharedWorkerPool } from "../../colorizer/workers/SharedWorkerPool";

export type ThresholdSliceState = {
  thresholds: FeatureThreshold[];

  // Derived state
  /** Lookup table from object ID to whether it is in range (=1) or not (=0). */
  inRangeLUT: Uint8Array;
};

export type ThresholdSliceSerializableState = Pick<ThresholdSliceState, "thresholds">;

export type ThresholdSliceActions = {
  setThresholds: (thresholds: FeatureThreshold[]) => void;
  setInRangeLUT: (inRangeLUT: Uint8Array) => void;
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
  setInRangeLUT: (inRangeLUT) => set({ inRangeLUT }),
});

export const addThresholdDerivedStateSubscribers = (
  store: SubscribableStore<ThresholdSlice & DatasetSlice & CollectionSlice>
): void => {
  // Compute in-range lookup table on thresholds or dataset change
  // TODO: Use workers for calculation to avoid slowing UI thread
  addDerivedStateSubscriber(
    store,
    (state) => [state.thresholds, state.dataset],
    makeDebouncedCallback(([thresholds, dataset]) => {
      const updateInRangeLUT = async (): Promise<void> => {
        if (!dataset) {
          return;
        }
        const workerpool = getSharedWorkerPool();
        const inRangeLUT = await workerpool.getInRangeLUT(dataset, thresholds);
        if (inRangeLUT !== null) {
          store.setState({ inRangeLUT });
        }
      };
      updateInRangeLUT();
    }, 50)
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

export const serializeThresholdSlice = (slice: Partial<ThresholdSliceSerializableState>): SerializedStoreData => {
  if (!slice.thresholds || slice.thresholds.length === 0) {
    return {};
  }
  return { [UrlParam.THRESHOLDS]: serializeThresholds(slice.thresholds) };
};

/* Selects state values that serialization depends on. */
export const selectThresholdSliceSerializationDeps = (slice: ThresholdSlice): ThresholdSliceSerializableState => ({
  thresholds: slice.thresholds,
});

export const loadThresholdSliceFromParams = (slice: ThresholdSlice, params: URLSearchParams): void => {
  const thresholds = deserializeThresholds(params.get(UrlParam.THRESHOLDS));
  if (thresholds !== undefined) {
    slice.setThresholds(thresholds);
  }
};
