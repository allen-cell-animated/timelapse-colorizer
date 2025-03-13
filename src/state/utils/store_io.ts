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

export const loadViewerStateFromParams = async (store: Store<ViewerState>, params: URLSearchParams): Promise<void> => {
  // Load the rest of the state. This MUST happen after the dataset is loaded into the store.
  // NOTE: Ordering is important here, because of slice dependencies.
  loadDatasetSliceFromParams(store.getState(), params);
  // Other slices can be added here
  // Ramp MUST be loaded last because it updates whenever thresholds or feature changes
  loadColorRampSliceFromParams(store.getState(), params);
};
