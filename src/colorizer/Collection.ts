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

export default class Collection {
  private entries: CollectionData;

  /** TODO:
   *
   * @param entries
   * All entry paths must be absolute paths to the manifest JSON file of the dataset.
   */
  constructor(entries: CollectionData) {
    this.entries = entries;

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
   * @param datasetName
   * @throws
   * @returns the absolute URL path to the manifest file of the dataset.
   */
  public getDatasetPath(datasetName: string) {
    if (this.hasDataset(datasetName)) {
      return this.entries.get(datasetName)!.path;
    }
    throw new Error(`Collection does not contain dataset ${datasetName}: Could not get path.`);
  }

  public hasDataset(datasetName: string) {
    return this.entries.has(datasetName);
  }

  public getDatasetNames(): string[] {
    return Array.from(this.entries.values()).map((value) => {
      return value.name;
    });
  }

  /**
   * Gets the name of the first dataset in the collection.
   * @param collectionData The loaded collection data to get data from.
   * @throws an error if the collection data is size 0.
   * @returns The string key of the first entry in the `collectionData` map.
   */
  public getDefaultDatasetName(): string {
    if (this.entries.size === 0) {
      throw new Error("Cannot get default dataset for a collection with size 0.");
    }
    const firstKey = Array.from(this.entries.keys())[0];
    return this.entries.get(firstKey)!.name;
  }

  /**
   *
   * @param datasetName
   * @returns
   */
  public async tryLoadDataset(datasetName: string): Promise<Dataset> {
    if (!this.hasDataset(datasetName)) {
      throw new Error(`Dataset '${datasetName}' could not be found in this collection.`);
    }
    const path = this.getDatasetPath(datasetName);
    console.log(`Fetching dataset from path '${path}'`);
    // TODO: Override fetch method?
    let dataset = new Dataset(path);
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
    let collectionDirectory = formatPath(collectionUrl.substring(0, collectionUrl.lastIndexOf("/")));
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
    let absoluteCollectionUrl = Collection.getAbsoluteCollectionPath(collectionParam);

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

    return new Collection(collectionData);
  }

  /**
   * Generates a dummy collection for a single URL collection.
   * @param datasetUrl The URL of the dataset.
   * @returns a new Collection, where the only dataset is that of the provided `datasetUrl`.
   */
  public static makeCollectionFromSingleDataset(datasetUrl: string): Collection {
    // Add the default filename if the url is not a .JSON path.
    if (!isJson(datasetUrl)) {
      datasetUrl = formatPath(datasetUrl) + "/" + DEFAULT_DATASET_FILENAME;
    }
    const collectionData: CollectionData = new Map([[datasetUrl, { path: datasetUrl, name: datasetUrl }]]);

    return new Collection(collectionData);
  }

  /**
   * Attempt to load an ambiguous URL as either a collection or dataset, and return a new
   * Collection representing its contents (either the loaded collection or a dummy collection
   * containing just the dataset).
   * @param url
   */
  public static loadFromAmbiguousUrl(url: string, fetchMethod = fetchWithTimeout): Collection {
    // Attempt to parse the URL to both a dataset and a collection?

    if (!isUrl(url)) {
      throw new Error(`Provided resource '${url}' is not a URL and cannot be loaded.`);
    }
    throw new Error("Not yet implemented");
  }

  // Needs to return URL for parameters (dataset URL + collection URL) + collection object? idk
  // Load dataset by name => returns actual dataset that was loaded?
}
