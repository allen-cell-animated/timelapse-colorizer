import { ColorRampData, MAX_FEATURE_CATEGORIES } from "../../constants";
import ColorRamp from "../ColorRamp";
import Dataset, { FeatureType } from "../Dataset";
import { FeatureThreshold, isThresholdCategorical, isThresholdNumeric } from "../types";

/**
 * Generates a find function for a FeatureThreshold, matching on feature name and unit.
 * @param featureName String feature name to match on.
 * @param unit String unit to match on.
 * @returns a lambda function that can be passed into `Array.find` for an array of FeatureThreshold.
 * @example
 * ```
 * const featureThresholds = [...]
 * const matchThreshold = featureThresholds.find(thresholdMatchFinder("Temperature", "°C"));
 * ```
 */
export function thresholdMatchFinder(featureName: string, units: string): (threshold: FeatureThreshold) => boolean {
  return (threshold: FeatureThreshold) => threshold.featureName === featureName && threshold.units === units;
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
 * @param dataset The dataset to validate thresholds against.
 * @param thresholds An array of `FeatureThresholds` to validate.
 * @returns a new array of thresholds, with any categorical thresholds converted to numeric thresholds if the feature is numeric
 * and vice-versa.
 */
export function validateThresholds(dataset: Dataset, thresholds: FeatureThreshold[]): FeatureThreshold[] {
  // Validate feature data for each threshold. If the threshold is the wrong type, update it.
  const newThresholds: FeatureThreshold[] = [];

  for (const threshold of thresholds) {
    const featureData = dataset.tryGetFeatureData(threshold.featureName);
    const isInDataset = featureData && featureData.units === threshold.units;

    if (isInDataset && featureData.type === FeatureType.CATEGORICAL && isThresholdNumeric(threshold)) {
      // Threshold is not categorical but the feature is.
      // Convert the threshold to categorical.
      newThresholds.push({
        featureName: threshold.featureName,
        units: threshold.units,
        type: FeatureType.CATEGORICAL,
        enabledCategories: Array(MAX_FEATURE_CATEGORIES).fill(true),
      });
    } else if (isInDataset && featureData.type !== FeatureType.CATEGORICAL && isThresholdCategorical(threshold)) {
      // Threshold is categorical but the feature is not.
      // Convert to numeric threshold instead.
      newThresholds.push({
        featureName: threshold.featureName,
        units: threshold.units,
        type: FeatureType.CONTINUOUS,
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
