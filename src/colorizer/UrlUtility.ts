const URL_PARAM_TRACK = "track";
const URL_PARAM_DATASET = "dataset";
const URL_PARAM_FEATURE = "feature";
const URL_PARAM_TIME = "t";
const URL_PARAM_COLLECTION = "collection";

export const DEFAULT_DATASET_PATH = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";
export const DEFAULT_COLLECTION_PATH = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";

/**
 * Default name for the manifest JSON, which provides relative filepaths
 * to the elements (frames, feature data, centroids, etc.) of this dataset.
 */
export const DEFAULT_MANIFEST_NAME = "manifest.json";
/**
 * Default name for a collection descriptor JSON, which provides relative
 * filepaths to one or more datasets.
 */
export const DEFAULT_COLLECTION_FILENAME = "collection.json";

type LoadedUrlParams = {
  collection: string | null;
  dataset: string | null;
  feature: string | null;
  track: number;
  time: number;
};

type CollectionEntry = {
  path: string;
  name: string;
};

export default class UrlUtility {
  /**
   * Updates the current URL path of the webpage. If any parameter value is null, it will not be
   * included. String are encoded via `encodeURIComponent()`.
   * @param collection string path to the collection. Null values will be ignored.
   * @param dataset string name or URL of the dataset. Null values will be ignored.
   * @param feature string name of the feature. Null values will be ignored.
   * @param track integer track number.
   * @param time integer frame number. Ignores values where `time <= 0`.
   */
  public static updateURL(
    collection: string | null,
    dataset: string | null,
    feature: string | null,
    track: number | null,
    time: number | null
  ): void {
    const params: string[] = [];
    // Get parameters, ignoring null/empty values
    if (collection) {
      params.push(`${URL_PARAM_COLLECTION}=${encodeURIComponent(collection)}`);
    }
    if (dataset) {
      params.push(`${URL_PARAM_DATASET}=${encodeURIComponent(dataset)}`);
    }
    if (feature) {
      params.push(`${URL_PARAM_FEATURE}=${encodeURIComponent(feature)}`);
    }
    if (track || track === 0) {
      params.push(`${URL_PARAM_TRACK}=${track}`);
    }
    if (time && time > 0) {
      // time = 0 is ignored because it's the default frame.
      params.push(`${URL_PARAM_TIME}=${time}`);
    }

    // If parameters present, join with URL syntax and push into the URL
    const paramString = params.length > 0 ? "?" + params.join("&") : "";
    // Use replaceState rather than pushState, because otherwise every frame will be a unique
    // URL in the browser history
    window.history.replaceState(null, document.title, paramString);
  }

  /**
   * Returns if a string is a URL where resources can be fetched from, rather than just a
   * string name.
   * @param input String to be checked.
   * @returns True if a string is a web resource (http(s)://) or an internal resource (//).
   */
  public static isUrl(input: string | null): boolean {
    // Check for strings that start with http(s):// or a double-slash (//).
    return input !== null && (/^http(s)*:\/\//.test(input) || /^\/\//.test(input));
  }

  /**
   * Decodes non-null strings using `decodeURIComponent()`, otherwise returns null.
   */
  private static decodeNullString(input: string | null): string | null {
    return input === null ? null : decodeURIComponent(input);
  }

  /**
   * Loads parameters from the current window URL.
   * @returns An object with a dataset, feature, track, and time parameters.
   * The dataset and feature parameters are null if no parameter was found in the URL, and the
   * track and time will have negative values (-1) if no parameter (or an invalid parameter) was found.
   */
  public static loadParamsFromUrl(): LoadedUrlParams {
    // Get params from URL and load, with default fallbacks.
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const base10Radix = 10; // required for parseInt
    const collectionParam = UrlUtility.decodeNullString(urlParams.get(URL_PARAM_COLLECTION));
    const datasetParam = UrlUtility.decodeNullString(urlParams.get(URL_PARAM_DATASET));
    const featureParam = UrlUtility.decodeNullString(urlParams.get(URL_PARAM_FEATURE));
    const trackParam = parseInt(urlParams.get(URL_PARAM_TRACK) || "-1", base10Radix);
    // This assumes there are no negative timestamps in the dataset
    const timeParam = parseInt(urlParams.get(URL_PARAM_TIME) || "-1", base10Radix);

    return {
      collection: collectionParam,
      dataset: datasetParam,
      feature: featureParam,
      track: trackParam,
      time: timeParam,
    };
  }

  /**
   * Gets the list of datasets within a provided collection.
   * @param collectionParam If collection is null, uses the default dataset location (`DEFAULT_DATASET_PATH`).
   * If collection includes a .json file suffix, attempts to read the URL directly as a collection JSON.
   * Otherwise, attempts to load the collection data using the default collection filename
   * (`DEFAULT_COLLECTION_NAME`, `collection.json`).
   * @returns a list of `CollectionEntry` objects. The list will empty if no data could be loaded.
   */
  public static async getCollectionData(collectionParam: string | null): Promise<CollectionEntry[]> {
    let collectionUrl = DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME;

    // If collection URL ends in a .json, use directly, otherwise append the default filename.
    if (collectionParam) {
      if (/.json$/.test(collectionParam)) {
        collectionUrl = collectionParam;
      } else {
        collectionUrl = collectionParam + "/" + DEFAULT_COLLECTION_FILENAME;
      }
    }

    const response = await fetch(collectionUrl);
    return await response.json();
  }
}
