import { Color } from "three";

import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { ColorRampData } from "../colors/color_ramps";
import {
  FeatureDataType,
  FeatureThreshold,
  GlobalIdLookupInfo,
  isThresholdCategorical,
  isThresholdNumeric,
  ThresholdType,
} from "../types";
import { packDataTexture } from "./texture_utils";

import { BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE, LabelData, LabelType } from "../AnnotationData";
import ColorRamp from "../ColorRamp";
import Dataset, { FeatureType } from "../Dataset";

/** Returns whether the two arrays are deeply equal, where arr1[i] === arr2[i] for all i. */
export function arrayElementsAreEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr2.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Generates a find function for a FeatureThreshold, matching on feature name and unit.
 * @param featureKey String feature key to match on.
 * @param unit String unit to match on.
 * @returns a lambda function that can be passed into `Array.find` for an array of FeatureThreshold.
 * @example
 * ```
 * const featureThresholds = [...]
 * const matchThreshold = featureThresholds.find(thresholdMatchFinder("Temperature", "°C"));
 * ```
 */
export function thresholdMatchFinder(featureKey: string, unit: string): (threshold: FeatureThreshold) => boolean {
  return (threshold: FeatureThreshold) => threshold.featureKey === featureKey && threshold.unit === unit;
}

/**
 * Convenience method for getting a single ramp from a map of strings to ramps, optionally reversing it.
 */
export function getColorMap(colorRampData: Map<string, ColorRampData>, key: string, reversed = false): ColorRamp {
  const colorRamp = colorRampData.get(key)?.colorRamp;
  if (!colorRamp) {
    throw new Error("Could not find data for color ramp '" + key + "'");
  }
  return colorRamp && reversed ? colorRamp.reverse() : colorRamp;
}

/**
 * Validates the thresholds against the dataset. If the threshold's feature is present but the wrong type, it is updated.
 * This is most likely to happen when datasets have different types for the same feature key, or if thresholds are loaded from
 * an outdated URL. Also changes feature names to keys if they are present in the dataset for backwards-compatibility.
 *
 * @param dataset The dataset to validate thresholds against.
 * @param thresholds An array of `FeatureThresholds` to validate.
 * @returns a new array of thresholds, with any categorical thresholds converted to numeric thresholds if the feature is numeric
 * and vice-versa.
 */
export function validateThresholds(dataset: Dataset, thresholds: FeatureThreshold[]): FeatureThreshold[] {
  // Validate feature data for each threshold. If the threshold is the wrong type, update it.
  const newThresholds: FeatureThreshold[] = [];

  for (const threshold of thresholds) {
    // Under the old URL schema, `featureKey` may be a name. Convert it to a key if a matching feature exists in the dataset.
    // Note that units will also need to match for the threshold to be valid for this dataset.
    let featureKey = threshold.featureKey;
    const matchedFeatureKey = dataset.findFeatureByKeyOrName(threshold.featureKey);
    if (matchedFeatureKey !== undefined) {
      featureKey = matchedFeatureKey;
    }

    const featureData = dataset.getFeatureData(featureKey);
    const isInDataset = featureData && featureData.unit === threshold.unit;

    if (isInDataset) {
      // Threshold key + unit matches, so update feature key just in case it was a name
      threshold.featureKey = featureKey;
    }

    if (isInDataset && featureData.type === FeatureType.CATEGORICAL && isThresholdNumeric(threshold)) {
      // Threshold is not categorical but the feature is.
      // Convert the threshold to categorical.

      // This is important for historical reasons, because older versions of the app used to only store features as numeric
      // thresholds. This would cause categorical features loaded from the URL to be incorrectly shown on the UI.
      newThresholds.push({
        featureKey: featureKey,
        unit: threshold.unit,
        type: ThresholdType.CATEGORICAL,
        enabledCategories: Array(MAX_FEATURE_CATEGORIES).fill(true),
      });
    } else if (isInDataset && featureData.type !== FeatureType.CATEGORICAL && isThresholdCategorical(threshold)) {
      // Threshold is categorical but the feature is not.
      // Convert to numeric threshold instead.
      newThresholds.push({
        featureKey: featureKey,
        unit: threshold.unit,
        type: ThresholdType.NUMERIC,
        min: featureData.min,
        max: featureData.max,
      });
    } else {
      // Keep existing threshold
      newThresholds.push(threshold);
    }
  }
  return newThresholds;
}

/** Returns whether a feature value is inside the range of a threshold. */
export function isValueWithinThreshold(value: number, threshold: FeatureThreshold): boolean {
  if (isThresholdNumeric(threshold)) {
    return value >= threshold.min && value <= threshold.max;
  } else {
    return threshold.enabledCategories[value];
  }
}

/**
 * Returns a Uint8 array look-up table indexed by object ID, storing whether that object ID is in range of
 * the given thresholds (=1) or not (=0).
 * @param {Dataset} dataset A valid Dataset object.
 * @param {FeatureThreshold[]} thresholds Array of feature thresholds, which match agaisnt the feature key and unit.
 * If a feature key cannot be found in the dataset, it will be ignored.
 * @returns A Uint8Array, with a length equal to the number of objects in the dataset.
 * For each object ID `i`, `inRangeIds[i]` will be 1 if the object is in range of the thresholds
 * and 0 if it is not.
 */
export function getInRangeLUT(dataset: Dataset, thresholds: FeatureThreshold[]): Uint8Array {
  // TODO: Optimize memory by using a true boolean array?
  // TODO: If optimizing, use fuse operation via shader.
  const inRangeIds = new Uint8Array(dataset.numObjects);

  // Ignore thresholds with features that don't exist in this dataset or whose units don't match
  const validThresholds = thresholds.filter((threshold) => {
    const featureData = dataset.getFeatureData(threshold.featureKey);
    return featureData && featureData.unit === threshold.unit;
  });

  for (let id = 0; id < dataset.numObjects; id++) {
    inRangeIds[id] = 1;
    for (let thresholdIdx = 0; thresholdIdx < validThresholds.length; thresholdIdx++) {
      const threshold = validThresholds[thresholdIdx];
      const featureData = dataset.getFeatureData(threshold.featureKey);
      if (featureData && !isValueWithinThreshold(featureData.data[id], threshold)) {
        inRangeIds[id] = 0;
        break;
      }
    }
  }
  return inRangeIds;
}

/**
 * Sanitizes a string name to a key for internal use. Replaces all non-alphanumeric characters with underscores,
 * and converts the string to lowercase.
 */
export function getKeyFromName(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9_]/g, "_");
}

/** Changes the first letter of a string to lower case. */
export function uncapitalizeFirstLetter(str: string): string {
  if (!str) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Formats a list of string items as a bulleted list, with an optional maximum number of items to display.
 * If the maximum count is exceeded, the list will be truncated and add a message indicating the number of items omitted.
 * @param items String list of items to format.
 * @param maxDisplayCount Maximum number of items to display. Default is `Number.POSITIVE_INFINITY`.
 * @returns A list of string items formatted as a bulleted list, with the prefix " - ".
 */
export function formatAsBulletList(items: string[], maxDisplayCount: number = Number.POSITIVE_INFINITY): string[] {
  const itemDisplayText = [];
  for (let i = 0; i < Math.min(maxDisplayCount, items.length); i++) {
    itemDisplayText.push(` - ${items[i]}`);
  }
  if (items.length > maxDisplayCount) {
    itemDisplayText.push(` - ...and ${items.length - 5} more.`);
  }
  return itemDisplayText;
}

/**
 * For a list of integers, returns a list of inclusive `[min, max]` value
 * intervals where the integers are contiguous.
 *
 * @example
 * ```
 * const result = getIntervals([5, 6, 7, 9, 10, 14])
 * // result = [[5, 7], [9, 10], [14, 14]]
 * ```
 */
export function getIntervals(values: number[]): [number, number][] {
  if (values.length === 0) {
    return [];
  }

  // Initialize as null in case all values are invalid.
  let min: number = Number.POSITIVE_INFINITY;
  let max: number = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue; // Skip invalid values
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!isFinite(min) || !isFinite(max)) {
    return [];
  }

  const intervals: [number, number][] = [];
  const valuesAsSet = new Set(values);
  let lastIntervalStart = -1;

  for (let i = min; i <= max; i++) {
    if (valuesAsSet.has(i)) {
      if (lastIntervalStart === -1) {
        lastIntervalStart = i;
      }
    } else {
      if (lastIntervalStart !== -1) {
        intervals.push([lastIntervalStart, i - 1]);
        lastIntervalStart = -1;
      }
    }
  }
  if (lastIntervalStart !== -1) {
    intervals.push([lastIntervalStart, max]);
  }
  return intervals;
}

export function hasPropertyChanged<T extends Record<string, unknown>>(
  curr: T | null,
  prev: T | null,
  properties: (keyof T)[]
): boolean {
  if (!curr && !prev) {
    return false;
  } else if (!curr || !prev) {
    return true;
  }
  for (const property of properties) {
    if (curr[property] !== prev[property]) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a lookup table that can be used to find the global ID from a
 * segmentation ID (raw pixel value) for each frame in the dataset.
 */
export function buildFrameToGlobalIdLookup(
  times: Uint32Array,
  segIds: Uint32Array,
  numFrames: number
): Map<number, GlobalIdLookupInfo> {
  const frameToLut = new Map<number, Uint32Array>();

  // Get min and max segmentation IDs for each frame.
  const frameToMinSegId: number[] = [];
  const frameToMaxSegId: number[] = [];
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const segId = segIds[i];
    frameToMinSegId[time] = Math.min(frameToMinSegId[time] ?? segId, segId);
    frameToMaxSegId[time] = Math.max(frameToMaxSegId[time] ?? segId, segId);
  }

  // Initialize the arrays to hold the global IDs for each frame.
  for (let i = 0; i < numFrames; i++) {
    const minSegId = frameToMinSegId[i] ?? 0;
    const maxSegId = frameToMaxSegId[i] ?? 0;
    const lut = new Uint32Array(maxSegId - minSegId + 1);
    frameToLut.set(i, lut);
  }

  // For each object with segmentation ID `segId` at time `t`, fill the arrays
  // so that `frameToLut.get(t)[segId] - 1` is the global ID of the object, used
  // to index into the global data arrays. However, we do one extra trick for
  // memory optimization, where the arrays are truncated to below the smallest
  // segmentation ID for that frame. For an array [0, 0, 0, 1, 0, 2, 3], the
  // array is saved as [1, 0, 2, 3].
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const minSegId = frameToMinSegId[time] ?? 0;
    const segId = segIds[i] - minSegId;
    const lut = frameToLut.get(time);
    if (lut) {
      lut[segId] = i + 1; // +1 to reserve 0 for missing data
    }
  }

  return new Map<number, GlobalIdLookupInfo>(
    Array.from(frameToLut.entries()).map(([frame, lut]) => {
      return [
        frame,
        {
          lut,
          texture: packDataTexture(lut, FeatureDataType.U32),
          minSegId: frameToMinSegId[frame] ?? 0,
        },
      ];
    })
  );
}

export function getGlobalIdFromSegId(
  frameToGlobalIdLUT: Map<number, GlobalIdLookupInfo> | null,
  frame: number,
  segId: number
): number | undefined {
  if (!frameToGlobalIdLUT) {
    return undefined;
  }
  const lut = frameToGlobalIdLUT.get(frame);
  if (!lut) {
    return undefined;
  }
  const rawGlobalId = lut.lut[segId - lut.minSegId];
  if (rawGlobalId === undefined || rawGlobalId === 0) {
    return undefined;
  }

  return rawGlobalId - 1; // -1 to convert to zero-based index
}

export function getLabelTypeFromParsedCsv(
  headers: string[],
  data: Record<string, string | undefined>[]
): Map<string, LabelType> {
  const labelTypeMap = new Map<string, LabelType>();
  for (const header of headers) {
    let isAllIntegers = true;
    let isAllBooleans = true;
    for (const row of data) {
      const value = row[header]?.trim();
      if (value === undefined || value === "") {
        continue;
      }
      const valueAsInt = parseInt(value ?? "", 10);
      if (value.toLowerCase() === BOOLEAN_VALUE_TRUE || value.toLowerCase() === BOOLEAN_VALUE_FALSE) {
        isAllIntegers = false;
      } else if (valueAsInt.toString(10) === value && Number.isInteger(valueAsInt)) {
        // ^ check that the value's string representation is the same as the
        // parsed integer (there would be a mismatch for float values, e.g.
        // "1.0" != 1)
        isAllBooleans = false;
      } else {
        // String/custom value (neither int nor boolean)
        isAllBooleans = false;
        isAllIntegers = false;
        break;
      }
      if (!isAllIntegers && !isAllBooleans) {
        // Triggers if there are both integer and boolean values in the same
        // column, which will be handled as custom
        break;
      }
    }

    if (isAllIntegers) {
      labelTypeMap.set(header, LabelType.INTEGER);
    } else if (isAllBooleans) {
      labelTypeMap.set(header, LabelType.BOOLEAN);
    } else {
      labelTypeMap.set(header, LabelType.CUSTOM);
    }
  }
  return labelTypeMap;
}

export function cloneLabel(label: LabelData): LabelData {
  return {
    options: {
      ...label.options,
      color: label.options.color.clone(),
    },
    ids: new Set(label.ids),
    lastValue: label.lastValue,
    valueToIds: new Map(label.valueToIds),
    idToValue: new Map(label.idToValue),
  };
}

/**
 * Gets the color for a given object ID based on feature data and other
 * parameters.
 * @param id The object ID to get the color for.
 * @param params Parameters containing the dataset, feature key, color ramp, and
 * other settings. These can be pulled directly from viewer state.
 * @param defaultColor A default color to return if no feature data is available
 * or the ID is out of range. If not provided, defaults to black (0, 0, 0).
 * @returns The color for the given object ID, using the rules in the main
 * viewport shader.
 */
export function getColorFromId(
  id: number,
  params: {
    dataset: Dataset | null;
    featureKey: string | null;
    colorRamp: ColorRamp;
    colorRampRange: [number, number];
    categoricalPaletteRamp: ColorRamp;
    outOfRangeDrawSettings: { color: Color };
    inRangeLUT: Uint8Array;
    outlierDrawSettings: { color: Color };
  },
  defaultColor: Color = new Color(0, 0, 0)
): Color {
  const {
    dataset,
    featureKey,
    colorRamp,
    colorRampRange,
    categoricalPaletteRamp,
    outOfRangeDrawSettings,
    inRangeLUT,
    outlierDrawSettings,
  } = params;
  if (dataset === null || featureKey === null || !dataset.hasFeatureKey(featureKey)) {
    // No feature data, return default color
    return defaultColor;
  }
  const featureValue = dataset.getFeatureData(featureKey)!.data[id];
  if (inRangeLUT[id] === 0) {
    return outOfRangeDrawSettings.color.clone().convertLinearToSRGB();
  } else if (dataset.outliers?.[id] === 1 || !Number.isFinite(featureValue)) {
    return outlierDrawSettings.color.clone().convertLinearToSRGB();
  } else if (dataset.isFeatureCategorical(featureKey)) {
    // Categorical feature, use categorical palette
    const t = (featureValue % MAX_FEATURE_CATEGORIES) / (MAX_FEATURE_CATEGORIES - 1);
    return categoricalPaletteRamp.sample(t);
  } else {
    // Numeric feature, use color ramp
    const t = (featureValue - colorRampRange[0]) / (colorRampRange[1] - colorRampRange[0]);
    return colorRamp.sample(t);
  }
}
