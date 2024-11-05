import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { ColorRampData } from "../colors/color_ramps";
import { FeatureThreshold, isThresholdCategorical, isThresholdNumeric, ThresholdType } from "../types";

import ColorRamp from "../ColorRamp";
import Dataset, { FeatureType } from "../Dataset";
import Track from "../Track";

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

export type TrackData = {
  ids: number[];
  times: number[];
  centroids: number[];
};

export function makeDataOnlyTracks(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids: Uint16Array
): Map<number, TrackData> {
  const trackIdToTrackData = new Map<number, TrackData>();

  for (let i = 0; i < trackIds.length; i++) {
    const trackId = trackIds[i];
    let trackData = trackIdToTrackData.get(trackId);
    if (!trackData) {
      trackData = { ids: [], times: [], centroids: [] };
      trackIdToTrackData.set(trackId, trackData);
    }
    trackData.ids.push(i);
    trackData.times.push(times[i]);
    trackData.centroids.push(centroids[i * 2], centroids[i * 2 + 1]);
  }

  // Sort track data by time
  for (const trackData of trackIdToTrackData.values()) {
    const indices = [...trackData.times.keys()];
    indices.sort((a, b) => trackData.times[a] - trackData.times[b]);
    trackData.times = indices.map((i) => trackData.times[i]);
    trackData.ids = indices.map((i) => trackData.ids[i]);
    trackData.centroids = indices.reduce((result, i) => {
      result.push(trackData.centroids[i * 2], trackData.centroids[i * 2 + 1]);
      return result;
    }, [] as number[]);
  }
  return trackIdToTrackData;
}

/**
 * Returns a list of centroid deltas for each object ID in the track. Deltas are calculated
 * as the difference between the centroid at a timepoint and the centroid at the
 * previous timepoint. Up to `numTimesteps` deltas are returned for each object ID.
 * @param track
 * @param numTimesteps
 * @returns
 */
function getTrackMotionDeltas(track: TrackData, numTimesteps: number): { [key: number]: [number, number][] } {
  const deltas: { [key: number]: [number, number][] } = {};

  for (let i = 0; i < track.ids.length; i++) {
    const objectId = track.ids[i];
    const minTime = track.times[i] - numTimesteps;
    deltas[objectId] = [];

    for (let j = 0; j < numTimesteps; j++) {
      // Note that `track.times` is only guaranteed to be ordered, not contiguous.
      // Check for adjacent, contiguous timepoints that are within the time range.
      const currentObjectTime = track.times[i - j];
      const previousObjectTime = track.times[i - j - 1];

      if (currentObjectTime - 1 !== previousObjectTime) {
        continue;
      } else if (previousObjectTime < minTime) {
        break;
      }

      const currentCentroidX = track.centroids[(i - j) * 2];
      const currentCentroidY = track.centroids[(i - j) * 2 + 1];
      const prevCentroidX = track.centroids[(i - j - 1) * 2];
      const prevCentroidY = track.centroids[(i - j - 1) * 2 + 1];
      deltas[objectId].push([currentCentroidX - prevCentroidX, currentCentroidY - prevCentroidY]);
    }
  }
  return deltas;
}

/**
 * Calculates an array of motion deltas for each object in the dataset, averaged over the specified number of timesteps.
 * @param dataset The dataset to calculate motion deltas for.
 * @param numTimesteps The number of timepoints to average over.
 * @param timestepThreshold The minimum number of timepoints the object must have available centroid data for (our of the last
 * `numTimesteps` time points) to be included. For example, if `numTimesteps` is 3 and `timestepThreshold` is 2, the object must
 * exist for at least 2 of the last 3 timepoints to be included in the output.
 * @returns an array of motion deltas, with length equal to `dataset.numObjects * 2`. For each object id `i`, the x and y components
 * of its motion delta are stored at indices `2 * i` and `2 * i + 1`, respectively. If an object does not meet the
 * `timestepThreshold`, both values will be `NaN`.
 */
export function calculateMotionDeltas(
  tracks: TrackData[],
  numTimesteps: number,
  timestepThreshold: number
): Float32Array {
  // Count total objects to allocate the motion deltas array
  let numObjects = 0;
  for (const track of tracks) {
    numObjects += track.ids.length;
  }
  const motionDeltas = new Float32Array(numObjects * 2);

  for (const track of tracks) {
    const objectIdToDeltas = getTrackMotionDeltas(track, numTimesteps);

    for (const [stringObjectId, deltas] of Object.entries(objectIdToDeltas)) {
      const objectId = parseInt(stringObjectId, 10);

      // Check that the object has enough deltas to meet the threshold; if so
      // average and store the delta.
      if (deltas.length >= timestepThreshold) {
        const averagedDelta: [number, number] = deltas.reduce(
          (acc, delta) => [acc[0] + delta[0] / deltas.length, acc[1] + delta[1] / deltas.length],
          [0, 0]
        );
        motionDeltas[2 * objectId] = averagedDelta[0];
        motionDeltas[2 * objectId + 1] = averagedDelta[1];
      } else {
        // TODO: These may need to become Infinity for shader compatibility
        motionDeltas[2 * objectId] = NaN;
        motionDeltas[2 * objectId + 1] = NaN;
      }
    }
  }

  return motionDeltas;
}
