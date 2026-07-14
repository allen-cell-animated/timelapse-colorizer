import * as d3 from "d3";
import React, { MouseEvent, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import { getLineageRelationships, getLineageSubset, getTreeHierarchy } from "src/components/Tabs/Lineage/lineage_utils";
import type { LineageData, LineageDataRelationships, TrackInfo } from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

import { forEachChild, forEachParent } from "../tree_utils";

type TrackDetailLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  dataset: Dataset | null;
  data: LineageData;
  selectedTracks: Map<number, Track>;
  trackColors: Map<number, Color>;
  relationships: LineageDataRelationships;
  hierarchy: d3.HierarchyNode<TrackInfo> | null;
  time: number;
  onClick?: (info: TrackInfo, time: number) => void;
  onHover?: (info: TrackInfo | null, time: number) => void;
};

const SVG_EXPAND_BUTTON_GROUP_CLASS = "expand-button";
const SVG_COLLAPSE_BUTTON_GROUP_CLASS = "collapse-button";

const SVG_BUTTON_CLASS = "svg-button";
const SVG_BUTTON_TEXT_CLASS = "expand-button-text";
const SVG_TIME_INDICATOR_CLASS = "time-indicator";
const MAIN_NODE_CLASS = "main-node";
const TRACK_LABEL_CLASS = "track-label";

const TREE_LEAF_HEIGHT_PX = 30;
const NODE_HEIGHT_PX = 20;
const TREE_LAYER_DEPTH_PX = 5;

const COLLAPSED_NODE_WIDTH_PX = 20;
const COLLAPSED_NODE_FILL_COLOR = "#e0e0e0";
const COLLAPSED_NODE_FILL_HOVER_COLOR = "#8f8f8f";
const COLLAPSED_NODE_EDGE_COLOR = "#8f8f8f";

const DEFAULT_NODE_FILL_COLOR = "#fafafa";
const DEFAULT_NODE_EDGE_COLOR = "#8e8f94";

const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_EDGE_COLOR = "#4a5568";

const StyledSVG = styled.svg`
  .${SVG_COLLAPSE_BUTTON_GROUP_CLASS}, .${SVG_EXPAND_BUTTON_GROUP_CLASS} {
    cursor: pointer;

    & * {
      transition: fill 0.2s ease-out, stroke 0.2s;
    }

    &:hover {
      & rect {
        fill: ${COLLAPSED_NODE_FILL_HOVER_COLOR};
      }
      & text {
        fill: #ffffff;
      }
    }
  }
`;

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;

/**
 * Renders a subset of the lineage view with the selected tracks visible and
 * expanded, and other related tracks collapsed.
 */
function renderView(
  g: d3.Selection<SVGGElement, TrackInfo, null, undefined>,
  fullData: LineageData,
  fullRelationships: LineageDataRelationships,
  selectedTracks: Set<number>
): NodeSelection | undefined {
  const selectedTrackIds = new Set(selectedTracks);

  const data = getLineageSubset(fullData, fullRelationships, selectedTrackIds);
  const relationships = getLineageRelationships(data);
  const { multiparentEdges } = relationships;
  const root = getTreeHierarchy(data, relationships);

  if (!root) {
    return undefined;
  }

  const leafCount = root.leaves().length;
  const depth = root.height;
  const treeRoot = d3.tree<TrackInfo>().size([leafCount * TREE_LEAF_HEIGHT_PX * 1.5, depth * TREE_LAYER_DEPTH_PX])(
    root
  );

  const mergeNodes = new Set(multiparentEdges.map((edge) => edge[1]));

  // Render tree edges, coloring merge edges as an orange dotted line
  g.append("g")
    .selectAll("line")
    .data(treeRoot.links())
    .join("line")
    .attr("stroke", (d) => (mergeNodes.has(d.target.data.id) ? MERGE_EDGE_COLOR : DEFAULT_EDGE_COLOR))
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", (d) => (mergeNodes.has(d.target.data.id) ? "4 3" : null))
    .attr("opacity", (d) => (d.source.data.id === -1 ? 0 : 1)) // Hide links to the dummy root node
    .attr("x1", (d) => (d.source.data.startTime + d.source.data.length - 1) * TREE_LAYER_DEPTH_PX)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.data.startTime * TREE_LAYER_DEPTH_PX)
    .attr("y2", (d) => d.target.x);

  if (multiparentEdges.length > 0) {
    const srcPosOf = new Map(
      treeRoot
        .descendants()
        .map((d) => [d.data.id, { x: d.x, y: (d.data.startTime + d.data.length - 1) * TREE_LAYER_DEPTH_PX }])
    );
    // TODO: Add function instead of duplicating map in memory
    const targetPosOf = new Map(
      treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.data.startTime * TREE_LAYER_DEPTH_PX }])
    );
    g.append("g")
      .selectAll("line")
      .data(multiparentEdges)
      .join("line")
      .attr("stroke", MERGE_EDGE_COLOR)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3")
      .attr("x1", (d) => srcPosOf.get(d[0])?.y ?? 0)
      .attr("y1", (d) => srcPosOf.get(d[0])?.x ?? 0)
      .attr("x2", (d) => targetPosOf.get(d[1])?.y ?? 0)
      .attr("y2", (d) => targetPosOf.get(d[1])?.x ?? 0);
  }

  // Render nodes
  const node = g
    .append("g")
    .selectAll("g")
    .data(treeRoot.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.data.startTime * TREE_LAYER_DEPTH_PX},${d.x})`);

  // Draw rectangles for each node
  node.append("rect").attr("class", MAIN_NODE_CLASS);
  node.append("line").attr("class", SVG_TIME_INDICATOR_CLASS);

  // Add expand/collapse button for each node
  const expandButtonNodes = node
    .filter((d) => !selectedTrackIds.has(d.data.id))
    .append("g")
    .attr("class", SVG_EXPAND_BUTTON_GROUP_CLASS);
  const collapseButtonNodes = node
    .filter((d) => selectedTrackIds.has(d.data.id))
    .append("g")
    .attr("class", SVG_COLLAPSE_BUTTON_GROUP_CLASS);
  expandButtonNodes.append("rect").attr("class", `${SVG_BUTTON_CLASS}`);
  expandButtonNodes.append("text").attr("class", `${SVG_BUTTON_TEXT_CLASS}`);
  collapseButtonNodes.append("rect").attr("class", `${SVG_BUTTON_CLASS}`);
  collapseButtonNodes.append("text").attr("class", `${SVG_BUTTON_TEXT_CLASS}`);

  // Track ID label
  node.append("text").attr("class", TRACK_LABEL_CLASS);

  return node;
}

function setupPointerHandlers(
  node: NodeSelection,
  hoveredNodeRef: React.MutableRefObject<undefined | (EventTarget & Element)>,
  onToggleSelection?: React.RefObject<undefined | ((info: TrackInfo, time: number) => void)>,
  onToggleExpanded?: React.RefObject<undefined | ((info: TrackInfo) => void)>,
  onHover?: React.RefObject<undefined | ((info: TrackInfo | null, time: number) => void)>
): () => void {
  // Clicking the main track rectangle toggles the track's selection.
  const handleClickMainNode = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    // TODO: Determine position along axis, jump to time accordingly
    event.currentTarget.clientWidth;
    const boundingRect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - boundingRect.left;
    const time = Math.round(d.data.startTime + (relativeX / boundingRect.width) * d.data.length);
    onToggleSelection?.current?.(d.data, time);
  };

  // Clicking an expand/collapse button toggles whether the tree is expanded.
  const handleClickButton = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    onToggleExpanded?.current?.(d.data);
  };

  const handleHoverNode = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    hoveredNodeRef.current = event.currentTarget;
    onHover?.current?.(d.data, 0);
  };

  const handleUnhoverNode = (): void => {
    hoveredNodeRef.current = undefined;
    onHover?.current?.(null, 0);
  };

  const mainNodeRect = node.select<SVGRectElement>(`rect.${MAIN_NODE_CLASS}`);
  const buttonGroups = node.selectAll<SVGGElement, d3.HierarchyNode<TrackInfo>>(
    `g.${SVG_EXPAND_BUTTON_GROUP_CLASS}, g.${SVG_COLLAPSE_BUTTON_GROUP_CLASS}`
  );

  mainNodeRect.on("click", handleClickMainNode);
  buttonGroups.on("click", handleClickButton);
  node.on("mouseenter", handleHoverNode).on("mouseleave", handleUnhoverNode);

  return () => {
    mainNodeRect.on("click", null);
    buttonGroups.on("click", null);
    node.on("mouseenter", null).on("mouseleave", null);
  };
}

function updateNodeStyles(
  node: NodeSelection,
  trackIds: Set<number>,
  trackColors: Map<number, Color>,
  time: number
): void {
  const isSelected = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return trackIds.has(d.data.id);
  };

  const getLineTransform = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    const progress = time - d.data.startTime;
    const x = progress * TREE_LAYER_DEPTH_PX;
    return `translate(${x},0)`;
  };

  const isInTimeRange = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return time >= d.data.startTime && time < d.data.startTime + d.data.length;
  };

  node
    .select<SVGRectElement>(`rect.${MAIN_NODE_CLASS}`)
    .attr("transform", `translate(${-TREE_LAYER_DEPTH_PX / 2},${-NODE_HEIGHT_PX / 2})`)
    .attr("width", (d) => d.data.length * TREE_LAYER_DEPTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("rx", 4)
    .attr("fill", DEFAULT_NODE_FILL_COLOR)
    .attr("opacity", (d) => (isSelected(d) ? 1 : 0)) // Hide the dummy root node
    // Only clickable when visible, so collapsed nodes toggle via their expand button.
    .attr("cursor", (d) => (isSelected(d) ? "pointer" : "default"))
    .attr("pointer-events", (d) => (isSelected(d) ? "auto" : "none"))
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s");

  node
    .select<SVGTextElement>(`line.${SVG_TIME_INDICATOR_CLASS}`)
    .attr("transform", getLineTransform)
    .attr("opacity", (d) => (isInTimeRange(d) && isSelected(d) ? 1 : 0))
    .attr("x1", 0)
    .attr("y1", -NODE_HEIGHT_PX / 2)
    .attr("x2", 0)
    .attr("y2", NODE_HEIGHT_PX / 2)
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", TREE_LAYER_DEPTH_PX)
    .attr("pointer-events", "none");

  // Buttons
  const expandButtonGroup = node.select<SVGGElement>(`g.${SVG_EXPAND_BUTTON_GROUP_CLASS}`);
  expandButtonGroup
    .select<SVGRectElement>("rect")
    // .attr("x", -COLLAPSED_NODE_WIDTH_PX / 2)
    .attr("y", -NODE_HEIGHT_PX / 2)
    .attr("width", COLLAPSED_NODE_WIDTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", COLLAPSED_NODE_FILL_COLOR)
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1))
    .attr("stroke", COLLAPSED_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s")
    // .attr("rx", COLLAPSED_NODE_WIDTH_PX / 2);
    .attr("rx", 4);

  expandButtonGroup
    .select<SVGTextElement>("text")
    .text("+")
    .attr("x", COLLAPSED_NODE_WIDTH_PX / 2)
    .attr("y", 1)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 16)
    .attr("pointer-events", "none")
    .attr("transition", "fill 0.3s");

  const collapseButtonGroup = node.select<SVGGElement>(`g.${SVG_COLLAPSE_BUTTON_GROUP_CLASS}`);
  collapseButtonGroup
    .select<SVGRectElement>("rect")
    // .attr("x", -COLLAPSED_NODE_WIDTH_PX)
    .attr("y", -NODE_HEIGHT_PX / 2)
    .attr("width", COLLAPSED_NODE_WIDTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", COLLAPSED_NODE_FILL_COLOR)
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1))
    .attr("stroke", COLLAPSED_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s")
    .attr("rx", 4);

  collapseButtonGroup
    .select<SVGTextElement>("text")
    .text("-")
    .attr("x", COLLAPSED_NODE_WIDTH_PX / 2)
    .attr("y", 1)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 16)
    .attr("pointer-events", "none")
    .attr("transition", "fill 0.3s");

  // track label
  node
    .select<SVGTextElement>(`text.${TRACK_LABEL_CLASS}`)
    .text((d) => d.data.id)
    .attr("x", 2)
    .attr("y", -14)
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 14)
    .attr("pointer-events", "none")
    .attr("transition", "fill 0.3s");
}

export default function LineageTrackDetailView(props: TrackDetailLineageViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const nodeSelectionRef = useRef<NodeSelection | undefined>(undefined);

  const hoveredNodeRef = useRef<undefined | (EventTarget & Element)>(undefined);

  const trackIds = useMemo(() => new Set(props.selectedTracks.keys()), [props.selectedTracks]);

  const onClickRef = useRef(props.onClick);
  onClickRef.current = props.onClick;
  const onHoverRef = useRef(props.onHover);
  onHoverRef.current = props.onHover;

  const { idToInfo: trackIdToInfo } = props.data;
  const trackIdToNode = useMemo(() => {
    const map = new Map<number, d3.HierarchyNode<TrackInfo>>();
    if (props.hierarchy) {
      map.set(props.hierarchy.data.id, props.hierarchy);
      for (const node of props.hierarchy.descendants() ?? []) {
        map.set(node.data.id, node);
      }
    }
    return map;
  }, [props.hierarchy]);

  const prevTracks = useRef<Map<number, Track>>(new Map());
  // Whether individual tracks are expanded or collapsed, regardless of their
  // children or parent state. Traversed from the root to calculate/update the
  // current set of expanded tracks.
  const trackIdToExpanded = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const trackId of trackIdToInfo.keys()) {
      if (props.selectedTracks.has(trackId)) {
        map.set(trackId, true);
      } else {
        map.set(trackId, false);
      }
    }
    return map;
  }, [props.selectedTracks]);
  prevTracks.current = props.selectedTracks;

  // Current set of all tracks that are expanded. If a track is expanded, its
  // parents up to a root node must also be expanded; if a track is collapsed,
  // all of its children must also be collapsed.
  const [expandedTracks, setExpandedTracks] = useState(() => {
    // On initial render, expand all the currently selected tracks and
    // their parents up to a root node.
    const nodes = new Set<number>();
    for (const track of props.selectedTracks.values()) {
      const parents = props.hierarchy?.ancestors().map((d) => d.data.id) ?? [];
      for (const parentId of parents) {
        nodes.add(parentId);
      }
      nodes.add(track.trackId);
    }
    return nodes;
  });

  const expandTrack = (expandedTracks: Set<number>, trackId: number): Set<number> => {
    const newExpandedTracks = new Set(expandedTracks);
    const coparentIds = props.relationships.idToCoparents.get(trackId) ?? new Set();
    const ids = coparentIds.size > 0 ? coparentIds : new Set([trackId]);

    for (const id of ids) {
      newExpandedTracks.add(id);
      trackIdToExpanded.set(id, true);
      const { idToChildren } = props.relationships;
      // Expand all parents of the node, up to a root node.
      forEachParent(id, trackIdToInfo, props.relationships.idToParents, (parentData) => {
        newExpandedTracks.add(parentData.id);
        return true;
      });
      // Traverse children, expand if previously expanded too.
      forEachChild(id, trackIdToInfo, idToChildren, (childData) => {
        if (trackIdToExpanded.get(childData.id)) {
          newExpandedTracks.add(childData.id);
          return true;
        }
        return false;
      });
    }
    return newExpandedTracks;
  };

  const collapseTrack = (expandedTracks: Set<number>, trackId: number): Set<number> => {
    const newExpandedTracks = new Set(expandedTracks);
    newExpandedTracks.delete(trackId);
    trackIdToExpanded.set(trackId, false);

    // Remove all children of the node from the expanded set.
    const traversedNodes = new Set<number>([trackId]);
    const collapseAllChildren = (trackId: number): void => {
      forEachChild(trackId, trackIdToInfo, props.relationships.idToChildren, (childData) => {
        if (traversedNodes.has(childData.id)) {
          return false;
        }
        newExpandedTracks.delete(childData.id);
        traversedNodes.add(childData.id);

        // Check coparents
        const coparents = props.relationships.idToCoparents.get(childData.id) ?? new Set();
        for (const coparentId of coparents) {
          if (traversedNodes.has(coparentId)) {
            continue;
          } else {
            if (newExpandedTracks.has(coparentId)) {
              newExpandedTracks.delete(coparentId);
              trackIdToExpanded.set(coparentId, false);
              traversedNodes.add(coparentId);
              collapseAllChildren(coparentId);
            }
          }
        }
        // Check if any of the child node's parents are still expanded.
        const parentIds = props.relationships.idToParents.get(childData.id) ?? [];
        if (parentIds.length > 1) {
          for (const parentId of parentIds) {
            if (traversedNodes.has(parentId)) {
              continue;
            } else if (newExpandedTracks.has(parentId)) {
              // Collapse the parent if currently expanded (and all of its
              // children)
              newExpandedTracks.delete(parentId);
              trackIdToExpanded.set(parentId, false);
              traversedNodes.add(parentId);
              collapseAllChildren(parentId);
            }
          }
        }
        return true;
      });
    };
    collapseAllChildren(trackId);
    return newExpandedTracks;
  };

  useEffect(() => {
    for (const trackId of props.selectedTracks.keys()) {
      // TODO: Possible bug here where the set of expanded tracks is overwritten
      // because all instances of `expandTrack` are calling the same setter.
      setExpandedTracks((prev) => expandTrack(prev, trackId));
    }
  }, [props.selectedTracks]);

  // Expand/collapse the tree below a node. Triggered by the node's
  // expand/collapse button.
  const onToggleExpanded = (info: TrackInfo): void => {
    if (expandedTracks.has(info.id)) {
      setExpandedTracks((prev) => collapseTrack(prev, info.id));
    } else {
      setExpandedTracks((prev) => expandTrack(prev, info.id));
    }
  };
  const onToggleExpandedRef = useRef(onToggleExpanded);
  onToggleExpandedRef.current = onToggleExpanded;

  //// SVG Elements ////

  const zoom = useConstructor(() =>
    d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        d3.select(groupRef.current).attr("transform", event.transform);
      })
  );

  const resetZoom = (): void => {
    if (!svgRef.current || !groupRef.current) {
      return;
    }
    const svg = d3.select(svgRef.current);
    const svgNode = svg.node();
    const gNode = d3.select(groupRef.current).node();
    if (!gNode || !svgNode || !svg) {
      return;
    }
    const bbox = gNode.getBBox();
    const clientWidth = svgNode.clientWidth;
    const clientHeight = svgNode.clientHeight;
    const scale = Math.min(clientWidth / (bbox.width + 80), clientHeight / (bbox.height + 40)) * 0.92;
    const tx = (clientWidth - bbox.width * scale) / 2 - bbox.x * scale;
    const ty = (clientHeight - bbox.height * scale) / 2 - bbox.y * scale;
    const initT = d3.zoomIdentity.translate(tx, ty).scale(scale);
    zoom.current.transform(svg, initT);
  };

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.call(zoom.current);
    }
  }, [zoom]);

  //// Helper methods ////

  const isSelected = useCallback(
    (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
      return trackIds.has(d.data.id);
    },
    [trackIds]
  );

  //// Viewport ////

  // Render view and set up pointer handlers
  useEffect(() => {
    let cleanupPointerHandlers: (() => void) | undefined;
    if (svgRef.current && groupRef.current && props.dataset) {
      const g = d3.select(groupRef.current) as d3.Selection<SVGGElement, TrackInfo, null, undefined>;
      const node = renderView(g, props.data, props.relationships, expandedTracks);
      nodeSelectionRef.current = node;
      if (node) {
        cleanupPointerHandlers = setupPointerHandlers(
          node,
          hoveredNodeRef,
          onClickRef,
          onToggleExpandedRef,
          onHoverRef
        );
      }
    }

    // Clear on unmount
    return () => {
      if (cleanupPointerHandlers) {
        cleanupPointerHandlers();
      }
      if (groupRef.current) {
        d3.select(groupRef.current).selectAll("*").remove();
      }
    };
  }, [props.data, props.relationships, props.dataset, expandedTracks, isSelected]);

  useEffect(() => {
    // Update node styling
    if (nodeSelectionRef.current) {
      updateNodeStyles(nodeSelectionRef.current, expandedTracks, props.trackColors, props.time);
    }
  }, [props.data, props.time, props.trackColors, expandedTracks]);

  useEffect(() => {
    if (!svgRef.current || !nodeSelectionRef.current) {
      return;
    }

    return setupPointerHandlers(nodeSelectionRef.current, hoveredNodeRef, onClickRef, onToggleExpandedRef, onHoverRef);
  }, [props.time, isSelected]);

  // Fit on first render
  useEffect(() => {
    resetZoom();
  }, [props.data]);

  return (
    <StyledSVG
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
      id="track-detail-lineage-view-svg"
    >
      <g ref={groupRef}></g>
    </StyledSVG>
  );
}
