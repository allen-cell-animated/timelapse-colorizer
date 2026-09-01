import type * as d3 from "d3";

import type { LineageData, LineageDataRelationships, TrackInfo } from "./types";

/**
 * Calls a callback function for each relative (ancestor or descendant) of a
 * track ID, recursively.
 */
function forEachRelative(
  trackId: number,
  trackIdToData: Map<number, TrackInfo>,
  idToRelatives: Map<number, number[]>,
  callback: (parent: TrackInfo) => boolean | void,
  seenIds: Set<number>
): void {
  const relatives = idToRelatives.get(trackId) ?? [];
  for (const relativeId of relatives) {
    if (seenIds.has(relativeId)) {
      continue;
    }
    seenIds.add(relativeId);
    const parentData = trackIdToData.get(relativeId);
    if (parentData) {
      if (callback(parentData) === false) {
        continue;
      }
      forEachRelative(relativeId, trackIdToData, idToRelatives, callback, seenIds);
    }
  }
}

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
 * false to stop traversing the parents of the track.
 */
export function forEachAncestor(
  trackId: number,
  trackIdToData: Map<number, TrackInfo>,
  idToParents: Map<number, number[]>,
  callback: (parent: TrackInfo) => boolean | void
): void {
  const seenIds = new Set<number>();
  forEachRelative(trackId, trackIdToData, idToParents, callback, seenIds);
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
 * false to stop traversing the children of the track.
 */
export function forEachDescendant(
  trackId: number,
  trackIdToData: Map<number, TrackInfo>,
  idToChildren: Map<number, number[]>,
  callback: (child: TrackInfo) => boolean | void
): void {
  const seen = new Set<number>();
  forEachRelative(trackId, trackIdToData, idToChildren, callback, seen);
}

/** Returns true if all descendants match the provided validator function. */
export function matchesAllDescendants(
  trackId: number,
  validator: (trackId: number) => boolean,
  data: LineageData,
  relationships: LineageDataRelationships
): boolean {
  let allMatch = true;
  forEachDescendant(trackId, data.trackIdToTrackInfo, relationships.idToChildren, (child) => {
    if (!allMatch || !validator(child.id)) {
      allMatch = false;
      return false;
    }
    return true;
  });
  return allMatch;
}

/** Returns true if all ancestors match the provided validator function. */
export function matchesAllAncestors(
  trackId: number,
  validator: (trackId: number) => boolean,
  data: LineageData,
  relationships: LineageDataRelationships
): boolean {
  let allMatch = true;
  forEachAncestor(trackId, data.trackIdToTrackInfo, relationships.idToParents, (parent) => {
    if (!allMatch || !validator(parent.id)) {
      allMatch = false;
      return false;
    }
    return true;
  });
  return allMatch;
}

/** Returns the set of ancestor track IDs for the given track. */
export function getAncestors(trackId: number, data: LineageData, relationships: LineageDataRelationships): Set<number> {
  const ancestors: Set<number> = new Set();
  forEachAncestor(trackId, data.trackIdToTrackInfo, relationships.idToParents, (parent) => {
    ancestors.add(parent.id);
    return true;
  });
  return ancestors;
}

/** Returns the set of descendant track IDs for the given track. */
export function getDescendants(
  trackId: number,
  data: LineageData,
  relationships: LineageDataRelationships
): Set<number> {
  const descendants: Set<number> = new Set();
  forEachDescendant(trackId, data.trackIdToTrackInfo, relationships.idToChildren, (child) => {
    descendants.add(child.id);
    return true;
  });
  return descendants;
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
   * The set of tracks that are either currently expanded, or were previously
   * expanded but hidden when a parent was collapsed. This is used to restore
   * the expanded state of children when a parent is collapsed and re-expanded.
   *
   * For example, let's say our tree is `A -> B -> C`, and the user has all
   * three tracks expanded. If `A` is collapsed, only `A` should be removed from
   * the `previouslyExpandedTracks` set, and `B` and `C` should remain in the
   * set. Then, if `A` is re-expanded, `previouslyExpandedTracks` can be used to
   * restore the expanded state of `B` and `C`.
   */
  previouslyExpandedTracks: Set<number>;
};

export const EMPTY_EXPANDED_STATE: TreeExpandedState = {
  expandedTracks: new Set<number>(),
  previouslyExpandedTracks: new Set<number>(),
};

/**
 * Expands the provided track ID and all of its ancestors. If the track has any
 * coparents, they will also be expanded. Also, if the track has any children
 * that were previously expanded, they will be re-expanded as well.
 * @returns a new TreeExpandedState with the updated expanded tracks.
 */
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

  // Mark current track as expanded.
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
    forEachAncestor(id, data.trackIdToTrackInfo, relationships.idToParents, (parentData) => {
      expandedTracks.add(parentData.id);
      previouslyExpandedTracks.add(parentData.id);
      return true;
    });
    // Traverse children, expand if previously expanded too.
    forEachDescendant(id, data.trackIdToTrackInfo, relationships.idToChildren, (childData) => {
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

/**
 * Collapses a track and all of its descendants. If the track has any coparents,
 * they will also be collapsed.
 * @returns a new TreeExpandedState with the updated expanded tracks.
 */
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
  const traversedNodes = new Set<number>(coparentIds);
  const collapseAllChildren = (trackId: number): void => {
    forEachDescendant(trackId, data.trackIdToTrackInfo, relationships.idToChildren, (childData) => {
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
      // Check if any of the child node's other parents are still expanded.
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
  for (const trackId of coparentIds) {
    collapseAllChildren(trackId);
  }

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

/**
 * Adjusts the position of merge nodes so they are aligned with the average of
 * their parents' positions. This fixes an alignment issue with the current
 * workaround for `d3.tree()` not handling multi-parent nodes.
 *
 * Note that this assumes that the parents of merge nodes are usually siblings
 * or adjacent on the tree.
 */
export function alignMergeNodes(
  treeRoot: d3.HierarchyPointNode<TrackInfo>,
  data: LineageData,
  relationships: LineageDataRelationships
): void {
  const idToTreeNode = new Map<number, d3.HierarchyPointNode<TrackInfo>>();
  treeRoot.each((node) => {
    idToTreeNode.set(node.data.id, node);
  });
  const mergeNodes = [...relationships.idToParents.entries()]
    .filter(([, parents]) => parents.length > 1)
    .map(([id]) => id);
  // Sort merge nodes by depth; this way parents (and their subtrees) will be
  // aligned before descendants.
  const sortedMergeNodeIds = mergeNodes.sort((a, b) => {
    const nodeA = idToTreeNode.get(a);
    const nodeB = idToTreeNode.get(b);
    if (!nodeA || !nodeB) {
      return 0;
    }
    return nodeA.depth - nodeB.depth;
  });

  // For each merge node, align its X position with the average of its parents.
  // Then, apply the same offset for all of its descendants (so the entire
  // subtree is shifted together).
  for (const mergeNodeId of sortedMergeNodeIds) {
    const parents = relationships.idToParents.get(mergeNodeId) ?? [];
    const parentNodes = parents.map((parentId) => idToTreeNode.get(parentId)).filter((node) => node !== undefined);
    if (parentNodes.length <= 1) {
      continue;
    }

    const avgX = parentNodes.reduce((sum, parentNode) => sum + parentNode.x, 0) / parentNodes.length;
    const node = idToTreeNode.get(mergeNodeId);
    if (node === undefined) {
      continue;
    }

    const offset = avgX - node.x;
    node.x += offset;
    forEachDescendant(mergeNodeId, data.trackIdToTrackInfo, relationships.idToChildren, (descendantData) => {
      const descendantNode = idToTreeNode.get(descendantData.id);
      if (descendantNode) {
        descendantNode.x += offset;
      }
      return true;
    });
  }
}
