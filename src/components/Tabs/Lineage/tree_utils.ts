import { TrackInfo } from "./types";

/**
 * Recursively calls the provided callback function for all ancestors (parents,
 * grandparents, etc.) of the provided track ID. If the callback returns false,
 * the recursion will not continue for that parent.
 * @param trackId The track ID of the node to start traversing from. The
 * callback is not called on this node.
 * @param trackIdToData Map from track ID to its TrackInfo data.
 * @param idToParents Map from track ID to its parent track IDs. (May be
 * multiple parents in the case of a merge node.)
 * @param callback The callback function to call for each parent track. Return
 * true to continue traversing the parents of that track, or false to stop.
 */
export function forEachParent(
  trackId: number | undefined,
  trackIdToData: Map<number, TrackInfo>,
  idToParents: Map<number, number[]>,
  callback: (parent: TrackInfo) => boolean
): void {
  if (!trackId) {
    return;
  }
  const parents = idToParents.get(trackId) ?? [];
  for (const parentId of parents) {
    const parentData = trackIdToData.get(parentId);
    if (parentData) {
      if (!callback(parentData)) {
        continue;
      }
      forEachParent(parentId, trackIdToData, idToParents, callback);
    }
  }
}

/**
 * Calls the provided callback function for each descendant (children,
 * grandchildren, etc.) of the provided track ID. If the callback returns false,
 * the recursion will not continue for that child.
 * @param trackId The track ID of the node to start traversing from. The
 * callback is not called on this node.
 * @param trackIdToData Map from track ID to its TrackInfo data.
 * @param idToChildren Map from track ID to its children track IDs.
 * @param callback The callback function to call for each child track. Return
 * true to continue traversing the children of that track, or false to stop.
 */
export function forEachChild(
  trackId: number,
  trackIdToData: Map<number, TrackInfo>,
  idToChildren: Map<number, number[]>,
  callback: (child: TrackInfo) => boolean
): void {
  if (!trackId) {
    return;
  }
  const children = idToChildren.get(trackId) ?? [];
  for (const childId of children) {
    const childNode = trackIdToData.get(childId);
    if (childNode) {
      if (!callback(childNode)) {
        continue;
      }
      forEachChild(childId, trackIdToData, idToChildren, callback);
    }
  }
}
