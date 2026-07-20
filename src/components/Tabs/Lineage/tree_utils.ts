import type { LineageData, LineageDataRelationships, TrackInfo } from "./types";

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
function forEachParent(
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
function forEachChild(
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

export type TreeExpandedState = {
  /**
   * Set of track IDs that are currently expanded. Tracks that aren't are
   * rendered as collapsed.
   *
   * This follows a few rules:
   * 1. If a track is expanded, its ancestors up to a root node must also be
   *    expanded.
   * 2. If a track is collapsed, all of its descendants must also be collapsed.
   * 3. All coparents (parents that share the same child) must share the same
   *    collapsed/expanded state, so that all parents of a merge node are
   *    visible. (Rules #1 and #2 also apply here.)
   */
  expandedTracks: Set<number>;
  /**
   * Set of tracks that were previously expanded, but are currently collapsed
   * due to a parent track being collapsed. This is used to restore the expanded
   * state when a parent track is expanded again.
   */
  previouslyExpandedTracks: Set<number>;
};

export function expandTrack(
  trackId: number,
  expandedState: TreeExpandedState,
  data: LineageData,
  relationships: LineageDataRelationships
): TreeExpandedState {
  const { expandedTracks: _expandedTracks, previouslyExpandedTracks: _previouslyExpandedTracks } = expandedState;
  const expandedTracks = new Set<number>(_expandedTracks);
  const previouslyExpandedTracks = new Set<number>(_previouslyExpandedTracks);

  if (!data.trackIdToTrackInfo.has(trackId)) {
    return {
      expandedTracks,
      previouslyExpandedTracks,
    };
  }

  // Add current track to expanded tracks and previously expanded tracks
  expandedTracks.add(trackId);
  previouslyExpandedTracks.add(trackId);

  // Expand all ancestors + any previously expanded children for this track (and
  // any other tracks it may be a coparent with).
  const coparentIds = relationships.idToCoparents.get(trackId) ?? new Set();
  const ids = coparentIds.size > 0 ? coparentIds : new Set([trackId]);
  for (const id of ids) {
    expandedTracks.add(id);
    previouslyExpandedTracks.add(id);
    // Expand all parents of the node, up to a root node.
    forEachParent(id, data.trackIdToTrackInfo, relationships.idToParents, (parentData) => {
      expandedTracks.add(parentData.id);
      previouslyExpandedTracks.add(parentData.id);
      return true;
    });
    // Traverse children, expand if previously expanded too.
    forEachChild(id, data.trackIdToTrackInfo, relationships.idToChildren, (childData) => {
      if (previouslyExpandedTracks.has(childData.id)) {
        expandedTracks.add(childData.id);
        return true;
      }
      return false;
    });
  }
  return {
    expandedTracks,
    previouslyExpandedTracks,
  };
}

export function collapseTrack(
  trackId: number,
  expandedState: TreeExpandedState,
  data: LineageData,
  relationships: LineageDataRelationships
): TreeExpandedState {
  const { expandedTracks: _expandedTracks, previouslyExpandedTracks: _previouslyExpandedTracks } = expandedState;
  const expandedTracks = new Set<number>(_expandedTracks);
  const previouslyExpandedTracks = new Set<number>(_previouslyExpandedTracks);

  if (!data.trackIdToTrackInfo.has(trackId)) {
    return {
      expandedTracks,
      previouslyExpandedTracks,
    };
  }

  // Remove current track and its coparents
  let coparentIds = relationships.idToCoparents.get(trackId);
  if (!coparentIds || coparentIds.size === 0) {
    coparentIds = new Set([trackId]);
  }
  for (const coparentId of coparentIds) {
    expandedTracks.delete(coparentId);
    previouslyExpandedTracks.delete(coparentId);
  }

  // Remove all children of the track from the expanded set.
  const traversedNodes = new Set<number>([trackId]);
  const collapseAllChildren = (trackId: number): void => {
    forEachChild(trackId, data.trackIdToTrackInfo, relationships.idToChildren, (childData) => {
      if (traversedNodes.has(childData.id)) {
        return false;
      }
      expandedTracks.delete(childData.id);
      traversedNodes.add(childData.id);

      // Check coparents
      const coparents = relationships.idToCoparents.get(childData.id) ?? new Set();
      for (const coparentId of coparents) {
        if (traversedNodes.has(coparentId)) {
          continue;
        } else {
          if (expandedTracks.has(coparentId)) {
            expandedTracks.delete(coparentId);
            traversedNodes.add(coparentId);
            collapseAllChildren(coparentId);
          }
        }
      }
      // Check if any of the child node's parents are still expanded.
      const parentIds = relationships.idToParents.get(childData.id) ?? [];
      if (parentIds.length > 1) {
        for (const parentId of parentIds) {
          if (traversedNodes.has(parentId)) {
            continue;
          } else if (expandedTracks.has(parentId)) {
            // Collapse the parent if currently expanded (and all of its
            // children)
            expandedTracks.delete(parentId);
            traversedNodes.add(parentId);
            collapseAllChildren(parentId);
          }
        }
      }
      return true;
    });
  };
  collapseAllChildren(trackId);

  return {
    expandedTracks,
    previouslyExpandedTracks,
  };
}

export function getInitialExpandedState(
  trackIds: Set<number>,
  data: LineageData,
  relationships: LineageDataRelationships
): TreeExpandedState {
  let state = {
    expandedTracks: new Set<number>(),
    previouslyExpandedTracks: new Set<number>(),
  };
  for (const trackId of trackIds) {
    state = expandTrack(trackId, state, data, relationships);
  }
  return state;
}
