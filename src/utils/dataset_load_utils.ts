import { ReportErrorCallback, ReportLoadProgressCallback, ReportWarningCallback } from "../colorizer/types";
import { isUrl, UrlParam } from "../colorizer/utils/url_utils";
import { LocationState } from "../types";

import Collection, { CollectionLoadOptions, DatasetLoadOptions } from "../colorizer/Collection";
import Dataset from "../colorizer/Dataset";
import { IArrayLoader } from "../colorizer/loaders/ILoader";

export const enum LoadResultType {
  SUCCESS,
  LOAD_ERROR,
  MISSING_DATASET,
}

type LoadResult<T> =
  | { type: LoadResultType.SUCCESS; value: T }
  | { type: LoadResultType.LOAD_ERROR; message: string }
  | { type: LoadResultType.MISSING_DATASET };

/**
 * Loads a collection from a provided collection URL and/or dataset URL.
 * @param collectionParam The URL of the collection. If `null`, the
 * `datasetParam` must be provided as a URL.
 * @param datasetParam The URL or key of the dataset. If `null` and a
 * `collectionParam` is provided, the default dataset in the collection will be
 * loaded.
 * @param collectionLoadOptions Options for loading the collection, containing
 * the following properties:
 * - `fetchMethod`: The method to use for fetching the collection. Default is
 *   `fetchWithTimeout`.
 * - `reportWarning`: Callback to report warnings to the user.
 * @returns A promise that resolves to a `LoadResult`.
 */
export const loadCollectionFromParams = async (
  collectionParam: string | null,
  datasetParam: string | null,
  collectionLoadOptions: CollectionLoadOptions = {}
): Promise<LoadResult<Collection>> => {
  // There are two ways data can be provided:
  // 1. Collection URL and optional dataset key
  // 2. Dataset URL only

  let collection: Collection;
  if (collectionParam) {
    // 1. Collection URL and dataset key
    try {
      collection = await Collection.loadCollection(collectionParam, collectionLoadOptions);
    } catch (error) {
      // Error loading collection
      console.error("loadCollectionFromParams: ", error);
      return { type: LoadResultType.LOAD_ERROR, message: (error as Error).message };
    }
  } else if (datasetParam !== null && isUrl(datasetParam)) {
    // 2. Dataset URL only
    // Make a dummy collection that will include only this dataset
    collection = await Collection.makeCollectionFromSingleDataset(datasetParam);
  } else {
    console.error("No collection URL or dataset URL provided.");
    return { type: LoadResultType.MISSING_DATASET };
  }
  return { type: LoadResultType.SUCCESS, value: collection };
};

/**
 * Attempts to load a dataset from a collection based on the provided dataset
 * key. If the dataset key is not found in the collection, the default dataset
 * will be loaded.
 * @param collection The collection to load the dataset from.
 * @param datasetParam The dataset key to load.
 * @param datasetLoadOptions An object containing options for loading the
 * dataset, including the following properties:
 * - `arrayLoader`: The array loader to use for loading the dataset.
 * - `onLoadProgress`: Callback to report load progress.
 * - `reportWarning`: Callback to report warnings to the user.
 * @returns A promise that resolves to a `LoadResult`.
 */
export const loadDatasetFromParams = async (
  collection: Collection,
  datasetParam: string | null,
  datasetLoadOptions: DatasetLoadOptions = {}
): Promise<LoadResult<{ dataset: Dataset; datasetKey: string }>> => {
  let datasetKey: string;
  if (datasetParam && collection.hasDataset(datasetParam)) {
    datasetKey = datasetParam;
  } else {
    datasetKey = collection.getDefaultDatasetKey();
  }

  const datasetResult = await collection.tryLoadDataset(datasetKey, datasetLoadOptions);

  if (!datasetResult.loaded) {
    return {
      type: LoadResultType.LOAD_ERROR,
      message: datasetResult.errorMessage || "Encountered unknown error while loading dataset.",
    };
  }
  return { type: LoadResultType.SUCCESS, value: { dataset: datasetResult.dataset, datasetKey } };
};

/**
 * Loads the initial collection and dataset based on the provided URL
 * parameters, with overrides.
 * @param params The URL search parameters to extract the collection and dataset
 * parameters from.
 * @param overrides An object with optional `collection` (a loaded Collection
 * object) and `datasetKey` properties. Typically, this is used to pass in an
 * already-loaded collection that was saved to the Location state (see
 * https://api.reactrouter.com/v7/interfaces/react_router.Location.html).
 * @param options An object containing options for loading the collection and
 * dataset, including the following properties:
 * - `collectionFetchMethod`: The method to use for fetching the collection.
 *   Default is `fetchWithTimeout`.
 * - `arrayLoader`: The array loader to use for loading the dataset.
 * - `onLoadProgress`: Callback to report load progress.
 * - `reportMissingDataset`: Callback to report that the dataset is missing.
 * - `reportWarning`: Callback to report warnings to the user.
 * - `reportLoadError`: Callback to report load errors to the user.
 * @returns A promise that resolves to an object containing the loaded
 * collection, dataset, and dataset key, or `null` if the collection or dataset
 * could not be loaded.
 */
export const loadInitialCollectionAndDataset = async (
  params: URLSearchParams,
  overrides: Partial<LocationState> | null,
  options: {
    collectionFetchMethod?: CollectionLoadOptions["fetchMethod"];
    arrayLoader?: IArrayLoader;
    onLoadProgress?: ReportLoadProgressCallback;
    reportMissingDataset?: () => void;
    reportWarning?: ReportWarningCallback;
    reportLoadError?: ReportErrorCallback;
  } = {}
): Promise<{ collection: Collection; dataset: Dataset; datasetKey: string } | null> => {
  // Load collection
  const collectionParam = params.get(UrlParam.COLLECTION);
  const datasetParam = overrides?.datasetKey ?? params.get(UrlParam.DATASET);

  let collection: Collection;
  if (overrides && overrides.collection) {
    // An already-loaded Collection object has been provided. Skip loading.
    collection = overrides.collection;
  } else {
    const collectionResult = await loadCollectionFromParams(collectionParam, datasetParam, {
      fetchMethod: options.collectionFetchMethod,
      reportWarning: options.reportWarning,
    });
    if (collectionResult.type === LoadResultType.LOAD_ERROR) {
      options.reportLoadError?.(collectionResult.message);
      return null;
    } else if (collectionResult.type === LoadResultType.MISSING_DATASET) {
      options.reportMissingDataset?.();
      return null;
    }
    collection = collectionResult.value;
  }

  // Load dataset
  const datasetResult = await loadDatasetFromParams(collection, datasetParam, {
    arrayLoader: options.arrayLoader,
    onLoadProgress: options.onLoadProgress,
    reportWarning: options.reportWarning,
  });
  if (datasetResult.type === LoadResultType.LOAD_ERROR) {
    options.reportLoadError?.(datasetResult.message);
    return null;
  } else if (datasetResult.type === LoadResultType.MISSING_DATASET) {
    options.reportMissingDataset?.();
    return null;
  }

  return { collection, dataset: datasetResult.value.dataset, datasetKey: datasetResult.value.datasetKey };
};
