import { UrlParam } from "../../colorizer/utils/url_utils";
import {
  loadBackdropSliceFromParams,
  loadChannelSliceFromParams,
  loadColorRampSliceFromParams,
  loadConfigSliceFromParams,
  loadDatasetSliceFromParams,
  loadScatterPlotSliceFromParams,
  loadThresholdSliceFromParams,
  loadTimeSliceFromParams,
  loadVectorSliceFromParams,
  selectBackdropSliceSerializationDeps,
  selectChannelSliceSerializationDeps,
  selectCollectionSliceSerializationDeps,
  selectColorRampSliceSerializationDeps,
  selectConfigSliceSerializationDeps,
  selectDatasetSliceSerializationDeps,
  selectScatterPlotSliceSerializationDeps,
  selectThresholdSliceSerializationDeps,
  selectTimeSliceSerializationDeps,
  selectVectorSliceSerializationDeps,
  serializeBackdropSlice,
  serializeChannelSlice,
  serializeCollectionSlice,
  serializeColorRampSlice,
  serializeConfigSlice,
  serializeDatasetSlice,
  serializeScatterPlotSlice,
  serializeThresholdSlice,
  serializeTimeSlice,
  serializeVectorSlice,
  ViewerStore,
  ViewerStoreSerializableState,
} from "../slices";
import { SerializedStoreData, Store } from "../types";
import { removeUndefinedProperties } from "./data_validation";

// SERIALIZATION /////////////////////////////////////////////////////////////////////////

export const selectSerializationDependencies = (state: ViewerStore): Partial<ViewerStore> => ({
  ...selectCollectionSliceSerializationDeps(state),
  ...selectDatasetSliceSerializationDeps(state),
  ...selectTimeSliceSerializationDeps(state),
  ...selectColorRampSliceSerializationDeps(state),
  ...selectThresholdSliceSerializationDeps(state),
  ...selectConfigSliceSerializationDeps(state),
  ...selectScatterPlotSliceSerializationDeps(state),
  ...selectBackdropSliceSerializationDeps(state),
  ...selectChannelSliceSerializationDeps(state),
  ...selectVectorSliceSerializationDeps(state),
});

/**
 * Serializes viewer store state into a `SerializedStoreData` object,
 * which can be used to generate a URL query string using `serializedDataToUrl`.
 * @param params Object containing serializable viewer state parameters.
 * Also includes a `collectionParam` field for the collection URL.
 */
export const serializeViewerState = (state: Partial<ViewerStoreSerializableState>): SerializedStoreData => {
  // Ordered by approximate importance in the URL
  return removeUndefinedProperties({
    ...serializeCollectionSlice(state),
    ...serializeDatasetSlice(state),
    ...serializeTimeSlice(state),
    ...serializeColorRampSlice(state),
    ...serializeThresholdSlice(state),
    ...serializeConfigSlice(state),
    ...serializeScatterPlotSlice(state),
    ...serializeBackdropSlice(state),
    ...serializeVectorSlice(state),
    ...serializeChannelSlice(state),
  });
};

export type ViewerParams = {
  /**
   * Optional URL of the collection resource to load. Overwrites the URL of the
   * `collection` field in the serialized store data if defined.
   */
  collectionParam?: string;
  /**
   * Optional URL of the dataset or dataset key. Overwrites the
   * `dataset` field in the serialized store data if defined.
   */
  datasetParam?: string;
} & Partial<ViewerStoreSerializableState>;

/**
 * Serializes parameters for the viewer into a `SerializedStoreData` object,
 * which can be used to generate a URL query string using `serializedDataToUrl`.
 * @param params Object containing serializable viewer state parameters; see
 * `ViewerStoreSerializableState` for a list of possible fields.
 */
export const serializeViewerParams = (params: ViewerParams): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (params.collectionParam) {
    ret[UrlParam.COLLECTION] = params.collectionParam;
  }
  if (params.datasetParam) {
    ret[UrlParam.DATASET] = params.datasetParam;
  }
  return removeUndefinedProperties({
    // Order collection + dataset first in params, but override the default
    // serialized collection fields by destructuring a second time.
    ...ret,
    ...serializeViewerState(params),
    ...ret,
  });
};

/**
 * Converts a serialized store data object to a URL query string. Does not
 * include the `?` prefix.
 */
export const serializedDataToUrl = (data: SerializedStoreData): string => {
  const params = new URLSearchParams();
  data = removeUndefinedProperties(data);
  for (const [key, value] of Object.entries(data)) {
    // Value is always defined after removing undefined properties
    params.set(key, value!);
  }
  return params.toString();
};

// DESERIALIZATION ///////////////////////////////////////////////////////////////////////

/**
 * Loads only the viewer state that's not dependent on the dataset from the
 * given URL parameters.
 */
export const loadInitialViewerStateFromParams = (store: Store<ViewerStore>, params: URLSearchParams): void => {
  // Load only slices that do not depend on the dataset or collection
  loadConfigSliceFromParams(store.getState(), params);
};

/**
 * Loads the viewer state from the given URL parameters. Note that this MUST be
 * called after the collection and dataset are loaded and set in the store.
 */
export const loadViewerStateFromParams = (store: Store<ViewerStore>, params: URLSearchParams): void => {
  // TODO: Should each of these be wrapped in a try/catch block in case of bad inputs?
  // 1. No dependencies:
  // 2. Dependent on dataset object:
  loadBackdropSliceFromParams(store.getState(), params);
  loadDatasetSliceFromParams(store.getState(), params);
  loadScatterPlotSliceFromParams(store.getState(), params);
  loadThresholdSliceFromParams(store.getState(), params);
  loadVectorSliceFromParams(store.getState(), params);
  loadChannelSliceFromParams(store.getState(), params);
  loadChannelSliceFromParams(store.getState(), params);

  // 3. Dependent on dataset slice (track/backdrop/features):
  loadTimeSliceFromParams(store.getState(), params);

  // 4. Dependent on dataset + threshold slices:
  loadColorRampSliceFromParams(store.getState(), params);
};
