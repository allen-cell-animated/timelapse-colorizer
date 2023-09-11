import { DEFAULT_COLLECTION_FILENAME, DEFAULT_DATASET_FILENAME } from "../constants";
import Dataset from "./Dataset";
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout, formatPath, isJson, isUrl } from "./utils/url_utils";

/**
 * Dataset properties in a collection. Collections are defined as .json files containing an array of objects
 * with the following properties:
 *
 * - `path`: a relative path from the base directory of the collection URL, or a URL to a dataset.
 * - `name`: the display name for the dataset.
 */
export type CollectionEntry = {
  path: string;
  name: string;
};
export type CollectionData = Map<string, CollectionEntry>;

/**
 * Collections describe a group of datasets, designated with a string name and a path.
 * The class is a wrapper around a simple map, with convenience functions for getting dataset
 * information and paths.
 */
export default class Collection {
  private entries: CollectionData;
  /**
   * The URL this Collection was loaded from. `null` if this Collection is a placeholder object,
   * such as when generating dummy Collections for single datasets.
   */
  public readonly url: string | null;

  /**
   * Constructs a new Collection from a CollectionData map.
   * @param entries A map from string keys to CollectionEntry objects. The `path` of all
   * entries must be the absolute path to the manifest JSON file of the dataset.
   * @param url the optional string url representing the source of the Collection. `null` by default.
   * @throws an error if a `path` is not a URL to a JSON resource.
   */
  constructor(entries: CollectionData, url: string | null = null) {
    this.entries = entries;
    this.url = url;

    // Check that all entry paths are JSON urls.
    this.entries.forEach((value, key) => {
      if (!isJson(value.path)) {
        throw new Error(
          `Expected dataset '${key}' to have an absolute JSON path; Collection was provided path '${value.path}'.`
        );
      }
      if (!isUrl(value.path)) {
        throw new Error(`Expected dataset '${key}' to have a URL path; Collection was provided path '${value.path}'.`);
      }
    });
  }

  /**
   * Gets the absolute path of a dataset JSON.
   * @param datasetKey string key of the dataset.
   * @throws an error if the dataset key is not in this dataset.
   * @returns the absolute URL path to the manifest file of the dataset.
   */
  public getDatasetPath(datasetKey: string): string {
    if (this.hasDataset(datasetKey)) {
      return this.entries.get(datasetKey)!.path;
    }
    throw new Error(`Collection does not contain dataset ${datasetKey}: Could not get path.`);
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
    throw new Error(`Collection does not contain dataset ${datasetKey}: Could not get name.`);
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
  public getDefaultDataset(): string {
    if (this.entries.size === 0) {
      throw new Error("Cannot get default dataset for a collection with size 0.");
    }
    return Array.from(this.entries.keys())[0];
  }

  /**
   * Attempts to load and return the dataset specified by the key.
   * @param datasetKey string key of the dataset.
   * @throws an error if there is no dataset matching `datasetKey`.
   * @returns A Promise of a Dataset object. If the dataset fails to load, the promise will reject.
   */
  public async tryLoadDataset(datasetKey: string): Promise<Dataset> {
    if (!this.hasDataset(datasetKey)) {
      throw new Error(`Dataset '${datasetKey}' could not be found in this collection.`);
    }
    const path = this.getDatasetPath(datasetKey);
    console.log(`Fetching dataset from path '${path}'`);
    // TODO: Override fetch method
    const dataset = new Dataset(path);
    await dataset.open();
    return dataset;
  }

  // ===================================================================================
  // Helper Methods

  private static formatDatasetPath(datasetPath: string): string {
    datasetPath = formatPath(datasetPath);
    if (!isUrl(datasetPath)) {
      throw new Error(`Cannot fetch dataset '${datasetPath}' because it is not a URL.`);
    }
    return isJson(datasetPath) ? datasetPath : datasetPath + "/" + DEFAULT_DATASET_FILENAME;
  }

  private static getAbsoluteCollectionPath(collectionUrl: string): string {
    collectionUrl = formatPath(collectionUrl);
    return isJson(collectionUrl) ? collectionUrl : collectionUrl + "/" + DEFAULT_COLLECTION_FILENAME;
  }

  private static getAbsoluteDatasetPath(collectionUrl: string, datasetPath: string): string {
    datasetPath = formatPath(datasetPath);

    // Dataset path is a URL, so we just apply formatting and the default filename if needed.
    if (isUrl(datasetPath)) {
      return Collection.formatDatasetPath(datasetPath);
    }

    // Dataset is a relative path; strip out the filename from the collection path to get just the directory URL
    collectionUrl = Collection.getAbsoluteCollectionPath(collectionUrl);
    const collectionDirectory = formatPath(collectionUrl.substring(0, collectionUrl.lastIndexOf("/")));
    return this.formatDatasetPath(collectionDirectory + "/" + datasetPath);
  }

  // ===================================================================================
  // Static Loader Methods

  /**
   * Asynchronously loads a Collection object from the provided URL.
   * @param collectionParam The URL of the resource. This can either be a direct path to
   * collection JSON file or the path of a directory containing `collection.json`.
   * @param fetchMethod Optional. The fetch command used to retrieve the URL.
   * @throws Error if the JSON could not be retrieved or is an unrecognized format.
   * @returns A new Collection object containing the retrieved data.
   */
  public static async loadCollection(collectionParam: string, fetchMethod = fetchWithTimeout): Promise<Collection> {
    const absoluteCollectionUrl = Collection.getAbsoluteCollectionPath(collectionParam);

    let response;
    try {
      response = await fetchMethod(absoluteCollectionUrl, DEFAULT_FETCH_TIMEOUT_MS);
    } catch (e) {
      console.error(`Could not retrieve collections JSON data from url '${absoluteCollectionUrl}': '${e}'`);
      throw e;
    }
    if (!response.ok) {
      throw new Error(`Could not retrieve collections JSON data from url '${absoluteCollectionUrl}': Fetch failed.`);
    }

    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error(
        `Could not retrieve collections JSON data from url '${absoluteCollectionUrl}': JSON is not an array.`
      );
    }

    // Convert JSON array into map
    const collectionData: Map<string, CollectionEntry> = new Map();
    for (const entry of json) {
      collectionData.set(entry.name, entry);
    }

    // Convert paths to absolute paths
    collectionData.forEach((entry, key) => {
      const newEntry = entry;
      newEntry.path = this.getAbsoluteDatasetPath(absoluteCollectionUrl, entry.path);
      collectionData.set(key, newEntry);
    });

    return new Collection(collectionData, absoluteCollectionUrl);
  }

  /**
   * Generates a dummy collection for a single URL collection.
   * @param datasetUrl The URL of the dataset.
   * @returns a new Collection, where the only dataset is that of the provided `datasetUrl`.
   * The `url` field of the Collection will also be set to `null`.
   */
  public static makeCollectionFromSingleDataset(datasetUrl: string): Collection {
    // Add the default filename if the url is not a .JSON path.
    if (!isJson(datasetUrl)) {
      datasetUrl = formatPath(datasetUrl) + "/" + DEFAULT_DATASET_FILENAME;
    }
    const collectionData: CollectionData = new Map([[datasetUrl, { path: datasetUrl, name: datasetUrl }]]);

    return new Collection(collectionData, null);
  }

  /**
   * Attempt to load an ambiguous URL as either a collection or dataset, and return a new
   * Collection representing its contents (either the loaded collection or a dummy collection
   * containing just the dataset).
   * @param url the URL resource to attempt to load.
   * @param fetchMethod optional override for the fetch method.
   * @throws an error if `url` is not a URL.
   * @returns a Promise of a new Collection object, either loaded from a collection JSON file or
   * generated as a wrapper around a single dataset.
   */
  public static async loadFromAmbiguousUrl(url: string, fetchMethod = fetchWithTimeout): Promise<Collection> {
    // TODO: Also handle Nucmorph URLs that are pasted in? If website base URL matches, redirect?

    if (!isUrl(url)) {
      throw new Error(`Provided resource '${url}' is not a URL and cannot be loaded.`);
    }

    try {
      return await Collection.loadCollection(url, fetchMethod);
    } catch (e) {
      console.log("URL resource could not be parsed as a collection; attempting to make a single-database collection.");
    }

    // Could not load as a collection, attempt to load as a daataset.
    return await Collection.makeCollectionFromSingleDataset(url);
  }

  // Needs to return URL for parameters (dataset URL + collection URL) + collection object? idk
  // Load dataset by name => returns actual dataset that was loaded?
}
