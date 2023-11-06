import { FeatureThreshold } from "../types";
import { ColorRampData } from "../../constants";
import ColorRamp from "../ColorRamp";

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
