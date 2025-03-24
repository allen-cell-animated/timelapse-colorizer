// Typescript doesn't recognize RequestInit

/* global RequestInit */
import { Color, HexColorString } from "three";

import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { isThresholdCategorical } from "../types";
import {
  DrawSettings,
  FeatureThreshold,
  isDrawMode,
  LoadErrorMessage,
  LoadTroubleshooting,
  PlotRangeType,
  ScatterPlotConfig,
  ThresholdType,
  ViewerConfig,
} from "../types";
import { nanToNull } from "./data_load_utils";
import { AnyManifestFile } from "./dataset_utils";
import { formatNumber } from "./math_utils";

// TODO: This file needs to be split up for easier reading and unit testing.
// This could also be a great opportunity to reconsider how we store and manage state.

export const URL_COLOR_RAMP_REVERSED_SUFFIX = "!";
export enum UrlParam {
  TRACK = "track",
  DATASET = "dataset",
  FEATURE = "feature",
  TIME = "t",
  COLLECTION = "collection",
  THRESHOLDS = "filters",
  RANGE = "range",
  COLOR_RAMP = "color",
  PALETTE = "palette",
  PALETTE_KEY = "palette-key",
  SHOW_BACKDROP = "bg",
  BACKDROP_KEY = "bg-key",
  BACKDROP_BRIGHTNESS = "bg-brightness",
  BACKDROP_SATURATION = "bg-sat",
  OBJECT_OPACITY = "fg-alpha",
  OUTLIER_MODE = "outlier-mode",
  OUTLIER_COLOR = "outlier-color",
  FILTERED_MODE = "filter-mode",
  FILTERED_COLOR = "filter-color",
  OUTLINE_COLOR = "outline-color",
  SHOW_PATH = "path",
  SHOW_SCALEBAR = "scalebar",
  SHOW_TIMESTAMP = "timestamp",
  KEEP_RANGE = "keep-range",
  SCATTERPLOT_X_AXIS = "scatter-x",
  SCATTERPLOT_Y_AXIS = "scatter-y",
  SCATTERPLOT_RANGE_MODE = "scatter-range",
  OPEN_TAB = "tab",
  SHOW_VECTOR = "vc",
  VECTOR_KEY = "vc-key",
  VECTOR_COLOR = "vc-color",
  VECTOR_SCALE = "vc-scale",
  VECTOR_TOOLTIP_MODE = "vc-tooltip",
  VECTOR_TIME_INTERVALS = "vc-time-int",
}

const ALLEN_FILE_PREFIX = "/allen/";
const ALLEN_PREFIX_TO_HTTPS: Record<string, string> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "/allen/aics/assay-dev": "https://dev-aics-dtp-001.int.allencell.org/assay-dev",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "/allen/aics/microscopy": "https://dev-aics-dtp-001.int.allencell.org/microscopy",
};

export type UrlParams = {
  collection: string;
  dataset: string;
  /** Either feature key or feature name. */
  feature: string;
  track: number;
  time: number;
  thresholds: FeatureThreshold[];
  range: [number, number];
  colorRampKey: string | null;
  colorRampReversed: boolean | null;
  categoricalPalette: Color[];
  config: Partial<ViewerConfig>;
  selectedBackdropKey: string | null;
  scatterPlotConfig: Partial<ScatterPlotConfig>;
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
 * Fetches a manifest JSON file from a given URL and returns the parsed JSON object.
 */
export async function fetchManifestJson(url: string): Promise<AnyManifestFile> {
  let response;
  try {
    response = await fetchWithTimeout(url, DEFAULT_FETCH_TIMEOUT_MS);
  } catch (error) {
    console.error(`Fetching manifest JSON from url '${url}' failed with the following error:`, error);
    throw new Error(LoadErrorMessage.UNREACHABLE_MANIFEST + " " + LoadTroubleshooting.CHECK_NETWORK);
  }

  if (!response.ok) {
    console.error(`Failed to fetch manifest file from url '${url}':`, response);
    throw new Error(
      `Received a ${response.status} (${response.statusText}) code from the server while retrieving manifest JSON. ${LoadTroubleshooting.CHECK_FILE_EXISTS}`
    );
  }

  try {
    return await JSON.parse(nanToNull(await response.text()));
  } catch (error) {
    console.error(`Failed to parse manifest file from url '${url}':`, error);
    throw new Error(LoadErrorMessage.MANIFEST_JSON_PARSE_FAILED + error);
  }
}

/**
 * Returns the value of a promise if it was resolved, or logs a warning and returns null if it was rejected.
 */
export function getPromiseValue<T>(
  promise: PromiseSettledResult<T>,
  onFailure?: (rejectionReason: any) => void
): T | null {
  if (promise.status === "rejected") {
    onFailure?.(promise.reason);
    return null;
  }
  return promise.value;
}

/**
 * Serializes the threshold into a string that can be used as a URL parameter.
 *
 * @param threshold FeatureThreshold to serialize.
 * @returns A string representing the threshold.
 * - For numeric features, the threshold is serialized as `featureKey:unit:min:max`.
 * - For categorical features, the threshold is serialized as `featureKey:unit:selected_hex`,
 * where `selected_hex` is the hex form of a binary number representing what categories are selected.
 *
 * The i-th place of the binary number is `1` if the i-th category in the feature's category list is enabled.
 *
 * ex: If there are five categories and the first and third categories are enabled,
 * then `threshold.enabledCategories=[true, false, true, false, false]`.
 * The binary representation is `00101`, which is `0x05` in hex.
 */
function serializeThreshold(threshold: FeatureThreshold): string {
  // featureKey + units are encoded in case it contains special characters (":" or ",").
  // TODO: remove once feature keys are implemented.
  const featureKey = encodeURIComponent(threshold.featureKey);
  const featureUnit = encodeURIComponent(threshold.unit);

  // TODO: Are there better characters I can be using here? ":" and "," take up
  // more space in the URL. -> once features are converted to use keys, use "-" as a separator here? "|"?
  if (isThresholdCategorical(threshold)) {
    // Interpret the selected categories as binary digits, then convert to a hex string.
    let selectedBinary = 0;
    for (let i = 0; i < threshold.enabledCategories.length; i++) {
      selectedBinary |= (threshold.enabledCategories[i] ? 1 : 0) << i;
    }
    const selectedHex = selectedBinary.toString(16);
    return `${featureKey}:${featureUnit}:${selectedHex}`;
  } else {
    // Numeric feature
    const min = formatNumber(threshold.min, 3);
    const max = formatNumber(threshold.max, 3);
    return `${featureKey}:${featureUnit}:${min}:${max}`;
  }
}

export function serializeThresholds(thresholds: FeatureThreshold[]): string {
  return thresholds.map(serializeThreshold).join(",");
}

/**
 * Deserializes a single threshold string into a FeatureThreshold object.
 * @param thresholdString Threshold string to parse.
 * @returns
 * - A FeatureThreshold object if the string was successfully parsed.
 * - `undefined` if the string could not be parsed.
 */
function deserializeThreshold(thresholdString: string): FeatureThreshold | undefined {
  const [featureKey, featureUnit, ...selection] = thresholdString.split(":");
  if (featureKey === undefined || featureUnit === undefined) {
    console.warn(
      "url_utils.deserializeThreshold: Could not parse threshold string: '" +
        thresholdString +
        "'; feature key and/or units missing."
    );
    return undefined;
  }
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
      featureKey: decodeURIComponent(featureKey),
      unit: decodeURIComponent(featureUnit),
      type: ThresholdType.CATEGORICAL,
      enabledCategories,
    };
  } else if (selection.length === 2) {
    // Feature is numeric and a range.
    threshold = {
      featureKey: decodeURIComponent(featureKey),
      unit: decodeURIComponent(featureUnit),
      type: ThresholdType.NUMERIC,
      min: parseFloat(selection[0]),
      max: parseFloat(selection[1]),
    };
    // Enforce min/max ordering
    if (threshold.min > threshold.max) {
      threshold = { ...threshold, min: threshold.max, max: threshold.min };
    }
  } else {
    // Unknown parameters but we can still make a dummy threshold with the name + unit
    console.warn(
      `url_utils.deserializeThreshold: invalid threshold '${thresholdString}' has too many or too few parameters.`
    );
    threshold = {
      featureKey: decodeURIComponent(featureKey),
      unit: decodeURIComponent(featureUnit),
      type: ThresholdType.NUMERIC,
      min: NaN,
      max: NaN,
    };
  }
  return threshold;
}

export function deserializeThresholds(thresholds: string | null): FeatureThreshold[] | undefined {
  if (!thresholds) {
    return undefined;
  }
  return thresholds.split(",").reduce((acc, thresholdString) => {
    const thresholdOrUndefined = deserializeThreshold(thresholdString);
    if (thresholdOrUndefined) {
      acc.push(thresholdOrUndefined);
    }
    return acc;
  }, [] as FeatureThreshold[]);
}

export function encodeColor(value: Color): string {
  return value.getHexString();
}

export function encodeMaybeColor(value: Color | undefined): string | undefined {
  return value ? encodeColor(value) : undefined;
}

export function isHexColor(value: string | null): value is HexColorString {
  const hexRegex = /^#([0-9a-f]{3}){1,2}$/;
  return value !== null && hexRegex.test(value);
}

export function decodeHexColor(value: string | null): Color | undefined {
  value = value?.startsWith("#") ? value : "#" + value;
  return isHexColor(value) ? new Color(value) : undefined;
}

export function encodeNumber(value: number): string {
  return formatNumber(value, 3);
}

export function encodeMaybeNumber(value: number | undefined): string | undefined {
  return value !== undefined ? encodeNumber(value) : undefined;
}

export function decodeFloat(value: string | null): number | undefined {
  return value === null ? undefined : parseFloat(value);
}

export function decodeInt(value: string | null): number | undefined {
  return value === null ? undefined : parseInt(value, 10);
}

export function parseDrawSettings(
  color: string | null,
  mode: string | null,
  defaultSettings: DrawSettings
): DrawSettings {
  const modeInt = parseInt(mode || "-1", 10);
  const hexColor = "#" + color;
  return {
    color: isHexColor(hexColor) ? new Color(hexColor) : defaultSettings.color,
    mode: mode && isDrawMode(modeInt) ? modeInt : defaultSettings.mode,
  };
}

export function encodeBoolean(value: boolean): string {
  return value ? "1" : "0";
}

export function encodeMaybeBoolean(value: boolean | undefined): string | undefined {
  return value !== undefined ? encodeBoolean(value) : undefined;
}

export function decodeBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }
  return value === "1";
}

const scatterPlotRangeTypeToUrlParam: Record<PlotRangeType, string> = {
  [PlotRangeType.ALL_TIME]: "all",
  [PlotRangeType.CURRENT_TRACK]: "track",
  [PlotRangeType.CURRENT_FRAME]: "frame",
};

const urlParamToRangeType: Record<string, PlotRangeType> = {
  all: PlotRangeType.ALL_TIME,
  track: PlotRangeType.CURRENT_TRACK,
  frame: PlotRangeType.CURRENT_FRAME,
};

export function encodeScatterPlotRangeType(rangeType: PlotRangeType): string {
  return scatterPlotRangeTypeToUrlParam[rangeType];
}

export function decodeScatterPlotRangeType(rangeString: string | null): PlotRangeType | undefined {
  if (rangeString === null) {
    return;
  }
  return urlParamToRangeType[rangeString];
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
export function decodeString(input: string | null): string | undefined {
  return input === null ? undefined : decodeURIComponent(input);
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
