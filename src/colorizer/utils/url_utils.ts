import { DEFAULT_COLLECTION_FILENAME, DEFAULT_COLLECTION_PATH } from "../../constants";

const URL_PARAM_TRACK = "track";
const URL_PARAM_DATASET = "dataset";
const URL_PARAM_FEATURE = "feature";
const URL_PARAM_TIME = "t";
const URL_PARAM_COLLECTION = "collection";

export type UrlParams = {
  collection: string | null;
  dataset: string | null;
  feature: string | null;
  track: number;
  time: number;
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
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const signal = controller.signal;
  // If the fetch finishes before the timeout completes, clear the timeout.
  // Note: It's ok even if the timeout still triggers, because the fetch promise is already resolved (settled) and
  // won't change even if the AbortController signals for a promise rejection.
  const timeoutId = setTimeout(() => controller.abort, timeoutMs);
  const fetchPromise = fetch(url, { signal: signal, ...options });
  fetchPromise.then(
    // clear timeout if resolved or rejected
    () => clearTimeout(timeoutId),
    () => clearTimeout(timeoutId)
  );
  return fetchPromise;
}

/**
 * Creates a string of parameters that can be appended onto the base URL as metadata.
 *
 * @param state: An object matching any of the properties of `UrlParams`.
 * - `collection`: string path to the collection. Ignores paths matching the default collection address.
 * - `dataset`: string name or URL of the dataset.
 * - `feature`: string name of the feature.
 * - `track`: integer track number. Ignores values where `track < 0`.
 * - `time`: integer frame number. Ignores values where `time <= 0`.
 *
 * @returns
 * - If no parameters are present or valid, returns an empty string.
 * - Else, returns a string of URL parameters that can be appended to the URL directly (ex: `?collection=<some_url>&time=23`).
 */
export function stateToUrlParamString(state: Partial<UrlParams>): string {
  // arguments as more data gets stored to the URL.

  // Get parameters, ignoring null/empty values
  const includedParameters: string[] = [];
  const { collection, dataset, feature, track, time } = state;

  // Don't include collection parameter in URL if it matches the default.
  if (
    collection &&
    collection !== DEFAULT_COLLECTION_PATH &&
    collection !== DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME
  ) {
    includedParameters.push(`${URL_PARAM_COLLECTION}=${encodeURIComponent(collection)}`);
  }
  if (dataset) {
    includedParameters.push(`${URL_PARAM_DATASET}=${encodeURIComponent(dataset)}`);
  }
  if (feature) {
    includedParameters.push(`${URL_PARAM_FEATURE}=${encodeURIComponent(feature)}`);
  }
  if (track && track >= 0) {
    includedParameters.push(`${URL_PARAM_TRACK}=${track}`);
  }
  if (time && time > 0) {
    // time = 0 is ignored because it's the default frame.
    includedParameters.push(`${URL_PARAM_TIME}=${time}`);
  }

  // If parameters present, join with URL syntax and push into the URL
  return includedParameters.length > 0 ? "?" + includedParameters.join("&") : "";
}

/**
 * Replaces the current URL in the browser history with a new one, made by appending
 * the urlParams to the base URL.
 * @param urlParams A string of parameters that can be appended to the base URL.
 */
export function updateUrl(urlParams: string): void {
  // Use replaceState rather than pushState, because otherwise every frame will be a unique
  // URL in the browser history
  window.history.replaceState(null, document.title, urlParams);
}

/**
 * Returns if a string is a URL where resources can be fetched from, rather than just a
 * string name.
 * @param input String to be checked.
 * @returns True if a string is a web resource `http(s)://` or an internal resource `//`.
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

/**
 * Returns whether the input string is a path to a .json file.
 * @param path The string path to test.
 * @returns true if input ends in `.json`.
 */
export function isJson(path: string): boolean {
  return /.json$/.test(path);
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
  // TODO: Write unit tests for this method.
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
