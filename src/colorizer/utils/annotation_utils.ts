import type Dataset from "src/colorizer/Dataset";

export type LookupInfo = {
  trackIds: number[];
  trackToIds: Map<string, number[]>;
  valueToTracksToIds?: Map<string, Map<number, number[]>>;
};

export function getEmptyLookupInfo(): LookupInfo {
  return { trackIds: [], trackToIds: new Map(), valueToTracksToIds: new Map() };
}

/**
 * Organizes the provided annotation data by track and value for easier
 * display/rendering.
 * @param dataset
 * @param ids An array of annotated IDs. Assumes that IDs are sorted from oldest
 * to newest.
 * @param idToValue A lookup from ID to a string value, used by multi-value
 * annotations. `undefined` for boolean annotations.
 * @param valueToIds A lookup from string value to a set of IDs, used by
 * multi-value annotations. `undefined` for boolean annotations.
 * @returns an object with the following properties:
 * - trackIds: an array of unique track IDs, sorted from newest to oldest.
 * - trackToIds: a map from track ID to an array of IDs that are part of the
 *   track.
 * - valueToTracksToIds: `undefined` if `idToValue` and `valueToIds` are not
 *   provided. Otherwise, maps from a string `value` to another map, which maps
 *   from a track ID number to the array of IDs that are part of the track AND
 *   have the `value` applied.
 */
export function getTrackLookups(
  dataset: Dataset,
  ids: number[],
  idToValue: Map<number, string> | undefined,
  valueToIds: Map<string, Set<number>> | undefined
): LookupInfo {
  const trackToIds: Map<string, number[]> = new Map();
  const valueToTracksToIds: Map<string, Map<number, number[]>> = new Map();
  const trackIds: Set<number> = new Set();

  const hasValueInfo = idToValue !== undefined && valueToIds !== undefined;

  // Reverse the order of IDs so that the most recently added IDs are at the
  // front of the list.
  const idsReversed = [...ids].reverse();
  for (const id of idsReversed) {
    const trackId = dataset.getTrackId(id);
    const trackIdString = trackId.toString();
    if (!trackToIds.has(trackIdString)) {
      trackToIds.set(trackIdString, [id]);
    } else {
      const ids = trackToIds.get(trackIdString);
      if (ids) {
        ids.push(id);
      }
    }

    trackIds.add(trackId);

    // Store value information.
    if (hasValueInfo) {
      const value = idToValue.get(id);
      if (!value) {
        continue;
      }
      if (!valueToTracksToIds.has(value)) {
        valueToTracksToIds.set(value, new Map());
      }
      const trackIdToIds = valueToTracksToIds.get(value)!;
      if (!trackIdToIds.has(trackId)) {
        trackIdToIds.set(trackId, [id]);
      } else {
        const ids = trackIdToIds.get(trackId);
        if (ids) {
          ids.push(id);
        }
      }
    }
  }

  return {
    trackIds: Array.from(trackIds),
    trackToIds,
    valueToTracksToIds: hasValueInfo ? valueToTracksToIds : undefined,
  };
}
