import * as d3 from "d3";

import type { Dataset } from "src/colorizer";

import { DUMMY_ROOT_NODE_ID } from "./constants";
import type { LineageData, LineageDataRelationships, LineageNodeSelection, TrackInfo } from "./types";

// TODO: Move to colorizer/utils/data_utils?

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
 * Returns a d3 zoom transform that will fit the groupNode within the svgNode
 * with some padding.
 */
export function getDefaultZoomTransform(
  svgNode: SVGSVGElement,
  groupNode: SVGGElement,
  paddingPx: [number, number] = [10, 10]
): d3.ZoomTransform | null {
  const bbox = groupNode.getBBox();
  const clientWidth = svgNode.clientWidth;
  const clientHeight = svgNode.clientHeight;
  if (clientWidth === 0 || clientHeight === 0 || bbox.width === 0 || bbox.height === 0) {
    return null;
  }
  const scale = Math.min((clientWidth - paddingPx[0]) / bbox.width, (clientHeight - paddingPx[1]) / bbox.height);
  const panX = (clientWidth - bbox.width * scale) / 2 - bbox.x * scale;
  const panY = (clientHeight - bbox.height * scale) / 2 - bbox.y * scale;
  const initialTransform = d3.zoomIdentity.translate(panX, panY).scale(scale);
  return initialTransform;
}

function getCenteredZoomTransform(svgNode: SVGSVGElement, nodes: SVGGElement[]): d3.ZoomTransform | null {
  const currentTransform = d3.zoomTransform(svgNode);
  const svgRect = svgNode.getBoundingClientRect();

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const node of nodes) {
    const nodeRect = node.getBoundingClientRect();
    left = Math.min(left, nodeRect.left);
    right = Math.max(right, nodeRect.right);
    top = Math.min(top, nodeRect.top);
    bottom = Math.max(bottom, nodeRect.bottom);
  }

  const width = right - left;
  const height = bottom - top;
  if (width === 0 || height === 0) {
    return null;
  }
  let scaleFactor = 1;
  if (width > svgRect.width || height > svgRect.height) {
    // If group of nodes is larger than viewport, scale down to fit within the viewport
    scaleFactor = Math.min(svgRect.width / width, svgRect.height / height);
  }

  // Screen coordinates
  const nodeCenterX = (left + right) / 2 - svgRect.left;
  const nodeCenterY = (top + bottom) / 2 - svgRect.top;
  // Local coordinates (relative to parent group)
  const localX = (nodeCenterX - currentTransform.x) / currentTransform.k;
  const localY = (nodeCenterY - currentTransform.y) / currentTransform.k;
  const newScale = currentTransform.k * scaleFactor;

  return new d3.ZoomTransform(
    newScale,
    svgNode.clientWidth / 2 - newScale * localX,
    svgNode.clientHeight / 2 - newScale * localY
  );
}

export function isNodeVisible(node: SVGGElement, svgNode: SVGSVGElement): boolean {
  // TODO: Use getBoundingClientRect?
  const svgRect = svgNode.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  return (
    nodeRect.right >= svgRect.left &&
    nodeRect.left <= svgRect.right &&
    nodeRect.bottom >= svgRect.top &&
    nodeRect.top <= svgRect.bottom
  );
}

/**
 * Checks if the specified track IDs are visible in the viewport. If any track
 * is not visible, animates the zoom to the center of all the specified tracks.
 *
 * @param svgNode The SVG element containing the lineage graph.
 * @param nodeSelection The D3 selection of nodes in the lineage graph.
 * @param trackIds The set of track IDs to zoom to if not visible.
 * @param zoom The D3 zoom behavior.
 */
export function zoomToTracksIfNotVisible(
  svgNode: SVGSVGElement | null,
  nodeSelection: LineageNodeSelection | undefined,
  trackIds: Set<number>,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
): void {
  if (!svgNode || !nodeSelection) {
    return;
  }
  const svg = d3.select(svgNode);
  const nodes = nodeSelection.filter((d) => trackIds.has(d.data.id));
  const nodeElements = nodes.nodes() as SVGGElement[];
  const needsZoom = nodeElements.some((nodeElement) => !isNodeVisible(nodeElement, svgNode));
  if (!needsZoom) {
    return;
  }
  const newTransform = getCenteredZoomTransform(svgNode, nodeElements);
  svg.transition().duration(750).call(zoom.transform, newTransform);
}

/**
 * Returns a d3 hierarchy of the lineage data. If there are multiple root nodes
 * (e.g. nodes with no parents), a dummy root node with a track ID of
 * DUMMY_ROOT_NODE_ID will be created as the parent of all root nodes.
 * @returns the root of the hierarchy, or undefined if there are no root nodes
 * (indicating no nodes or a cyclical graph).
 */
export function getTreeHierarchy(
  data: LineageData,
  relationships: LineageDataRelationships
): d3.HierarchyNode<TrackInfo> | undefined {
  if (data.trackIdToTrackInfo.size === 0) {
    return undefined;
  }

  const { idToChildrenRenderable, idToParents } = relationships;
  const trackIdToTrackInfo = new Map(data.trackIdToTrackInfo);
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
  const relatedIds = new Set([...trackIds]);
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
