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
  ViewerStore,
  ViewerStoreSerializableState,
} from "../slices";
import { SerializedStoreData, Store } from "../types";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const selectSerializationDependencies = (state: ViewerStore): Partial<ViewerStore> => ({
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

/**
 * Serializes viewer store state into a `SerializedStoreData` object,
 * which can be used to generate a URL query string using `serializedDataToUrl`.
 * @param params Object containing serializable viewer state parameters.
 * Also includes a `collectionParam` field for the collection URL.
 */
export const serializeViewerState = (state: Partial<ViewerStoreSerializableState>): Partial<SerializedStoreData> => {
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

export type ViewerParams = Partial<ViewerStoreSerializableState> & {
  /** URL of the collection resource to load. */
  collectionParam?: string;
};

/**
 * Serializes parameters for the viewer into a `SerializedStoreData` object,
 * which can be used to generate a URL query string using `serializedDataToUrl`.
 * @param params Object containing serializable viewer state parameters.
 * Also includes a `collectionParam` field for the collection URL.
 */
export const serializeViewerParams = (params: ViewerParams): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (params.collectionParam) {
    ret[UrlParam.COLLECTION] = params.collectionParam;
  }
  return {
    // Order collection first
    ...ret,
    ...serializeViewerState({ ...params, collection: undefined }),
  };
};

/**
 * Converts a serialized store data object to a URL query string. Does not
 * include the `?` prefix.
 */
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
export const loadViewerStateFromParams = async (store: Store<ViewerStore>, params: URLSearchParams): Promise<void> => {
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
