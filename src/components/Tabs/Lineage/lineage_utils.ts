import * as d3 from "d3";

import type { Dataset } from "src/colorizer";

import { DUMMY_ROOT_NODE_ID } from "./constants";
import type { LineageData, LineageDataRelationships, LineageObjectInfo, TrackInfo } from "./types";

// TODO: Move to colorizer/utils/data_utils?

export function getLineageData(dataset: Dataset): LineageData<TrackInfo> {
  const tracks = dataset.trackIds;
  const times = dataset.times;
  // Get first track edge (TODO: handle multiple track edges in the future?)
  const defaultTrackKey = dataset.getDefaultTrackKey();
  const trackData = defaultTrackKey ? dataset.getTrackData(defaultTrackKey) : undefined;
  const trackEdges = trackData?.trackEdges;
  if (!tracks || !times || !trackEdges) {
    return { idToInfo: new Map<number, TrackInfo>(), edges: [] };
  }

  const allTracks = new Set<number>();
  const trackIdToTrackInfo = new Map<number, TrackInfo>();
  for (let id = 0; id < tracks.length; id++) {
    const trackId = tracks[id];
    const time = times[id];

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
  return { idToInfo: trackIdToTrackInfo, edges };
}

export function getObjectLineageData(dataset: Dataset): LineageData<LineageObjectInfo> {
  const numObjects = dataset.numObjects;
  const trackData = dataset.getTrackData(dataset.getDefaultTrackKey() ?? "");
  const nodeEdges = trackData?.nodeEdges;
  if (!trackData || !nodeEdges) {
    return { idToInfo: new Map<number, LineageObjectInfo>(), edges: [] };
  }

  const idToInfo = new Map<number, LineageObjectInfo>();
  for (let i = 0; i < numObjects; i++) {
    const trackId = dataset.trackIds?.[i] ?? -1;
    const time = dataset.times?.[i] ?? -1;
    idToInfo.set(i, { id: i, trackId, time });
  }

  const edges: [number, number][] = [];
  for (let i = 0; i < nodeEdges.length; i += 2) {
    const source = nodeEdges[i];
    const target = nodeEdges[i + 1];
    edges.push([source, target]);
  }
  // TODO: Handle remapping from node IDs to object IDs here.
  return { idToInfo, edges };
}

export function getLineageRelationships(
  data: LineageData<TrackInfo> | LineageData<LineageObjectInfo>
): LineageDataRelationships {
  const ids = Array.from(data.idToInfo.keys());
  const idToChildren = new Map<number, number[]>(ids.map((id) => [id, []]));
  const idToChildrenRenderable = new Map<number, number[]>(ids.map((id) => [id, []]));
  const idToParents = new Map<number, number[]>(ids.map((id) => [id, []]));

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
  return { idToChildren, idToChildrenRenderable, idToParents, multiparentEdges };
}

/**
 * Returns a d3 zoom transform that will fit the groupNode within the svgNode
 * with some padding.
 */
export function getDefaultZoomTransform(
  svgNode: SVGSVGElement,
  groupNode: SVGGElement,
  paddingPx: [number, number] = [10, 10]
): d3.ZoomTransform {
  const bbox = groupNode.getBBox();
  const clientwidth = svgNode.clientWidth;
  const clientHeight = svgNode.clientHeight;
  const scale = Math.min((clientwidth - paddingPx[0]) / bbox.width, (clientHeight - paddingPx[1]) / bbox.height);
  const panX = (clientwidth - bbox.width * scale) / 2 - bbox.x * scale;
  const panY = (clientHeight - bbox.height * scale) / 2 - bbox.y * scale;
  const initialTransform = d3.zoomIdentity.translate(panX, panY).scale(scale);
  return initialTransform;
}

/**
 * Returns a d3 hierarchy of the lineage data. If there are multiple root nodes
 * (e.g. nodes with no parents), a dummy root node with a track ID of
 * DUMMY_ROOT_NODE_ID will be created as the parent of all root nodes.
 * @returns the root of the hierarchy, or undefined if there are no root nodes
 * (indicating no nodes or a cyclical graph).
 */
export function getTreeHierarchy(
  data: LineageData<TrackInfo>,
  relationships: LineageDataRelationships
): d3.HierarchyNode<TrackInfo> | undefined {
  const { idToChildrenRenderable, idToParents } = relationships;
  const trackIdToTrackInfo = new Map(data.idToInfo);
  const idToChildren = new Map(idToChildrenRenderable);

  // All nodes with no parents
  const rootNodeIds = [...idToParents.entries()].filter(([, parents]) => parents.length === 0).map(([id]) => id);

  let rootNode: TrackInfo;
  if (rootNodeIds.length === 0) {
    console.warn("No root nodes found in lineage data, skipping tree rendering.");
    return;
  } else if (rootNodeIds.length === 1) {
    rootNode = trackIdToTrackInfo.get(rootNodeIds[0])!;
  } else {
    // Multiple root nodes, make a dummy root node that is the parent of all root nodes
    rootNode = { id: DUMMY_ROOT_NODE_ID, length: 0, startTime: 0 };
    // Add dummy track info for the dummy root node
    trackIdToTrackInfo.set(rootNode.id, rootNode);
    idToChildren.set(rootNode.id, rootNodeIds);
  }

  const root = d3.hierarchy<TrackInfo>(
    rootNode,
    // Returns an array of the trackInfo for each child of a track
    (trackInfo) => {
      const childIds = idToChildren.get(trackInfo.id) ?? [];
      const childTrackInfo = childIds
        .map((id) => {
          return trackIdToTrackInfo.get(id);
        })
        .filter((trackInfo) => !!trackInfo);
      return childTrackInfo;
    }
  );

  return root;
}
