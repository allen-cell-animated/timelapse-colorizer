import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";

import type { Dataset, Track } from "src/colorizer";
import type { ContextMenuItem } from "src/components/Menus/RightClickContextMenu";

import { DUMMY_ROOT_NODE_ID } from "./constants";
import { matchesAllAncestors, matchesAllDescendants, type TreeExpandedState } from "./tree_utils";
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

/**
 * Returns a new SVG zoom transform that centers the specified nodes within the
 * viewport of the svgNode. If the nodes are larger than the viewport, the scale
 * of the transform will be adjusted to fit the nodes within the viewport.
 */
function getCenteredZoomTransform(svgNode: SVGSVGElement, nodes: SVGGElement[]): d3.ZoomTransform | null {
  if (nodes.length === 0) {
    return null;
  }
  const currentTransform = d3.zoomTransform(svgNode);
  const svgRect = svgNode.getBoundingClientRect();

  const padding = 20;
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
  const svgWidth = svgRect.width - 2 * padding;
  const svgHeight = svgRect.height - 2 * padding;
  if (width === 0 || height === 0) {
    return null;
  }
  let scaleFactor = 1;
  if (width > svgWidth || height > svgHeight) {
    // If group of nodes is larger than viewport, scale down to fit within the viewport
    scaleFactor = Math.min(svgWidth / width, svgHeight / height);
  }

  // Screen coordinates
  const nodeCenterX = (left + right) / 2 - svgRect.left + padding;
  const nodeCenterY = (top + bottom) / 2 - svgRect.top + padding;
  // Local coordinates (relative to parent group)
  const localX = (nodeCenterX - currentTransform.x) / currentTransform.k;
  const localY = (nodeCenterY - currentTransform.y) / currentTransform.k;
  const newScale = currentTransform.k * scaleFactor;

  const translateX = svgNode.clientWidth / 2 - newScale * localX;
  const translateY = svgNode.clientHeight / 2 - newScale * localY;

  return d3.zoomIdentity.translate(translateX, translateY).scale(newScale);
}

/** Returns true if the node is visible in the SVG viewport. */
export function isNodeVisible(node: SVGGElement, svgNode: SVGSVGElement): boolean {
  const svgRect = svgNode.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const padding = 10;

  return (
    nodeRect.right >= svgRect.left + padding &&
    nodeRect.left <= svgRect.right - padding &&
    nodeRect.bottom >= svgRect.top + padding &&
    nodeRect.top <= svgRect.bottom - padding
  );
}

/**
 * Checks if the nodes of the specified track IDs are visible in the SVG
 * viewport. If any track is not visible, frames the tracks in view by zooming
 * and panning the SVG viewport, centered on the nodes.
 *
 * @param svgNode The SVG viewport element.
 * @param nodeSelection The D3 selection of nodes in the lineage graph, used to
 * look up nodes by track ID.
 * @param trackIds The set of track IDs to zoom to if not visible.
 * @param zoom The D3 zoom behavior. Will be animated to the new transform if
 * any of the specified tracks are not visible.
 */
export function frameTracksInView(
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
  if (!newTransform) {
    return;
  }
  svg.transition().duration(250).call(zoom.transform, newTransform);
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

/**
 * Hook that calculates the set of trackIds that are new on this render.
 *
 * @returns a set of track IDs that are new.
 */
export function useNewTracks(tracks: Map<number, Track>): Set<number> {
  const prevTracks = useRef<Set<number>>(new Set());

  const newTracks = useMemo(() => {
    const newTracks = new Set<number>();
    for (const trackId of tracks.keys()) {
      if (!prevTracks.current.has(trackId)) {
        newTracks.add(trackId);
      }
    }
    return newTracks;
  }, [tracks]);

  useEffect(() => {
    prevTracks.current = new Set(tracks.keys());
  }, [tracks]);

  return newTracks;
}

type ContextMenuData = {
  data: LineageData;
  relationships: LineageDataRelationships;
  selectedTracks: Map<number, Track>;
  // Optional-- expandable/collapsible views only
  expandedState?: TreeExpandedState;
  applyTrackColorToRelatives: boolean;
};

type ContextMenuCallbacks = {
  resetView: () => void;
  selectNodeAndChildren: (trackId: number) => void;
  selectNodeAndParents: (trackId: number) => void;
  deselectNodeAndChildren: (trackId: number) => void;
  deselectNodeAndParents: (trackId: number) => void;
  // Optional-- expandable/collapsible views only
  expandAllChildren?: (trackId: number) => void;
  collapseAllChildren?: (trackId: number) => void;
  setApplyTrackColorToRelatives: (apply: boolean) => void;
};

/**
 * Returns context menu action items for lineage views, based on the
 * track being interacted with and the current selection state.
 */
export function getLineageContextMenuItems(
  hoveredId: number | null,
  data: ContextMenuData,
  callbacks: ContextMenuCallbacks
): ContextMenuItem[][] {
  const selectedTracks = new Set<number>(data.selectedTracks.keys());

  const areTrackAndAllChildrenSelected =
    hoveredId !== null &&
    selectedTracks.has(hoveredId) &&
    matchesAllDescendants(hoveredId, (id) => selectedTracks.has(id), data.data, data.relationships);
  const areTrackAndAllParentsSelected =
    hoveredId !== null &&
    selectedTracks.has(hoveredId) &&
    matchesAllAncestors(hoveredId, (id) => selectedTracks.has(id), data.data, data.relationships);
  const idHasParents = hoveredId !== null && (data.relationships.idToParents.get(hoveredId)?.length ?? 0) > 0;
  const idHasChildren = hoveredId !== null && (data.relationships.idToChildren.get(hoveredId)?.length ?? 0) > 0;

  const items: ContextMenuItem[][] = [
    [
      {
        label: "Reset view",
        onClick: callbacks.resetView,
      },
    ],
    [
      {
        label: "Select track + all parents",
        disabled: hoveredId === null || !idHasParents,
        onClick: hoveredId !== null ? () => callbacks.selectNodeAndParents(hoveredId) : undefined,
        visible: !areTrackAndAllParentsSelected,
      },
      {
        label: "Deselect track + all parents",
        disabled: hoveredId === null || !idHasParents,
        onClick: hoveredId !== null ? () => callbacks.deselectNodeAndParents(hoveredId) : undefined,
        visible: areTrackAndAllParentsSelected,
      },
      {
        label: "Select track + all children",
        disabled: hoveredId === null || !idHasChildren,
        onClick: hoveredId !== null ? () => callbacks.selectNodeAndChildren(hoveredId) : undefined,
        visible: !areTrackAndAllChildrenSelected,
      },
      {
        label: "Deselect track + all children",
        disabled: hoveredId === null || !idHasChildren,
        onClick: hoveredId !== null ? () => callbacks.deselectNodeAndChildren(hoveredId) : undefined,
        visible: areTrackAndAllChildrenSelected,
      },
      {
        label: (data.applyTrackColorToRelatives ? "☑ " : "☐ ") + "Use one color for track relatives",
        onClick: () => callbacks.setApplyTrackColorToRelatives?.(!data.applyTrackColorToRelatives),
        visible: true,
      },
    ],
  ];

  // Add options for expanding and collapsing all children, if provided
  if (data.expandedState) {
    const { expandedTracks } = data.expandedState;
    const areAllChildrenExpanded =
      hoveredId !== null &&
      matchesAllDescendants(hoveredId, (id) => expandedTracks.has(id), data.data, data.relationships);
    items.push([
      {
        label: "Expand all children",
        disabled: hoveredId === null || !idHasChildren || !callbacks.expandAllChildren,
        onClick: hoveredId !== null ? () => callbacks.expandAllChildren?.(hoveredId) : undefined,
        visible: !areAllChildrenExpanded,
      },
      {
        label: "Collapse all children",
        disabled: hoveredId === null || !idHasChildren || !callbacks.collapseAllChildren,
        onClick: hoveredId !== null ? () => callbacks.collapseAllChildren?.(hoveredId) : undefined,
        visible: areAllChildrenExpanded,
      },
    ]);
  }

  return items;
}
