import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { ColorRampData } from "../colors/color_ramps";
import { FeatureThreshold, isThresholdCategorical, isThresholdNumeric, ThresholdType } from "../types";

import ColorRamp from "../ColorRamp";
import Dataset, { FeatureType } from "../Dataset";

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

export function getAllIdsAtTime(dataset: Dataset, time: number): number[] {
  // TODO: Move this into dataset and cache results
  const ids: number[] = [];
  for (let i = 0; i < dataset.numObjects; i++) {
    if (dataset.getTime(i) === time) {
      ids.push(i);
    }
  }
  return ids;
}

/**
 * Returns the motion deltas for the visible objects at a given timepoint. If multiple timesteps
 * are requested, the deltas are averaged across the timesteps, skipping any timesteps where no
 * object is present for the track.
 * @param dataset The dataset to collect motion deltas from.
 * @param time Frame number to get motion deltas for.
 * @param numTimesteps The number of timesteps to average over. Default is 1.
 * @returns A map of object IDs to their averaged motion deltas, as [dx, dy] tuples.
 */
export function getMotionDeltas(
  dataset: Dataset,
  time: number,
  numTimesteps: number = 1
): Map<number, [number, number] | undefined> {
  const visibleIds = getAllIdsAtTime(dataset, time);
  const visibleTracksToIds = new Map(visibleIds.map((id) => [dataset.getTrackId(id), id]));
  const trackToDeltas = new Map<number, [number, number][]>();
  for (let track of visibleTracksToIds.keys()) {
    trackToDeltas.set(track, []);
  }

  let currentFrameIds = visibleIds;
  // For each track, determine centroids at the previous timepoints and calculate the delta.
  // Deltas are grouped by track ID and will be averaged at the end.
  for (let i = 0; i < numTimesteps; i++) {
    if (time - i < 0) {
      break;
    }

    const currentTime = time - i;
    const previousTime = currentTime - 1;
    const previousIds = getAllIdsAtTime(dataset, previousTime);

    for (let previousId of previousIds) {
      // Get the two IDs of objects at current and previous timepoint.
      const trackId = dataset.getTrackId(previousId);
      const currentId = visibleTracksToIds.get(trackId);

      if (!currentId || !trackToDeltas.has(trackId) || !dataset.centroids) {
        continue;
      }

      // TODO: Generalize for 3D centroids
      const previousCentroid = dataset.getCentroid(previousId);
      const currentCentroid = dataset.getCentroid(currentId);
      if (!previousCentroid || !currentCentroid) {
        continue;
      }

      const delta: [number, number] = [
        currentCentroid[0] - previousCentroid[0],
        currentCentroid[1] - previousCentroid[1],
      ];
      trackToDeltas.get(trackId)?.push(delta);
    }

    currentFrameIds = previousIds;
  }

  // Average deltas per track, then map by object IDs.
  const objectIdToAveragedDelta = new Map<number, [number, number] | undefined>();
  for (const [track, deltas] of trackToDeltas) {
    const objectId = visibleTracksToIds.get(track);
    if (!objectId) {
      continue;
    }

    if (deltas.length === 0) {
      objectIdToAveragedDelta.set(objectId, undefined);
    } else {
      const averagedDelta: [number, number] = deltas.reduce(
        (acc, delta) => [acc[0] + delta[0], acc[1] + delta[1]],
        [0, 0]
      );
      objectIdToAveragedDelta.set(objectId, [averagedDelta[0] / deltas.length, averagedDelta[1] / deltas.length]);
    }
  }
  return objectIdToAveragedDelta;
}
