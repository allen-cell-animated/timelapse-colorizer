import { useEffect, useMemo, useRef } from "react";

import type { Track } from "src/colorizer";
import type { ContextMenuItem } from "src/components/Menus/RightClickContextMenu";

import { matchesAllAncestors, matchesAllDescendants, type TreeExpandedState } from "./tree_utils";
import { type LineageData, type LineageDataRelationships, TreeTraversalDirection } from "./types";

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
};

type ContextMenuCallbacks = {
  resetView: () => void;
  setRelativesSelected: (trackId: number, direction: TreeTraversalDirection, selected: boolean) => void;
  // Optional-- expandable/collapsible views only
  expandAllChildren?: (trackId: number) => void;
  collapseAllChildren?: (trackId: number) => void;
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
