import {
  loadBackdropSliceFromParams,
  loadColorRampSliceFromParams,
  loadConfigSliceFromParams,
  loadDatasetSliceFromParams,
  loadScatterPlotSliceFromParams,
  loadThresholdSliceFromParams,
  loadTimeSliceFromParams,
  loadVectorSliceFromParams,
  serializeBackdropSlice,
  serializeCollectionSlice,
  serializeColorRampSlice,
  serializeConfigSlice,
  serializeDatasetSlice,
  serializeScatterPlotSlice,
  serializeThresholdSlice,
  serializeTimeSlice,
  serializeVectorSlice,
} from "../slices";
import { SerializedStoreData, Store } from "../types";

import { ViewerState } from "../ViewerState";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const serializeViewerStateStore = (store: Store<ViewerState>): Partial<SerializedStoreData> => {
  // Ordered by approximate importance in the URL
  return {
    ...serializeCollectionSlice(store.getState()),
    ...serializeDatasetSlice(store.getState()),
    ...serializeTimeSlice(store.getState()),
    ...serializeColorRampSlice(store.getState()),
    ...serializeThresholdSlice(store.getState()),
    ...serializeConfigSlice(store.getState()),
    ...serializeScatterPlotSlice(store.getState()),
    ...serializeBackdropSlice(store.getState()),
    ...serializeVectorSlice(store.getState()),
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
 * Loads the viewer state from the given URL parameters. Note that this MUST be
 * called after the collection and dataset are loaded and set in the store.
 */
export const loadViewerStateFromParams = async (store: Store<ViewerState>, params: URLSearchParams): Promise<void> => {
  // 1. No dependencies:
  loadConfigSliceFromParams(store.getState(), params);

  // 2. Dependent on dataset object:
  loadBackdropSliceFromParams(store.getState(), params);
  loadDatasetSliceFromParams(store.getState(), params);
  loadScatterPlotSliceFromParams(store.getState(), params);
  loadThresholdSliceFromParams(store.getState(), params);
  loadVectorSliceFromParams(store.getState(), params);

  // 3. Dependent on dataset slice (track/backdrop/features):
  loadTimeSliceFromParams(store.getState(), params);

  // 4. Dependent on dataset + threshold slices:
  loadColorRampSliceFromParams(store.getState(), params);
};
