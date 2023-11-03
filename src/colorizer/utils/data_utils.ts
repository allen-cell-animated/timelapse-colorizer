import { FeatureThreshold } from "../ColorizeCanvas";

/**
 * Generates a find function for a FeatureThreshold, matching on feature name and unit.
 * @param featureName String feature name to match on.
 * @param unit String unit to match on. If undefined, will match on thresholds with undefined units only.
 * @returns a lambda function that can be passed into `Array.find` for an array of FeatureThreshold.
 * @example
 * ```
 * const featureThresholds = [...]
 * const matchThreshold = featureThresholds.find(thresholdMatchFinder("Temperature", "°C"));
 * ```
 */
export function thresholdMatchFinder(
  featureName: string,
  unit: string | undefined
): (threshold: FeatureThreshold) => boolean {
  return (threshold: FeatureThreshold) => threshold.featureName === featureName && threshold.unit === unit;
}
