import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { ColorRampData } from "../colors/color_ramps";
import { FeatureThreshold, isThresholdCategorical, isThresholdNumeric, ThresholdType } from "../types";

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
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
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
