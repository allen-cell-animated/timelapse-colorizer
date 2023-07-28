const URL_PARAM_TRACK = "track";
const URL_PARAM_DATASET = "dataset";
const URL_PARAM_FEATURE = "feature";
const URL_PARAM_TIME = "t";
const URL_PARAM_COLLECTION = "collection";

export const DEFAULT_COLLECTION_PATH = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/colorizer/data";
/**
 * Default name for a collection descriptor JSON, which provides relative
 * filepaths to one or more datasets.
 */
export const DEFAULT_COLLECTION_FILENAME = "collection.json";

/**
 * Default name for the manifest JSON, which provides relative filepaths
 * to the elements (frames, feature data, centroids, etc.) of this dataset.
 */
export const DEFAULT_DATASET_FILENAME = "manifest.json";

type UrlParams = {
  collection: string | null;
  dataset: string | null;
  feature: string | null;
  track: number;
  time: number;
};

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

export const DEFAULT_FETCH_TIMEOUT_MS = 5000;

/**
 * Initiates a fetch request with a given timeout, returning a promise that will reject if the timeout is reached.
 * @param url fetch request URL
 * @param timeoutMs timeout before the request should fail, in milliseconds. Defaults to `DEFAULT_FETCH_TIMEOUT_MS`.
 * @param options additional
 * @returns a Response promise, as returned by `fetch(url, options)`. The promise will reject if the timeout is exceeded.
 */
export function fetchWithTimeout(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
  options?: Object
): Promise<Response> {
  const controller = new AbortController();
  const signal = controller.signal;
  setTimeout(() => controller.abort, timeoutMs);
  return fetch(url, { signal: signal, ...options });
}

/**
 * Updates the current URL path of the webpage. If any parameter value is null, it will not be
 * included. String are encoded via `encodeURIComponent()`.
 * @param collection string path to the collection. Null values will be ignored.
 * @param dataset string name or URL of the dataset. Null values will be ignored.
 * @param feature string name of the feature. Null values will be ignored.
 * @param track integer track number.
 * @param time integer frame number. Ignores values where `time <= 0`.
 */
export function saveParamsToUrl(
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
export function isUrl(input: string | null): boolean {
  // Check for strings that start with http(s):// or a double-slash (//).
  return input !== null && (/^http(s)*:\/\//.test(input) || /^\/\//.test(input));
}

/**
 * Decodes strings using `decodeURIComponent`, handling null inputs.
 */
function safeDecodeString(input: string | null): string | null {
  return input === null ? null : decodeURIComponent(input);
}

function isJson(input: string): boolean {
  return /.json$/.test(input);
}

function getBaseUrl(input: string): string {
  return input.substring(0, input.lastIndexOf("/"));
}

/**
 * Removes trailing slashes and whitespace from a path or url string.
 * @param input the string to be formatted.
 * @returns the string, but with trailing slashes and whitespace at the beginning or end removed.
 */
export function formatPath(input: string): string {
  input = input.trim();
  if (input.charAt(input.length - 1) === "/") {
    input = input.slice(0, input.length - 1);
  }
  return input.trim();
}

/**
 * Loads parameters from the current window URL.
 * @returns An object with a dataset, feature, track, and time parameters.
 * The dataset and feature parameters are null if no parameter was found in the URL, and the
 * track and time will have negative values (-1) if no parameter (or an invalid parameter) was found.
 */
export function loadParamsFromUrl(): UrlParams {
  // Get params from URL and load, with default fallbacks.
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  const base10Radix = 10; // required for parseInt
  const collectionParam = safeDecodeString(urlParams.get(URL_PARAM_COLLECTION));
  const datasetParam = safeDecodeString(urlParams.get(URL_PARAM_DATASET));
  const featureParam = safeDecodeString(urlParams.get(URL_PARAM_FEATURE));
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
 * @param collectionParam If collection includes a .json file suffix, attempts to read the URL directly as a collection JSON.
 * Otherwise, attempts to load the collection data using the default collection filename
 * (`DEFAULT_COLLECTION_NAME`, `collection.json`).
 * If collection is null, uses the default dataset location (`DEFAULT_COLLECTION_PATH`).
 * @throws Throws an error if fetching the collection data fails.
 * @returns a map of string dataset names to their corresponding `CollectionEntry` objects.
 * The return value will be null if the fetch failed for any reason.
 */
export async function getCollectionData(collectionParam: string | null): Promise<Map<string, CollectionEntry>> {
  // If collection URL ends in a .json use it directly, otherwise append the default filename.
  let collectionUrl;
  if (collectionParam) {
    collectionParam = formatPath(collectionParam);
    collectionUrl = isJson(collectionParam) ? collectionParam : collectionParam + "/" + DEFAULT_COLLECTION_FILENAME;
  } else {
    collectionUrl = DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME;
  }

  let response;
  try {
    response = await fetchWithTimeout(collectionUrl, DEFAULT_FETCH_TIMEOUT_MS);
  } catch (e) {
    console.error(`Could not retrieve collections JSON data from url '${collectionUrl}': '${e}'`);
    throw e;
  }
  if (!response.ok) {
    throw new Error(`Could not retrieve collections JSON data from url '${collectionUrl}': Fetch failed.`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error(`Could not retrieve collections JSON data from url '${collectionUrl}': JSON is not an array.`);
  }

  // Convert JSON array into map
  const datasetNameToData: Map<string, CollectionEntry> = new Map();
  for (const entry of json) {
    datasetNameToData.set(entry.name, entry);
  }

  return datasetNameToData;
}

/**
 * Gets the path to the manifest JSON of a dataset.
 * @param datasetParam a string URL, either to a .json file or the directory of a `manifest.json` file.
 * @returns Returns a formatted version of `datasetParam` (no whitespace, trailing slashes removed) if
 * it is a path to a `.json` file; otherwise, appends the `DEFAULT_DATASET_FILENAME` to it.
 */
export function getDatasetPath(datasetParam: string): string {
  datasetParam = formatPath(datasetParam);
  if (!isUrl(datasetParam)) {
    throw new Error(`Cannot fetch dataset '${datasetParam}' because it is not a URL.`);
  }
  return isJson(datasetParam) ? datasetParam : datasetParam + "/" + DEFAULT_DATASET_FILENAME;
}

/**
 * Gets the name of the first dataset in the collection.
 * @param collectionData The loaded collection data to get data from.
 * @throws an error if the collection data is size 0.
 * @returns The string key of the first entry in the `collectionData` map.
 */
export function getDefaultDatasetName(collectionData: Map<string, CollectionEntry>): string {
  if (collectionData.size === 0) {
    throw new Error("Cannot get default dataset for a collection with size 0.");
  }
  const firstKey = Array.from(collectionData.keys())[0];
  return collectionData.get(firstKey)!.name;
}

/**
 * Gets a URL/path to the manifest JSON of a dataset, using a collection.
 * @param datasetParam A string dataset name.
 * @param collectionParam A string parameter describing either the directory of the collection or the path to
 * its `.json` collection file.
 * @param collectionData A map with string keys representing database names, mapping to their stored entry data.
 * (See `CollectionEntry`.)
 * @throws an error if `collectionData` is empty.
 * @returns A string url/path to a dataset JSON manifest file. If the dataset does not exist in the collection,
 * defaults to the first dataset in the collection.
 */
export function getDatasetPathFromCollection(
  datasetParam: string,
  collectionParam: string,
  collectionData: Map<string, CollectionEntry>
): string {
  // Collection must be a non-empty map.
  if (collectionData.size === 0) {
    throw new Error(
      `Cannot retrieve dataset '${datasetParam}' from collection ${collectionParam} because collection data is empty.`
    );
  }

  // collection param can either be a .json file or a directory URL, so get the base directory
  let collectionBasePath = isJson(collectionParam) ? getBaseUrl(collectionParam) : collectionParam;
  collectionBasePath = formatPath(collectionBasePath);

  // Dataset parameter is a name, so fetch the entry data (including relative path) from the collection metadata.
  let datasetEntry = datasetParam && collectionData.get(datasetParam);
  if (!datasetEntry) {
    // Can't find the dataset in the collection, so use the first dataset in the collection map
    const defaultDataset = getDefaultDatasetName(collectionData);
    datasetEntry = collectionData.get(defaultDataset)!;
    console.warn(
      `Couldn't find dataset '${datasetParam}' in collection at '${collectionBasePath}'. Defaulting to '${defaultDataset}'.`
    );
  }

  const datasetPath = formatPath(datasetEntry.path);

  if (isUrl(datasetPath)) {
    // Use URLs directly when provided instead of relative paths
    return getDatasetPath(datasetPath);
  } else {
    let manifestPath = isJson(datasetPath) ? datasetPath : datasetPath + "/" + DEFAULT_DATASET_FILENAME;
    manifestPath = formatPath(manifestPath);
    return collectionBasePath + "/" + manifestPath;
  }
}
