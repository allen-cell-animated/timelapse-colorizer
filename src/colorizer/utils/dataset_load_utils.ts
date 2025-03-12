import { LocationState } from "../../types";
import { ReportErrorCallback, ReportLoadProgressCallback, ReportWarningCallback } from "../types";
import { isUrl, UrlParam } from "./url_utils";

import Collection, { CollectionLoadOptions, DatasetLoadOptions } from "../Collection";
import Dataset from "../Dataset";
import { IArrayLoader } from "../loaders/ILoader";

// DESERIALIZATION ///////////////////////////////////////////////////////////////////////

const enum LoadResultType {
  SUCCESS,
  LOAD_ERROR,
  MISSING_DATASET,
}

type LoadResult<T> =
  | { type: LoadResultType.SUCCESS; value: T; warnings?: { message: string; description?: string | string[] }[] }
  | { type: LoadResultType.LOAD_ERROR; message: string }
  | { type: LoadResultType.MISSING_DATASET };

export type DatasetLoadOverrides = {
  datasetKey?: string;
  collection?: Collection;
};

export const loadCollectionFromParams = async (
  collectionParam: string | null,
  datasetParam: string | null,
  collectionLoadOptions: CollectionLoadOptions = {}
): Promise<LoadResult<Collection>> => {
  // There are three ways data can be provided:
  // 1. Collection URL and dataset key
  // 2. Collection URL only (use default dataset)
  // 3. Dataset URL only

  let collection: Collection;
  if (collectionParam) {
    // 1. Collection URL and dataset key
    // 2. Collection URL only (use default dataset)
    try {
      collection = await Collection.loadCollection(collectionParam, collectionLoadOptions);
      // Use default dataset if no dataset key is provided
    } catch (error) {
      // Error loading collection
      console.error(error);
      return { type: LoadResultType.LOAD_ERROR, message: (error as Error).message };
    }
  } else if (datasetParam !== null && isUrl(datasetParam)) {
    // 3. Dataset URL only
    // Make a dummy collection that will include only this dataset
    collection = await Collection.makeCollectionFromSingleDataset(datasetParam);
  } else {
    console.error("No collection URL or dataset URL provided.");
    return { type: LoadResultType.MISSING_DATASET };
  }
  return { type: LoadResultType.SUCCESS, value: collection };
};

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
    console.error(datasetResult.errorMessage);
    return {
      type: LoadResultType.LOAD_ERROR,
      message: datasetResult.errorMessage || "Encountered unknown error while loading dataset.",
    };
  }
  return { type: LoadResultType.SUCCESS, value: { dataset: datasetResult.dataset, datasetKey } };
};

export const loadInitialCollectionAndDataset = async (
  location: Partial<LocationState>,
  params: URLSearchParams,
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
  const datasetParam = params.get(UrlParam.DATASET);

  let collection: Collection;
  if (location.collection && location.datasetKey !== undefined) {
    collection = location.collection;
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
