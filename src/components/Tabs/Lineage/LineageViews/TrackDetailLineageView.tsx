import * as d3 from "d3";
import React, { MouseEvent, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import {
  getDefaultZoomTransform,
  getLineageRelationships,
  getLineageSubset,
  getTreeHierarchy,
} from "src/components/Tabs/Lineage/lineage_utils";
import type { LineageData, LineageDataRelationships, TrackInfo } from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

import { collapseTrack, expandTrack, getInitialExpandedState, TreeExpandedState } from "../tree_utils";

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
const COLLAPSED_NODE_FILL_COLOR = "#e7e7e7";
const COLLAPSED_NODE_FILL_HOVER_COLOR = "#8f8f8f";
const COLLAPSED_NODE_EDGE_COLOR = "#8f8f8f";

const DEFAULT_NODE_FILL_COLOR = "#ffffff";
const DEFAULT_NODE_EDGE_COLOR = "#8e8f94";

const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_EDGE_COLOR = "#4a5568";

const StyledSVG = styled.svg`
  .${SVG_COLLAPSE_BUTTON_GROUP_CLASS} rect {
    // Hide the collapse button by default.
    opacity: 0;
  }

  .${SVG_COLLAPSE_BUTTON_GROUP_CLASS}, .${SVG_EXPAND_BUTTON_GROUP_CLASS} {
    cursor: pointer;

    & * {
      transition: all 0.2s ease-out;
    }

    &:hover {
      & rect {
        fill: ${COLLAPSED_NODE_FILL_HOVER_COLOR};
        opacity: 1;
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
  // Clicking the main track rectangle toggles the track selection.
  const handleClickMainNode = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    event.currentTarget.clientWidth;
    const boundingRect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - boundingRect.left;
    const time = d.data.startTime + Math.round((relativeX / boundingRect.width) * d.data.length);
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
  expandedTrackIds: Set<number>,
  trackColors: Map<number, Color>,
  time: number
): void {
  const isExpanded = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return expandedTrackIds.has(d.data.id);
  };
  const getLineTransform = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    const progress = time - d.data.startTime;
    const x = progress * TREE_LAYER_DEPTH_PX;
    return `translate(${x},0)`;
  };
  const isInTimeRange = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return time >= d.data.startTime && time < d.data.startTime + d.data.length;
  };

  // Main node rectangle
  node
    .select<SVGRectElement>(`rect.${MAIN_NODE_CLASS}`)
    .attr("transform", `translate(${-TREE_LAYER_DEPTH_PX / 2},${-NODE_HEIGHT_PX / 2})`)
    .attr("width", (d) => d.data.length * TREE_LAYER_DEPTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("rx", 4)
    .attr("fill", DEFAULT_NODE_FILL_COLOR)
    .attr("opacity", (d) => (isExpanded(d) ? 1 : 0)) // Hide the dummy root node
    // Hide node when collapsed
    .attr("cursor", (d) => (isExpanded(d) ? "pointer" : "default"))
    .attr("pointer-events", (d) => (isExpanded(d) ? "auto" : "none"))
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s");

  // Indicator for current time
  node
    .select<SVGTextElement>(`line.${SVG_TIME_INDICATOR_CLASS}`)
    .attr("transform", getLineTransform)
    .attr("opacity", (d) => (isInTimeRange(d) && isExpanded(d) ? 1 : 0))
    .attr("x1", 0)
    .attr("y1", -NODE_HEIGHT_PX / 2)
    .attr("x2", 0)
    .attr("y2", NODE_HEIGHT_PX / 2)
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", TREE_LAYER_DEPTH_PX)
    .attr("pointer-events", "none");

  // Track label
  node
    .select<SVGTextElement>(`text.${TRACK_LABEL_CLASS}`)
    .text((d) => d.data.id)
    .attr("x", 2)
    .attr("y", -14)
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 14)
    .attr("pointer-events", "none")
    .attr("transition", "fill 0.3s");

  // Expand/collapse buttons

  // TODO: Use the foreignObject element to render React buttons
  // directly into the SVG, instead of using SVG text and rectangles for
  // accessibility? See
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObjecthttps://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject
  const expandButtonGroup = node.select<SVGGElement>(`g.${SVG_EXPAND_BUTTON_GROUP_CLASS}`);
  expandButtonGroup
    .select<SVGRectElement>("rect")
    .attr("y", -NODE_HEIGHT_PX / 2)
    .attr("width", COLLAPSED_NODE_WIDTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", COLLAPSED_NODE_FILL_COLOR)
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1))
    .attr("stroke", COLLAPSED_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s")
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
    .attr("pointer-events", "none");

  const collapseButtonGroup = node.select<SVGGElement>(`g.${SVG_COLLAPSE_BUTTON_GROUP_CLASS}`);
  collapseButtonGroup
    .select<SVGRectElement>("rect")
    .attr("x", -2)
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
    .attr("x", COLLAPSED_NODE_WIDTH_PX / 2 - 2)
    .attr("y", 1)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 16)
    .attr("pointer-events", "none");
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

  const prevTracks = useRef<Map<number, Track>>(new Map());
  const newTracks = useMemo(() => {
    const newTracks = new Set<number>();
    for (const trackId of props.selectedTracks.keys()) {
      if (!prevTracks.current.has(trackId)) {
        newTracks.add(trackId);
      }
    }
    return newTracks;
  }, [props.selectedTracks]);

  const [expandedState, setExpandedState] = useState<TreeExpandedState>(() =>
    getInitialExpandedState(trackIds, props.data, props.relationships)
  );
  const { expandedTracks } = expandedState;

  // Reset expanded state when the data or relationships change (e.g. when the user switches to a different dataset)
  useEffect(() => {
    setExpandedState(getInitialExpandedState(trackIds, props.data, props.relationships));
  }, [props.data, props.relationships]);

  // Apply newly selected tracks to expanded state-- updates only on new tracks
  // to avoid expanding selected tracks that were previously collapsed.
  useEffect(() => {
    for (const trackId of newTracks) {
      setExpandedState((prev) => expandTrack(trackId, prev, props.data, props.relationships));
    }
  }, [newTracks]);

  // Expand/collapse the tree below a node. Triggered by the node's
  // expand/collapse button.
  const onToggleExpanded = (info: TrackInfo): void => {
    if (expandedTracks.has(info.id)) {
      setExpandedState((prev) => collapseTrack(info.id, prev, props.data, props.relationships));
    } else {
      setExpandedState((prev) => expandTrack(info.id, prev, props.data, props.relationships));
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
    const initialTransform = getDefaultZoomTransform(svgNode, gNode);
    if (initialTransform) {
      zoom.current.transform(svg, initialTransform);
    }
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

  // Update node styling
  useEffect(() => {
    if (nodeSelectionRef.current) {
      updateNodeStyles(nodeSelectionRef.current, expandedTracks, props.trackColors, props.time);
    }
  }, [props.data, props.time, props.trackColors, expandedTracks]);

  // Fit on first render
  useEffect(() => {
    resetZoom();
  }, [props.data, props.relationships, props.dataset]);

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
