import {
  loadColorRampSliceFromParams,
  loadDatasetSliceFromParams,
  serializeColorRampSlice,
  serializeDatasetSlice,
} from "../slices";
import { SerializedStoreData, Store } from "../types";

import { ViewerState } from "../ViewerState";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const serializeViewerStateStore = (store: Store<ViewerState>): Partial<SerializedStoreData> => {
  return {
    ...serializeDatasetSlice(store.getState()),
    ...serializeColorRampSlice(store.getState()),
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
 * Loads the viewer state from the given URL parameters. Note that this MUST be called after the dataset is loaded and set in the store.
 */
export const loadViewerStateFromParams = async (store: Store<ViewerState>, params: URLSearchParams): Promise<void> => {
  // NOTE: Ordering is important here, because of slice dependencies.
  loadDatasetSliceFromParams(store.getState(), params);
  // TODO: Add other slices here
  // Ramp MUST be loaded last because it updates whenever thresholds or feature changes
  loadColorRampSliceFromParams(store.getState(), params);
};
