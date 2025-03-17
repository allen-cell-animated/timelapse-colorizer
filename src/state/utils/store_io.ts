import {
  backdropSliceSerializationDependencies,
  collectionSliceSerializationDependencies,
  colorRampSliceSerializationDependencies,
  configSliceSerializationDependencies,
  datasetSliceSerializationDependencies,
  loadBackdropSliceFromParams,
  loadColorRampSliceFromParams,
  loadConfigSliceFromParams,
  loadDatasetSliceFromParams,
  loadScatterPlotSliceFromParams,
  loadThresholdSliceFromParams,
  loadTimeSliceFromParams,
  loadVectorSliceFromParams,
  scatterPlotSliceSerializationDependencies,
  serializeBackdropSlice,
  serializeCollectionSlice,
  serializeColorRampSlice,
  serializeConfigSlice,
  serializeDatasetSlice,
  serializeScatterPlotSlice,
  serializeThresholdSlice,
  serializeTimeSlice,
  serializeVectorSlice,
  thresholdSliceSerializationDependencies,
  timeSliceSerializationDependencies,
  vectorSliceSerializationDependencies,
} from "../slices";
import { SerializedStoreData, Store } from "../types";

import { ViewerState } from "../ViewerState";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const selectSerializationDependencies = (state: ViewerState): Partial<ViewerState> => ({
  ...collectionSliceSerializationDependencies(state),
  ...datasetSliceSerializationDependencies(state),
  // Time slice should only allow updates when paused.
  ...timeSliceSerializationDependencies(state),
  ...colorRampSliceSerializationDependencies(state),
  ...thresholdSliceSerializationDependencies(state),
  ...configSliceSerializationDependencies(state),
  ...scatterPlotSliceSerializationDependencies(state),
  ...backdropSliceSerializationDependencies(state),
  ...vectorSliceSerializationDependencies(state),
});

export const getDifferingKeys = (a: Partial<ViewerState>, b: Partial<ViewerState>): Set<keyof ViewerState> => {
  const differingKeys = new Set<keyof ViewerState>();
  for (const key in a) {
    const typedKey = key as keyof ViewerState;
    if (a[typedKey] !== b[typedKey]) {
      differingKeys.add(typedKey);
    }
  }
  return differingKeys;
};

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
