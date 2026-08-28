import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";

import type { Track } from "src/colorizer";
import type { LineageData, LineageDataRelationships, TrackInfo } from "src/colorizer/types";
import { TreeTraversalDirection } from "src/colorizer/types";
import { matchesAllAncestors, matchesAllDescendants } from "src/colorizer/utils/lineage_utils";
import type { ContextMenuItem } from "src/components/Menus/RightClickContextMenu";

import { DUMMY_ROOT_NODE_ID } from "./constants";
import type { TreeExpandedState } from "./tree_utils";
import type { LineageNodeSelection } from "./types";

// MARK: D3 Logic

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

// MARK: Hooks

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

// MARK: Context menu

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
  setRelativesSelected: (trackId: number, direction: TreeTraversalDirection, selected: boolean) => void;
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
        onClick:
          hoveredId !== null
            ? () => callbacks.setRelativesSelected(hoveredId, TreeTraversalDirection.ANCESTORS, true)
            : undefined,
        visible: !areTrackAndAllParentsSelected,
      },
      {
        label: "Deselect track + all parents",
        disabled: hoveredId === null || !idHasParents,
        onClick:
          hoveredId !== null
            ? () => callbacks.setRelativesSelected(hoveredId, TreeTraversalDirection.ANCESTORS, false)
            : undefined,
        visible: areTrackAndAllParentsSelected,
      },
      {
        label: "Select track + all children",
        disabled: hoveredId === null || !idHasChildren,
        onClick:
          hoveredId !== null
            ? () => callbacks.setRelativesSelected(hoveredId, TreeTraversalDirection.DESCENDANTS, true)
            : undefined,
        visible: !areTrackAndAllChildrenSelected,
      },
      {
        label: "Deselect track + all children",
        disabled: hoveredId === null || !idHasChildren,
        onClick:
          hoveredId !== null
            ? () => callbacks.setRelativesSelected(hoveredId, TreeTraversalDirection.DESCENDANTS, false)
            : undefined,
        visible: areTrackAndAllChildrenSelected,
      },
      {
        label: "Options...",
        children: [
          {
            label: (!data.applyTrackColorToRelatives ? "☑ " : "☐ ") + "Use random outline colors",
            onClick: () => callbacks.setApplyTrackColorToRelatives?.(!data.applyTrackColorToRelatives),
            visible: true,
          },
        ],
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
