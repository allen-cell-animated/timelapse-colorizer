import type { LineageData, LineageDataRelationships, TrackInfo } from "src/colorizer/types";
import { getLineageRelationships } from "src/colorizer/utils/lineage_utils";

type SampleLineageData = {
  lineageData: LineageData;
  relationships: LineageDataRelationships;
};

function makeTrackIdToData(numTracks: number): Map<number, TrackInfo> {
  const trackIds = Array.from({ length: numTracks }, (_, i) => i + 1);
  return new Map(trackIds.map((id) => [id, { id, length: 1, startTime: 0 }]));
}

const basicTreeLineageData = {
  trackIdToTrackInfo: makeTrackIdToData(9),
  edges: [
    [1, 2],
    [2, 3],
    [2, 4],
    [1, 5],
    [5, 6],
    [5, 7],
    [6, 8],
    [7, 8],
    [7, 9],
  ],
} satisfies LineageData;

/**
 * @example
 * ```
 * 1 -> 2 -> 3
 *  \    \
 *   \    -> 4
 *    \
 *      -> 5 -> 6 -> 8
 *          \    /
 *           -> 7 -> 9
 * ```
 */
export const EXAMPLE_TREE: SampleLineageData = {
  lineageData: basicTreeLineageData,
  relationships: getLineageRelationships(basicTreeLineageData),
};

const mergeTreeLineageData = {
  trackIdToTrackInfo: makeTrackIdToData(13),
  edges: [
    [1, 2],
    [2, 3],
    [2, 4],
    [4, 5],
    [3, 5],
    [5, 6],
    [5, 7],
    [7, 8],
    [7, 9],
    [8, 10],
    [9, 10],
    [10, 11],
    [10, 12],
    [1, 13],
  ],
} satisfies LineageData;

export const EXAMPLE_MERGE_TREE: SampleLineageData = {
  lineageData: mergeTreeLineageData,
  relationships: getLineageRelationships(mergeTreeLineageData),
};
