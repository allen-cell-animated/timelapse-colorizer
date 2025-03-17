import { UrlParam } from "../../colorizer/utils/url_utils";
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

/**
 * Returns a copy of an object where any properties with a value of `undefined`
 * are not included.
 */
function removeUndefinedProperties<T>(object: T): Partial<T> {
  const ret: Partial<T> = {};
  for (const key in object) {
    if (object[key] !== undefined) {
      ret[key] = object[key];
    }
  }
  return ret;
}

export const getDifferingKeys = <T>(a: Partial<T>, b: Partial<T>): Set<keyof T> => {
  const differingKeys = new Set<keyof T>();
  for (const key in a) {
    if (a[key] !== b[key]) {
      differingKeys.add(key);
    }
  }
  return differingKeys;
};

export const serializeViewerState = (state: Partial<ViewerState>): Partial<SerializedStoreData> => {
  // Ordered by approximate importance in the URL
  return {
    ...serializeCollectionSlice(state),
    ...serializeDatasetSlice(state),
    ...serializeTimeSlice(state),
    ...serializeColorRampSlice(state),
    ...serializeThresholdSlice(state),
    ...serializeConfigSlice(state),
    ...serializeScatterPlotSlice(state),
    ...serializeBackdropSlice(state),
    ...serializeVectorSlice(state),
  };
};

export type ViewerParams = Partial<ViewerState> & {
  /** URL of the collection resource to load. */
  collectionParam?: string;
  /** URL of the dataset to load (if no collection is provided) or the key of
   * the dataset in the collection. */
  datasetParam?: string;
};

export const serializeViewerParams = (params: ViewerParams): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (params.collectionParam) {
    ret[UrlParam.COLLECTION] = params.collectionParam;
  }
  if (params.datasetParam) {
    ret[UrlParam.DATASET] = params.datasetParam;
  }
  return {
    // Order collection + dataset first
    ...ret,
    ...serializeViewerState({ ...params, dataset: undefined, datasetKey: undefined, collection: undefined }),
  };
};

export const serializedDataToUrl = (data: SerializedStoreData): string => {
  const params = new URLSearchParams();
  data = removeUndefinedProperties(data);
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
