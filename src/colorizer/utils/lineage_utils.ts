import type Dataset from "src/colorizer/Dataset";
import type { LineageData, LineageDataRelationships, TrackInfo } from "src/colorizer/types";

// MARK: Lineage Relationships

export function getLineageData(dataset: Dataset): LineageData {
  const tracks = dataset.trackIds;
  const times = dataset.times;
  // Get first track edge (TODO: handle multiple track edges in the future?)
  const defaultTrackKey = dataset.getDefaultTrackKey();
  const trackData = defaultTrackKey ? dataset.getTrackData(defaultTrackKey) : undefined;
  const trackEdges = trackData?.trackEdges;
  if (!tracks || !times || !trackEdges) {
    return { trackIdToTrackInfo: new Map<number, TrackInfo>(), edges: [] };
  }

  const allTracks = new Set<number>();
  const trackToTimeMinMax = new Map<number, { min: number; max: number }>();
  for (let id = 0; id < tracks.length; id++) {
    const trackId = tracks[id];
    const time = times[id];

    if (!trackToTimeMinMax.has(trackId)) {
      trackToTimeMinMax.set(trackId, { min: time, max: time });
    } else {
      const timeMinMax = trackToTimeMinMax.get(trackId)!;
      timeMinMax.min = Math.min(timeMinMax.min, time);
      timeMinMax.max = Math.max(timeMinMax.max, time);
    }
    allTracks.add(trackId);
  }

  const trackIdToTrackInfo = new Map<number, TrackInfo>();
  for (const trackId of allTracks) {
    const timeMinMax = trackToTimeMinMax.get(trackId)!;
    trackIdToTrackInfo.set(trackId, {
      length: timeMinMax.max - timeMinMax.min + 1,
      startTime: timeMinMax.min,
      id: trackId,
    });
  }

  const skippedEdges: [number, number][] = [];
  const edges: [number, number][] = [];
  if (trackEdges.length % 2 !== 0) {
    console.warn(`Track edges array has an odd length (${trackEdges.length}), skipping the last edge.`);
  }
  for (let i = 0; i + 1 < trackEdges.length; i += 2) {
    const source = trackEdges[i];
    const target = trackEdges[i + 1];
    // Skip edges that do not exist in the dataset
    if (!allTracks.has(source) || !allTracks.has(target)) {
      skippedEdges.push([source, target]);
      continue;
    }
    edges.push([source, target]);
  }

  if (skippedEdges.length > 0) {
    console.warn(`Skipped ${skippedEdges.length} edges that reference non-existent tracks:`, skippedEdges);
  }
  return { trackIdToTrackInfo, edges };
}

export function getCoparents(
  idToChildren: Map<number, number[]>,
  idToParents: Map<number, number[]>
): Map<number, Set<number>> {
  const idToCoparents = new Map<number, Set<number>>();

  for (const [id, childIds] of idToChildren.entries()) {
    if (childIds.length === 0) {
      continue;
    }
    // Get parents of the children of this id, including self
    const parents = new Set<number>([id]);
    for (const childId of childIds) {
      const childParents = idToParents.get(childId) ?? [];
      childParents.forEach(parents.add, parents);
    }
    if (parents.size === 1) {
      continue;
    }
    idToCoparents.set(id, parents);
  }
  return idToCoparents;
}

export function getLineageRelationships(data: LineageData): LineageDataRelationships {
  const trackIds = Array.from(data.trackIdToTrackInfo.keys());
  const idToChildren = new Map<number, number[]>(trackIds.map((id) => [id, []]));
  const idToChildrenRenderable = new Map<number, number[]>(trackIds.map((id) => [id, []]));
  const idToParents = new Map<number, number[]>(trackIds.map((id) => [id, []]));

  /**
   * Edges to a node where the node already has a parent (i.e. edges that would
   * create the second/nth parent of a merge node).
   */
  const multiparentEdges: [number, number][] = [];
  const idsWithParents = new Set<number>();

  for (const [source, target] of data.edges) {
    if (!idsWithParents.has(target)) {
      idToChildrenRenderable.get(source)?.push(target);
    } else {
      // If the target node already has a parent, intentionally prevent adding
      // it to the children of this source node or else it (and all its
      // children) will be duplicated in the tree. Instead, add it to a list of
      // edges that will be rendered separately.
      multiparentEdges.push([source, target]);
    }
    idToChildren.get(source)?.push(target);
    idToParents.get(target)?.push(source);
    idsWithParents.add(target);
  }

  // Calculate co-parents for each node (other direct parents of its direct
  // children).
  const idToCoparents = getCoparents(idToChildren, idToParents);

  return { idToChildren, idToChildrenRenderable, idToParents, idToCoparents, multiparentEdges };
}
/**
 * Returns only the subset of lineage data that includes the specified track
 * IDs and their related parents and children.
 */

export function getLineageSubset(
  data: LineageData,
  relationships: LineageDataRelationships,
  trackIds: Set<number>
): LineageData {
  const { idToParents, idToChildren } = relationships;

  // Get set of IDs + related parents and children.
  const relatedIds = new Set(trackIds);
  for (const trackId of trackIds) {
    const parents = idToParents.get(trackId) ?? [];
    const children = idToChildren.get(trackId) ?? [];
    const allRelatedIds = [...parents, ...children];
    for (const relatedId of allRelatedIds) {
      relatedIds.add(relatedId);
    }
  }

  // Filter lineage data to only include related IDs.
  const filteredData: LineageData = {
    trackIdToTrackInfo: new Map([...data.trackIdToTrackInfo.entries()].filter(([id]) => relatedIds.has(id))),
    edges: data.edges.filter(([source, target]) => relatedIds.has(source) && relatedIds.has(target)),
  };
  return filteredData;
}

// MARK: Tree Traversal

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
