import {
  loadColorRampSliceFromParams,
  loadConfigSliceFromParams,
  loadDatasetSliceFromParams,
  loadTimeSliceFromParams,
  serializeColorRampSlice,
  serializeConfigSlice,
  serializeDatasetSlice,
  serializeTimeSlice,
} from "../slices";
import { SerializedStoreData, Store } from "../types";

import { ViewerState } from "../ViewerState";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const serializeViewerStateStore = (store: Store<ViewerState>): Partial<SerializedStoreData> => {
  // Ordered by approximate importance in the URL
  return {
    ...serializeDatasetSlice(store.getState()),
    ...serializeTimeSlice(store.getState()),
    ...serializeColorRampSlice(store.getState()),
    ...serializeConfigSlice(store.getState()),
  };
};

export const serializedStoreDataToUrl = (data: SerializedStoreData): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    params.set(key, value);
  }
  return params.toString();
};

// DESERIALIZATION ///////////////////////////////////////////////////////////////////////

/**
 * Loads the viewer state from the given URL  parameters. Note that this MUST be
 * called after the dataset is loaded and set in the store.
 */
export const loadViewerStateFromParams = async (store: Store<ViewerState>, params: URLSearchParams): Promise<void> => {
  // NOTE: Ordering is important here, because of dependencies between slices.
  // 1. No dependencies:
  loadDatasetSliceFromParams(store.getState(), params);
  loadConfigSliceFromParams(store.getState(), params);

  // 2. Dependent on dataset fields:
  loadTimeSliceFromParams(store.getState(), params);

  // 3. Dependent on dataset + thresholds:
  loadColorRampSliceFromParams(store.getState(), params);
};
