import { DEFAULT_COLLECTION_FILENAME, DEFAULT_DATASET_FILENAME } from "../constants";
import { LoadErrorMessage, LoadTroubleshooting, ReportWarningCallback } from "./types";
import { AnalyticsEvent, triggerAnalyticsEvent } from "./utils/analytics";
import {
  CollectionEntry,
  CollectionFile,
  CollectionFileMetadata,
  updateCollectionVersion,
} from "./utils/collection_utils";
import { formatAsBulletList, uncapitalizeFirstLetter } from "./utils/data_utils";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchManifestJson,
  fetchWithTimeout,
  formatPath,
  isJson,
  isUrl,
} from "./utils/url_utils";

import Dataset from "./Dataset";
import { FilePathResolver, IPathResolver, UrlPathResolver } from "./loaders/FileSystemResolver";
import { IArrayLoader, ITextureImageLoader } from "./loaders/ILoader";

export type CollectionData = Map<string, CollectionEntry>;

export type DatasetLoadResult =
  | {
      loaded: false;
      dataset: null;
      errorMessage?: string;
    }
  | {
      loaded: true;
      dataset: Dataset;
    };

export type CollectionLoadOptions = {
  pathResolver?: IPathResolver;
  fetchMethod?: typeof fetchWithTimeout;
  reportWarning?: ReportWarningCallback;
};

export type DatasetLoadOptions = {
  manifestLoader?: typeof fetchManifestJson;
  onLoadProgress?: (complete: number, total: number) => void;
  arrayLoader?: IArrayLoader;
  frameLoader?: ITextureImageLoader;
  reportWarning?: ReportWarningCallback;
};

/**
 * Collections describe a group of datasets, designated with a string name and a path.
 * The class is a wrapper around a simple map, with convenience functions for getting dataset
 * information and paths.
 */
export default class Collection {
  private pathResolver: IPathResolver;
  private entries: CollectionData;
  public metadata: Partial<CollectionFileMetadata>;
  /**
   * The URL this Collection was loaded from. `null` if this Collection is a placeholder object,
   * such as when generating dummy Collections for single datasets.
   */
  public readonly url: string | null;

  /**
   * Constructs a new Collection from a CollectionData map.
   * @param entries A map from string keys to CollectionEntry objects. The `path` of all
   * entries MUST be the absolute path to the manifest JSON file of the dataset.
   * @param url the optional string url representing the source of the Collection. `null` by default.
   * @throws an error if a `path` is not a URL to a JSON resource.
   */
  constructor(
    entries: CollectionData,
    url: string | null = null,
    metadata: Partial<CollectionFileMetadata> = {},
    pathResolver?: IPathResolver
  ) {
    this.pathResolver = pathResolver || new UrlPathResolver();

    this.entries = entries;
    this.url = url ? Collection.formatAbsoluteCollectionPath(url) : url;
    this.metadata = metadata;
    console.log("Collection metadata: ", this.metadata);

    // Check that all entry paths are JSON urls.
    this.entries.forEach((value, key) => {
      // if (!isJson(value.path)) {
      //   throw new Error(
      //     `Expected dataset '${key}' to have an absolute JSON path; Collection was provided path '${value.path}'.`
      //   );
      // }
      // if (!isUrl(value.path)) {
      //   throw new Error(`Expected dataset '${key}' to have a URL path; Collection was provided path '${value.path}'.`);
      // }
    });
  }

  /**
   * Gets the absolute path of a dataset JSON.
   * @param datasetKey string key of the dataset.
   * @throws an error if the dataset key is not in this dataset.
   * @returns the absolute URL path to the manifest file of the dataset.
   */
  public getAbsoluteDatasetPath(datasetKey: string): string {
    if (this.hasDataset(datasetKey)) {
      return this.entries.get(datasetKey)!.path;
    }
    throw new Error(`Collection does not contain dataset ${datasetKey}. Could not get path.`);
  }

  /**
   * Gets the name of the dataset.
   * @param datasetKey string key of the dataset.
   * @throws an error if the dataset key is not in this dataset.
   * @returns the string name of the dataset.
   */
  public getDatasetName(datasetKey: string): string {
    if (this.hasDataset(datasetKey)) {
      return this.entries.get(datasetKey)!.name;
    }
    throw new Error(`Collection does not contain dataset ${datasetKey}. Could not get name.`);
  }

  public hasDataset(datasetKey: string): boolean {
    return this.entries.has(datasetKey);
  }

  /**
   * Gets the valid keys for datasets in this collection.
   * @returns an array of strings, where each string is a key of a dataset in the collection.
   */
  public getDatasetKeys(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Gets the key of the first dataset in the collection.
   * @param collectionData the loaded collection data to get data from.
   * @throws an error if the collection data is size 0.
   * @returns the string key of the first entry in the `collectionData` map.
   */
  public getDefaultDatasetKey(): string {
    if (this.entries.size === 0) {
      throw new Error("Cannot get default dataset for a collection with size 0.");
    }
    return Array.from(this.entries.keys())[0];
  }

  /**
   * Attempts to load and return the dataset specified by the key.
   * @param datasetKey string key of the dataset.
   * @param options Optional configuration, containing any of the following properties:
   *  - `onLoadProgress` optional callback for loading progress.
   *  - `arrayLoader` optional array loader to use for loading the dataset.
   *  - `reportWarning` optional callback for reporting warning messages during loading (potential errors
   * that are non-blocking).
   * @returns A promise of a `DatasetLoadResult`.
   * - On a success, returns an object with a Dataset `dataset` and the `loaded` flag set to true.
   * - On a failure, returns an object with a null `dataset` and `loaded` set to false, as well as
   * an optional string `errorMessage`.
   *
   * See `DatasetLoadResult` for more details.
   */
  public async tryLoadDataset(datasetKey: string, options: DatasetLoadOptions = {}): Promise<DatasetLoadResult> {
    console.time("loadDataset");

    if (!this.hasDataset(datasetKey)) {
      return { loaded: false, dataset: null, errorMessage: `Error: Collection does not have key ${datasetKey}.` };
    }
    const path = this.getAbsoluteDatasetPath(datasetKey);
    console.log(`Fetching dataset from path '${path}'`);

    let totalLoadItems = 0;
    let completedLoadItems = 0;
    const onLoadStart = (): void => {
      totalLoadItems++;
    };
    const onLoadComplete = (): void => {
      completedLoadItems++;
      options.onLoadProgress?.(completedLoadItems, totalLoadItems);
    };

    try {
      const dataset = new Dataset(path, {
        pathResolver: this.pathResolver,
        frameLoader: options.frameLoader,
        arrayLoader: options.arrayLoader,
      });
      await dataset.open({
        onLoadStart,
        onLoadComplete,
        reportWarning: options.reportWarning,
        manifestLoader: options.manifestLoader,
      });
      console.timeEnd("loadDataset");
      return { loaded: true, dataset: dataset };
    } catch (e) {
      console.timeEnd("loadDataset");
      console.error(e);
      if (e instanceof Error) {
        return {
          loaded: false,
          dataset: null,
          errorMessage: e.message,
        };
      } else {
        return { loaded: false, dataset: null };
      }
    }
  }

  // ===================================================================================
  // Helper Methods

  private static formatDatasetPath(datasetPath: string): string {
    datasetPath = formatPath(datasetPath);
    // if (!isUrl(datasetPath)) {
    //   throw new Error(`Cannot fetch dataset '${datasetPath}' because it is not a URL.`);
    // }
    return isJson(datasetPath) ? datasetPath : datasetPath + "/" + DEFAULT_DATASET_FILENAME;
  }

  /**
   * Formats a URL of a collections path as an absolute path to a possible JSON collection file.
   * @param collectionUrl the URL to format.
   * @returns A formatted string path to a possible JSON file, with no trailing slashes or whitespace padding.
   * If the input `collectionUrl` did not specify a JSON file, appends the default collection filename
   * (`DEFAULT_COLLECTION_FILENAME`).
   */
  public static formatAbsoluteCollectionPath(collectionUrl: string): string {
    collectionUrl = formatPath(collectionUrl);
    return isJson(collectionUrl) ? collectionUrl : collectionUrl + "/" + DEFAULT_COLLECTION_FILENAME;
  }

  /**
   * Formats a URL of a dataset path as an absolute path to a possible JSON manifest file.
   * @param collectionUrl the URL of the collections resource.
   * @param datasetPath path of the dataset. Can be a relative path or a URL.
   * @returns a formatted string path to a possible JSON manifest file, with no trailing slashes or whitespace padding.
   * Includes the default dataset filename (`DEFAULT_DATASET_FILENAME`) if no specific file is described.
   * - If datasetPath describes a URL, returns the URL path.
   * - If datasetPath describes a relative path, returns the absolute URL path using the collectionUrl's base directory.
   */
  public static formatAbsoluteDatasetPath(collectionUrl: string, datasetPath: string): string {
    datasetPath = formatPath(datasetPath);

    // Dataset path is a URL, so we just apply formatting and the default filename if needed.
    if (isUrl(datasetPath)) {
      return Collection.formatDatasetPath(datasetPath);
    }

    // Dataset is a relative path; strip out the filename from the collection path to get just the directory URL
    collectionUrl = Collection.formatAbsoluteCollectionPath(collectionUrl);
    const collectionDirectory = formatPath(collectionUrl.substring(0, collectionUrl.lastIndexOf("/")));
    return this.formatDatasetPath(collectionDirectory + "/" + datasetPath);
  }

  // TODO: Refactor how dummy collections store URLs? The URL should always be a valid resource maybe?
  /**
   * Returns a URL to the collection or dataset.
   */
  public getUrl(): string {
    if (this.url === null) {
      return this.entries.get(this.getDefaultDatasetKey())!.path;
    }
    return this.url;
  }

  // ===================================================================================
  // Static Loader Methods

  private static checkForDuplicateDatasetNames(
    datasets: CollectionEntry[],
    reportWarning?: ReportWarningCallback
  ): void {
    const collectionData: Map<string, CollectionEntry> = new Map();
    const duplicateDatasetNames = new Set<string>();

    for (const entry of datasets) {
      if (collectionData.has(entry.name)) {
        duplicateDatasetNames.add(entry.name);
        console.warn(`Duplicate dataset name ${entry.name} found in collection JSON; skipping.`);
      }
      collectionData.set(entry.name, entry);
    }

    if (duplicateDatasetNames.size > 0) {
      reportWarning?.("Duplicate dataset names were found in the collection.", [
        "The following dataset(s) had duplicate names and were skipped when loading the collection:",
        ...formatAsBulletList(Array.from(duplicateDatasetNames), 5),
        "If you are the dataset author, please ensure that every dataset has a unique name in the collection.",
      ]);
    }
  }

  /**
   * Asynchronously loads a Collection object from the provided URL.
   * @param collectionParam The URL of the resource. This can either be a direct path to
   * collection JSON file or the path of a directory containing `collection.json`.
   * @param options Optional configuration, containing any of the following properties:
   * - `fetchMethod` optional override for the fetch method, used to retrieve the URL.
   * - `reportWarning` optional callback for reporting warning messages during loading.
   * @throws Error if the JSON could not be retrieved or is an unrecognized format.
   * @returns A new Collection object containing the retrieved data.
   */
  public static async loadCollection(
    collectionParam: string,
    options: CollectionLoadOptions = {}
  ): Promise<Collection> {
    const absoluteCollectionUrl = Collection.formatAbsoluteCollectionPath(collectionParam);
    const fetchMethod = options.fetchMethod ?? fetchWithTimeout;
    const pathResolver = options.pathResolver ?? new UrlPathResolver();

    let response;
    try {
      response = await fetchMethod(pathResolver.resolve("", absoluteCollectionUrl)!, DEFAULT_FETCH_TIMEOUT_MS);
    } catch (e) {
      throw new Error(LoadErrorMessage.UNREACHABLE_COLLECTION + " " + LoadTroubleshooting.CHECK_NETWORK);
    }
    if (!response.ok) {
      throw new Error(
        `Received a ${response.status} (${response.statusText}) code from the server while retrieving` +
          ` collections JSON from url '${absoluteCollectionUrl}'. ${LoadTroubleshooting.CHECK_FILE_EXISTS}`
      );
    }

    let collection: CollectionFile;
    try {
      const json = await response.json();
      collection = updateCollectionVersion(json);
    } catch (e) {
      throw new Error(LoadErrorMessage.COLLECTION_JSON_PARSE_FAILED + e);
    }

    // Convert JSON array into map
    if (!collection.datasets || collection.datasets.length === 0) {
      throw new Error(LoadErrorMessage.COLLECTION_HAS_NO_DATASETS);
    }
    const collectionData: Map<string, CollectionEntry> = new Map();
    for (const entry of collection.datasets) {
      const newEntry = entry;
      newEntry.path = this.formatAbsoluteDatasetPath(absoluteCollectionUrl, entry.path);
      collectionData.set(entry.name, newEntry);
    }
    Collection.checkForDuplicateDatasetNames(collection.datasets, options.reportWarning);

    triggerAnalyticsEvent(AnalyticsEvent.COLLECTION_LOAD, {
      collectionWriterVersion: collection.metadata?.writerVersion || "N/A",
    });

    return new Collection(collectionData, absoluteCollectionUrl, collection.metadata, pathResolver);
  }

  /**
   * Generates a dummy collection for a single URL collection.
   * @param datasetUrl The URL of the dataset.
   * @returns a new Collection, where the only dataset is that of the provided `datasetUrl`.
   * The `url` field of the Collection will also be set to `null`.
   */
  public static makeCollectionFromSingleDataset(
    datasetUrl: string,
    pathResolver: IPathResolver = new UrlPathResolver()
  ): Collection {
    // Add the default filename if the url is not a .JSON path.
    if (!isJson(datasetUrl)) {
      datasetUrl = formatPath(formatPath(datasetUrl) + "/" + DEFAULT_DATASET_FILENAME);
    }
    const collectionData: CollectionData = new Map([[datasetUrl, { path: datasetUrl, name: datasetUrl }]]);

    // TODO: Should the dummy collection copy the dataset's metadata?
    return new Collection(collectionData, null, {}, pathResolver);
  }

  /**
   * Merges and formats error messages from a failed collection and dataset load.
   */
  private static formatLoadingError(url: string, collectionLoadError: Error, datasetLoadError: Error): Error {
    if (url.endsWith(DEFAULT_COLLECTION_FILENAME)) {
      // Assume that this was a collection because the URL ended with "collection.json."
      return collectionLoadError;
    } else if (url.endsWith(DEFAULT_DATASET_FILENAME)) {
      // Assume that this was a dataset because the URL ended with "dataset.json."
      return datasetLoadError;
    } else if (
      collectionLoadError.message.startsWith(LoadErrorMessage.UNREACHABLE_COLLECTION) &&
      datasetLoadError.message.includes(LoadErrorMessage.UNREACHABLE_MANIFEST)
    ) {
      // Handle TypeError from failed fetch, likely due to server being unreachable.
      return new Error(LoadErrorMessage.BOTH_UNREACHABLE + " " + LoadTroubleshooting.CHECK_NETWORK);
    } else if (
      // Merge 404 errors from both collection and dataset fetches
      collectionLoadError.message.includes("404 (Not Found)") &&
      datasetLoadError.message.includes("404 (Not Found)")
    ) {
      return new Error(LoadErrorMessage.BOTH_404);
    } else {
      // Format and return a message containing both errors.
      console.error(`URL '${url}' could not be loaded as a collection or dataset.`);
      const collectionMessage =
        uncapitalizeFirstLetter(collectionLoadError?.message) ||
        "(no error message provided; this is likely a bug and should be reported)";
      const datasetMessage =
        uncapitalizeFirstLetter(datasetLoadError?.message) ||
        "(no error message provided; this is likely a bug and should be reported)";

      return new Error(
        `Could not load the provided URL as either a collection or a dataset.
        \n- If this is a collection, ${collectionMessage}
        \n- If this is a dataset, ${datasetMessage}`
      );
    }
  }

  /**
   * Attempt to load an ambiguous URL as either a collection or dataset, and return a new
   * Collection representing its contents (either the loaded collection or a dummy collection
   * containing just the dataset).
   * @param url the URL resource to attempt to load.
   * @param options optional configuration object containing any of the following properties:
   *  - `fetchMethod` optional override for the fetch method.
   *  - `reportWarning` optional callback for reporting warning messages during loading.
   * @throws an error if `url` is not a URL.
   * @returns a Promise of a new Collection object, either loaded from a collection JSON file or
   * generated as a wrapper around a single dataset.
   */
  public static async loadFromAmbiguousUrl(url: string, options: CollectionLoadOptions = {}): Promise<Collection> {
    // TODO: Also handle Nucmorph URLs that are pasted in? If website base URL matches, redirect?

    if (!isUrl(url)) {
      throw new Error(`Provided resource '${url}' is not a URL and cannot be loaded.`);
    }

    let result: Collection | null = null;
    let collectionLoadError: Error | null = null;
    let datasetLoadError: Error | null = null;

    // Try loading as a collection
    try {
      result = await Collection.loadCollection(url, options);
    } catch (e) {
      collectionLoadError = e as Error;
      console.warn(e);
      console.log("URL resource could not be parsed as a collection; attempting to make a single-database collection.");
    }

    // Could not load as a collection, attempt to load as a dataset.
    if (!result) {
      try {
        const collection = Collection.makeCollectionFromSingleDataset(url);
        // Attempt to load the default dataset immediately to surface any loading errors.
        const loadResult = await collection.tryLoadDataset(collection.getDefaultDatasetKey());
        if (!loadResult.loaded) {
          throw new Error(loadResult.errorMessage);
        }
        return collection;
      } catch (e) {
        datasetLoadError = e as Error;
      }
    }

    if (!result) {
      throw Collection.formatLoadingError(url, collectionLoadError!, datasetLoadError!);
    }

    return result;
  }

  //
  public static async loadCollectionFromFile(folderName: string, fileMap: Record<string, File>): Promise<Collection> {
    const collectionFilePath = DEFAULT_COLLECTION_FILENAME;
    const filePathResolver = new FilePathResolver(fileMap);

    try {
      return await Collection.loadCollection(collectionFilePath, { pathResolver: filePathResolver });
    } catch (e) {
      console.error(e);
    }

    return await Collection.makeCollectionFromSingleDataset("", filePathResolver);
  }
}
