import type { Dataset } from "src/colorizer";

import type { LineageData, LineageDataRelationships, TrackInfo } from "./types";

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
  const trackIdToTrackInfo = new Map<number, TrackInfo>();
  for (let i = 0; i < tracks.length; i++) {
    const trackId = tracks[i];
    const time = times[i];

    if (!trackIdToTrackInfo.has(trackId)) {
      trackIdToTrackInfo.set(trackId, { id: trackId, length: 1, startTime: time });
    } else {
      const info = trackIdToTrackInfo.get(trackId)!;
      info.length += 1;
      info.startTime = Math.min(info.startTime, time);
    }
    allTracks.add(trackId);
  }

  const skippedEdges: [number, number][] = [];
  const edges: [number, number][] = [];
  for (let i = 0; i < trackEdges.length; i += 2) {
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

export function getLineageRelationships(data: LineageData): LineageDataRelationships {
  const trackIds = Array.from(data.trackIdToTrackInfo.keys());
  const idToChildren = new Map<number, number[]>(trackIds.map((id) => [id, []]));
  const idToChildrenRenderable = new Map<number, number[]>(trackIds.map((id) => [id, []]));
  const idToParents = new Map<number, number[]>(trackIds.map((id) => [id, []]));

  // Links to a node where the node already has a parent (i.e. the second parent
  // of a merge node).
  const multiparentEdges: [number, number][] = [];
  const idsWithParents = new Set<number>();

  for (const [source, target] of data.edges) {
    if (!idsWithParents.has(target)) {
      idToChildrenRenderable.get(source)?.push(target);
    } else {
      // If the target node already has a parent, intentionally prevent adding
      // it to the children of this source node or else it will be duplicated in
      // the tree. Instead, add it to a list of cross links that will be
      // rendered separately.
      multiparentEdges.push([source, target]);
    }
    idToChildren.get(source)?.push(target);
    idToParents.get(target)?.push(source);
    idsWithParents.add(target);
  }
  return { idToChildren, idToChildrenRenderable, idToParents, multiparentEdges };
}
