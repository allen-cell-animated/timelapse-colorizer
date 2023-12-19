// Typescript doesn't recognize RequestInit
/* global RequestInit */

import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { FeatureThreshold } from "../types";
import { numberToStringDecimal } from "./math_utils";

const URL_PARAM_TRACK = "track";
const URL_PARAM_DATASET = "dataset";
const URL_PARAM_FEATURE = "feature";
const URL_PARAM_TIME = "t";
const URL_PARAM_COLLECTION = "collection";
const URL_PARAM_THRESHOLDS = "filters";
const URL_PARAM_RANGE = "range";
const URL_PARAM_COLOR_RAMP = "color";
const URL_COLOR_RAMP_REVERSED_SUFFIX = "!";

const ALLEN_FILE_PREFIX = "/allen/";
const ALLEN_PREFIX_TO_HTTPS: Record<string, string> = {
  "/allen/aics/assay-dev": "https://dev-aics-dtp-001.int.allencell.org/assay-dev",
  "/allen/aics/microscopy": "https://dev-aics-dtp-001.int.allencell.org/microscopy",
};

export type UrlParams = {
  collection: string;
  dataset: string;
  feature: string;
  track: number;
  time: number;
  thresholds: FeatureThreshold[];
  range: [number, number];
  colorRampKey: string | null;
  colorRampReversed: boolean | null;
};

export const DEFAULT_FETCH_TIMEOUT_MS = 2000;

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
  const fetchPromise = fetch(url, { signal: AbortSignal.timeout(timeoutMs), ...options });
  return fetchPromise;
}

/**
 * Creates a url query string from parameters that can be appended onto the base URL.
 *
 * @param state: An object matching any of the properties of `UrlParams`.
 * - `collection`: string path to the collection. Ignores paths matching the default collection address.
 * - `dataset`: string name or URL of the dataset.
 * - `feature`: string name of the feature.
 * - `track`: integer track number.
 * - `time`: integer frame number.
 * - `thresholds`: array of feature threshold.
 * - `range`: array of two numbers, representing the min and max of the color map range.
 *
 * @returns
 * - If no parameters are present or valid, returns an empty string.
 * - Else, returns a string of URL parameters that can be appended to the URL directly (ex: `?collection=<some_url>&time=23`).
 */
export function paramsToUrlQueryString(state: Partial<UrlParams>): string {
  // Get parameters, ignoring null/empty values
  const includedParameters: string[] = [];

  if (state.collection) {
    includedParameters.push(`${URL_PARAM_COLLECTION}=${encodeURIComponent(state.collection)}`);
  }
  if (state.dataset) {
    includedParameters.push(`${URL_PARAM_DATASET}=${encodeURIComponent(state.dataset)}`);
  }
  if (state.feature) {
    includedParameters.push(`${URL_PARAM_FEATURE}=${encodeURIComponent(state.feature)}`);
  }
  if (state.track !== undefined) {
    includedParameters.push(`${URL_PARAM_TRACK}=${state.track}`);
  }
  if (state.time !== undefined) {
    includedParameters.push(`${URL_PARAM_TIME}=${state.time}`);
  }
  if (state.thresholds && state.thresholds.length > 0) {
    // Thresholds are saved as a comma-separated list of `featureName:unit:min:max` for numeric features,
    // and `featureName:unit:selected_hex` for categorical features.

    // `selected_hex` is the hex equivalent of a binary number representing what categories are selected.
    // The i-th place of the binary number is `1` if the i-th category in the feature's category list is enabled.
    // ex: If we have four categories and the first and third categories are enabled,
    // then `threshold.enabledCategories=[true, false, true, false]`.
    // The binary representation is 0101, which is 0x5 in hex.

    // TODO: Are there better characters I can be using here? ":" and "," take up
    // more space in the URL. -> once features are converted to use keys, use "-" as a separator here
    const thresholdsString = state.thresholds
      .map((threshold) => {
        // featureName + units are encoded in case it contains special characters (":" or ",").
        // TODO: remove once feature keys are implemented.
        const featureName = encodeURIComponent(threshold.featureName);
        const featureUnit = encodeURIComponent(threshold.units);
        if (threshold.categorical) {
          // Interpret the selected categories as binary digits, then convert to a hex string.
          let selectedBinary = 0;
          for (let i = 0; i < threshold.enabledCategories.length; i++) {
            selectedBinary |= (threshold.enabledCategories[i] ? 1 : 0) << i;
          }
          const selectedHex = selectedBinary.toString(16);
          return `${featureName}:${featureUnit}:${selectedHex}`;
        } else {
          const min = numberToStringDecimal(threshold.min, 3);
          const max = numberToStringDecimal(threshold.max, 3);
          return `${featureName}:${featureUnit}:${min}:${max}`;
        }
      })
      .join(",");
    includedParameters.push(`${URL_PARAM_THRESHOLDS}=${encodeURIComponent(thresholdsString)}`);
  }
  if (state.range && state.range.length === 2) {
    const rangeString = `${numberToStringDecimal(state.range[0], 3)},${numberToStringDecimal(state.range[1], 3)}`;
    includedParameters.push(`${URL_PARAM_RANGE}=${encodeURIComponent(rangeString)}`);
  }
  if (state.colorRampKey) {
    if (state.colorRampReversed) {
      includedParameters.push(
        `${URL_PARAM_COLOR_RAMP}=${encodeURIComponent(state.colorRampKey + URL_COLOR_RAMP_REVERSED_SUFFIX)}`
      );
    } else {
      includedParameters.push(`${URL_PARAM_COLOR_RAMP}=${encodeURIComponent(state.colorRampKey)}`);
    }
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
 * Normalizes a file path to use only single forward slashes. Replaces
 * backwards slashes with forward slashes, and removes double slashes.
 */
function normalizeFilePathSlashes(input: string): string {
  // Replace all backslashes with forward slashes
  input = input.replaceAll("\\", "/");
  // Replace double slashes with single
  input = input.replaceAll("//", "/");
  return input;
}

/**
 * Returns whether the input string is a path to an Allen file server resource.
 * Matches any path that starts with `/allen/`, normalizing for backwards and double slashes.
 */
export function isAllenPath(input: string): boolean {
  return normalizeFilePathSlashes(input).startsWith(ALLEN_FILE_PREFIX);
}

/**
 * Attempts to convert an Allen path to an HTTPS resource path.
 * @returns Returns null if the path was not recognized or could not be converted,
 * otherwise, returns an HTTPS resource path.
 */
export function convertAllenPathToHttps(input: string): string | null {
  input = normalizeFilePathSlashes(input);
  for (const prefix of Object.keys(ALLEN_PREFIX_TO_HTTPS)) {
    if (input.startsWith(prefix)) {
      return input.replace(prefix, ALLEN_PREFIX_TO_HTTPS[prefix]);
    }
  }
  return null;
}

/**
 * Decodes strings using `decodeURIComponent`, handling null inputs.
 */
function decodePossiblyNullString(input: string | null): string | null {
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
 * A parameter is `undefined` if it was not found in the URL, or if
 * it could not be parsed.
 */
export function loadParamsFromUrl(): Partial<UrlParams> {
  // Get params from URL and load, with default fallbacks.
  const queryString = window.location.search;
  return loadParamsFromUrlQueryString(queryString);
}

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

/**
 * Loads parameters from the query string of a URL.
 * @param queryString A URL query string, as from `window.location.search`.
 * @returns A partial UrlParams object with values loaded from the queryString.
 * Enforces min/max ordering for thresholds and range.
 */
export function loadParamsFromUrlQueryString(queryString: string): Partial<UrlParams> {
  // NOTE: URLSearchParams automatically applies one level of URI decoding.
  const urlParams = new URLSearchParams(queryString);

  const base10Radix = 10; // required for parseInt
  const collectionParam = urlParams.get(URL_PARAM_COLLECTION) ?? undefined;
  const datasetParam = urlParams.get(URL_PARAM_DATASET) ?? undefined;
  const featureParam = urlParams.get(URL_PARAM_FEATURE) ?? undefined;
  const trackParam = urlParams.get(URL_PARAM_TRACK)
    ? parseInt(urlParams.get(URL_PARAM_TRACK)!, base10Radix)
    : undefined;
  // This assumes there are no negative timestamps in the dataset
  const timeParam = urlParams.get(URL_PARAM_TIME) ? parseInt(urlParams.get(URL_PARAM_TIME)!, base10Radix) : undefined;

  // Parse and validate thresholds
  let thresholdsParam: FeatureThreshold[] = [];
  const rawThresholdParam = urlParams.get(URL_PARAM_THRESHOLDS);
  if (rawThresholdParam) {
    // Thresholds are separated by commas, and are structured as:
    // {name (encoded)}:{unit (encoded)}:{min}:{max}
    const rawThresholds = rawThresholdParam.split(",");
    thresholdsParam = rawThresholds.map((rawThreshold) => {
      const [rawFeatureName, rawFeatureUnit, ...selection] = rawThreshold.split(":");
      let threshold: FeatureThreshold;
      if (selection.length === 1) {
        // Feature is a category
        const enabledCategories = [];
        const selectedHex = selection[0];
        const selectedBinary = parseInt(selectedHex, 16);
        for (let i = 0; i < MAX_FEATURE_CATEGORIES; i++) {
          enabledCategories.push((selectedBinary & (1 << i)) !== 0);
        }
        threshold = {
          featureName: decodeURIComponent(rawFeatureName),
          units: decodeURIComponent(rawFeatureUnit),
          categorical: true,
          enabledCategories,
        };
      } else if (selection.length === 2) {
        // Feature is a range
        threshold = {
          featureName: decodeURIComponent(rawFeatureName),
          units: decodeURIComponent(rawFeatureUnit),
          categorical: false,
          min: parseFloat(selection[0]),
          max: parseFloat(selection[1]),
        };
        // Enforce min/max ordering
        if (threshold.min > threshold.max) {
          threshold = { ...threshold, min: threshold.max, max: threshold.min };
        }
      } else {
        // Unknown parameters; make a dummy threshold
        console.warn("url_utils: loadParamsFromQueryString: invalid threshold");
        threshold = {
          featureName: decodeURIComponent(rawFeatureName),
          units: decodeURIComponent(rawFeatureUnit),
          categorical: false,
          min: NaN,
          max: NaN,
        };
      }
      return threshold;
    });
  }

  let rangeParam: [number, number] | undefined = undefined;
  const rawRangeParam = decodePossiblyNullString(urlParams.get(URL_PARAM_RANGE));
  if (rawRangeParam) {
    const [min, max] = rawRangeParam.split(",");
    rangeParam = [parseFloat(min), parseFloat(max)];
    // Enforce min/max ordering
    if (rangeParam[0] > rangeParam[1]) {
      rangeParam.reverse();
    }
  }

  const colorRampRawParam = urlParams.get(URL_PARAM_COLOR_RAMP);
  let colorRampParam: string | undefined = colorRampRawParam || undefined;
  let colorRampReversedParam: boolean | undefined = undefined;
  //  Color ramps are marked as reversed by adding ! to the end of the key
  if (colorRampRawParam && colorRampRawParam.charAt(colorRampRawParam.length - 1) === URL_COLOR_RAMP_REVERSED_SUFFIX) {
    colorRampReversedParam = true;
    colorRampParam = colorRampRawParam.slice(0, -1);
  }

  // Remove undefined entries from the object for a cleaner return value
  return removeUndefinedProperties({
    collection: collectionParam,
    dataset: datasetParam,
    feature: featureParam,
    track: trackParam,
    time: timeParam,
    thresholds: thresholdsParam.length > 0 ? thresholdsParam : undefined,
    range: rangeParam,

    colorRampKey: colorRampParam,
    colorRampReversed: colorRampReversedParam,
  });
}
