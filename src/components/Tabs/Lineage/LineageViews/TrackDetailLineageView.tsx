import * as d3 from "d3";
import React, { type MouseEvent, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import {
  getDefaultZoomTransform,
  getLineageRelationships,
  getLineageSubset,
  getTreeHierarchy,
} from "src/components/Tabs/Lineage/lineage_utils";
import {
  collapseTrack,
  expandTrack,
  getInitialExpandedState,
  type TreeExpandedState,
} from "src/components/Tabs/Lineage/tree_utils";
import type { LineageData, LineageDataRelationships, TrackInfo } from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

import { DUMMY_ROOT_NODE_ID } from "../constants";

type TrackDetailLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  dataset: Dataset | null;
  data: LineageData;
  selectedTracks: Map<number, Track>;
  trackColors: Map<number, Color>;
  relationships: LineageDataRelationships;
  hierarchy: d3.HierarchyNode<TrackInfo> | null;
  time: number;
  onClick?: (info: TrackInfo, time: number | null) => void;
  onHover?: (info: TrackInfo | null, time: number) => void;
};

const enum SvgClass {
  BUTTON_RECT = "svg-button",
  EXPAND_BUTTON_GROUP = "expand-button",
  COLLAPSE_BUTTON_GROUP = "collapse-button",
  TIME_INDICATOR = "time-indicator",
  MAIN_NODE = "main-node",
  TRACK_LABEL = "track-label",
}

const TREE_LEAF_HEIGHT_PX = 30;
const NODE_HEIGHT_PX = 20;
const TREE_LAYER_DEPTH_PX = 5;

const COLLAPSED_NODE_WIDTH_PX = 20;
const COLLAPSED_NODE_FILL_COLOR = "#e7e7e7";
const COLLAPSED_NODE_FILL_HOVER_COLOR = "#8f8f8f";
const COLLAPSED_NODE_EDGE_COLOR = "#8f8f8f";

const DEFAULT_NODE_FILL_COLOR = "#ffffff";
const DEFAULT_NODE_FILL_HOVER_COLOR = "#f6f6f6";
const DEFAULT_NODE_EDGE_COLOR = "#8e8f94";

const TRACK_LABEL_HOVER_COLOR = "#2c2c2c";

const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_EDGE_COLOR = "#4a5568";

const StyledSVG = styled.svg`
  .${SvgClass.COLLAPSE_BUTTON_GROUP} rect {
    // Hide the collapse button by default, so only the text (-) is visible.
    // The button will be shown on hover.
    opacity: 0;
  }

  // Style the expand/collapse buttons and their hover states.
  .${SvgClass.COLLAPSE_BUTTON_GROUP}, .${SvgClass.EXPAND_BUTTON_GROUP} {
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

  // Add hover colors to the main node rectangle and track label
  .${SvgClass.MAIN_NODE} {
    transition: all 0.2s ease-out;
    &:hover {
      fill: ${DEFAULT_NODE_FILL_HOVER_COLOR};
    }
  }
  .${SvgClass.TRACK_LABEL} {
    transition: all 0.2s ease-out;
    &:hover {
      fill: ${TRACK_LABEL_HOVER_COLOR};
    }
  }
`;

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;

/**
 * Renders a subset of the lineage view with the selected tracks visible and
 * expanded, and other related tracks collapsed.
 *
 * Each node has a rectangle representing the track, a label with the track ID,
 * and buttons to expand and collapse the tree below the node. The edges between
 * nodes are drawn as lines.
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
    .attr("opacity", (d) => (d.source.data.id === DUMMY_ROOT_NODE_ID ? 0 : 1)) // Hide links to the dummy root node
    .attr("x1", (d) => (d.source.data.startTime + d.source.data.length - 1) * TREE_LAYER_DEPTH_PX)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.data.startTime * TREE_LAYER_DEPTH_PX)
    .attr("y2", (d) => d.target.x);

  // Render additional edges for multiparent relationships.
  if (multiparentEdges.length > 0) {
    const idToNode = new Map(treeRoot.descendants().map((d) => [d.data.id, d]));

    const getPos = (id: number, isTarget: boolean): { x: number; y: number } => {
      const node = idToNode.get(id);
      if (!node) {
        return { x: 0, y: 0 };
      }
      // For target nodes, draw at the start of the track, and for source nodes, draw at the end of the track.
      let y = isTarget ? node.data.startTime : node.data.startTime + node.data.length - 1;
      return { x: node.x, y: y * TREE_LAYER_DEPTH_PX };
    };

    g.append("g")
      .selectAll("line")
      .data(multiparentEdges)
      .join("line")
      .attr("stroke", MERGE_EDGE_COLOR)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3")
      .attr("x1", (d) => getPos(d[0], false).y)
      .attr("y1", (d) => getPos(d[0], false).x)
      .attr("x2", (d) => getPos(d[1], true).y)
      .attr("y2", (d) => getPos(d[1], true).x);
  }

  // Add nodes
  const node = g
    .append("g")
    .selectAll("g")
    .data(treeRoot.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.data.startTime * TREE_LAYER_DEPTH_PX},${d.x})`);

  // Draw rectangles for each node
  node.append("rect").attr("class", SvgClass.MAIN_NODE);
  node.append("line").attr("class", SvgClass.TIME_INDICATOR);

  // Add expand/collapse button for each node
  const expandButtonNodes = node
    .filter((d) => !selectedTrackIds.has(d.data.id))
    .append("g")
    .attr("class", SvgClass.EXPAND_BUTTON_GROUP);
  const collapseButtonNodes = node
    .filter((d) => selectedTrackIds.has(d.data.id))
    .append("g")
    .attr("class", SvgClass.COLLAPSE_BUTTON_GROUP);
  expandButtonNodes.append("rect").attr("class", `${SvgClass.BUTTON_RECT}`);
  expandButtonNodes.append("text");
  collapseButtonNodes.append("rect").attr("class", `${SvgClass.BUTTON_RECT}`);
  collapseButtonNodes.append("text");

  // Track ID label
  node.append("text").attr("class", SvgClass.TRACK_LABEL);

  return node;
}

function setupPointerHandlers(
  node: NodeSelection,
  onToggleSelection?: React.RefObject<undefined | ((info: TrackInfo, time: number | null) => void)>,
  onToggleExpanded?: React.RefObject<undefined | ((info: TrackInfo) => void)>,
  onHover?: React.RefObject<undefined | ((info: TrackInfo | null, time: number) => void)>
): () => void {
  // Clicking the main node or the track label calls the onToggleSelection
  // callback with the track info and the time of the click.
  const handleClickMainNode = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    // Determine current time based on the click position relative to the node rectangle.
    const boundingRect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - boundingRect.left;
    const timeOffset = Math.min(Math.floor((relativeX / boundingRect.width) * d.data.length), d.data.length - 1);
    const time = d.data.startTime + timeOffset;
    onToggleSelection?.current?.(d.data, time);
  };

  const handleClickTrackLabel = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    onToggleSelection?.current?.(d.data, null);
  };

  // Clicking an expand/collapse button toggles whether the tree is expanded.
  const handleClickExpandCollapseButton = (event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    event.stopPropagation();
    onToggleExpanded?.current?.(d.data);
  };

  const handleHoverNode = (_event: MouseEvent, d: d3.HierarchyNode<TrackInfo>): void => {
    onHover?.current?.(d.data, 0);
  };

  const handleUnhoverNode = (): void => {
    onHover?.current?.(null, 0);
  };

  const mainNodeRect = node.select<SVGRectElement>(`rect.${SvgClass.MAIN_NODE}`);
  const trackLabelText = node.select<SVGTextElement>(`text.${SvgClass.TRACK_LABEL}`);
  const buttonGroups = node.selectAll<SVGGElement, d3.HierarchyNode<TrackInfo>>(
    `g.${SvgClass.EXPAND_BUTTON_GROUP}, g.${SvgClass.COLLAPSE_BUTTON_GROUP}`
  );

  mainNodeRect.on("click", handleClickMainNode);
  trackLabelText.on("click", handleClickTrackLabel);
  buttonGroups.on("click", handleClickExpandCollapseButton);
  node.on("mouseenter", handleHoverNode).on("mouseleave", handleUnhoverNode);

  return () => {
    mainNodeRect.on("click", null);
    trackLabelText.on("click", null);
    buttonGroups.on("click", null);
    node.on("mouseenter", null).on("mouseleave", null);
  };
}

/**
 * Updates the fill, visibility, and outline styling of nodes based on selection
 * status + time. Also positions time indicator lines based on the current time.
 */
function updateNodeStyles(
  node: NodeSelection,
  expandedTrackIds: Set<number>,
  trackColors: Map<number, Color>,
  time: number
): void {
  const isExpanded = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return expandedTrackIds.has(d.data.id);
  };
  const getTimeIndicatorTransform = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    const progress = time - d.data.startTime;
    const x = progress * TREE_LAYER_DEPTH_PX;
    return `translate(${x},0)`;
  };
  const isInTimeRange = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return time >= d.data.startTime && time < d.data.startTime + d.data.length;
  };

  // Main node rectangle
  node
    .select<SVGRectElement>(`rect.${SvgClass.MAIN_NODE}`)
    .attr("transform", `translate(${-TREE_LAYER_DEPTH_PX / 2},${-NODE_HEIGHT_PX / 2})`)
    .attr("width", (d) => d.data.length * TREE_LAYER_DEPTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("rx", 4)
    .attr("fill", DEFAULT_NODE_FILL_COLOR)
    .attr("opacity", (d) => (isExpanded(d) && d.data.id !== DUMMY_ROOT_NODE_ID ? 1 : 0)) // Hide the dummy root node
    // Hide node when collapsed
    .attr("cursor", (d) => (isExpanded(d) ? "pointer" : "default"))
    .attr("pointer-events", (d) => (isExpanded(d) ? "auto" : "none"))
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", 2);

  // Indicator for current time
  node
    .select<SVGLineElement>(`line.${SvgClass.TIME_INDICATOR}`)
    .attr("transform", getTimeIndicatorTransform)
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
    .select<SVGTextElement>(`text.${SvgClass.TRACK_LABEL}`)
    .text((d) => d.data.id)
    .attr("x", 2)
    .attr("y", -14)
    .attr("opacity", (d) => (d.data.id !== DUMMY_ROOT_NODE_ID ? 1 : 0)) // Hide the dummy root node
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 14)
    .attr("cursor", "pointer")
    .attr("transition", "fill 0.3s");

  // Expand/collapse buttons

  // TODO: Use the foreignObject element to render React buttons
  // directly into the SVG, instead of using SVG text and rectangles for
  // accessibility? See
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject

  // Render the expand/collapse buttons as a rectangle with a "+" or "-" text
  // label.
  const expandButtonGroup = node.select<SVGGElement>(`g.${SvgClass.EXPAND_BUTTON_GROUP}`);
  const collapseButtonGroup = node.select<SVGGElement>(`g.${SvgClass.COLLAPSE_BUTTON_GROUP}`);
  const buttonGroups = expandButtonGroup.merge(collapseButtonGroup);
  buttonGroups
    .select<SVGRectElement>("rect")
    .attr("x", -2)
    .attr("y", -NODE_HEIGHT_PX / 2)
    .attr("width", COLLAPSED_NODE_WIDTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", COLLAPSED_NODE_FILL_COLOR)
    .attr("opacity", (d) => (d.data.id === DUMMY_ROOT_NODE_ID ? 0 : 1))
    .attr("stroke", COLLAPSED_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("rx", 4);
  buttonGroups
    .select<SVGTextElement>("text")
    .attr("x", COLLAPSED_NODE_WIDTH_PX / 2 - 2)
    .attr("y", 1)
    .attr("opacity", (d) => (d.data.id === DUMMY_ROOT_NODE_ID ? 0 : 1))
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 16)
    .attr("pointer-events", "none");

  expandButtonGroup.select<SVGTextElement>("text").text("+");
  collapseButtonGroup.select<SVGTextElement>("text").text("-");
}

export default function LineageTrackDetailView(props: TrackDetailLineageViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const nodeSelectionRef = useRef<NodeSelection | undefined>(undefined);

  const trackIds = useMemo(() => new Set(props.selectedTracks.keys()), [props.selectedTracks]);

  const onClickRef = useRef(props.onClick);
  const onHoverRef = useRef(props.onHover);
  onClickRef.current = props.onClick;
  onHoverRef.current = props.onHover;

  const [expandedState, setExpandedState] = useState<TreeExpandedState>(() =>
    getInitialExpandedState(trackIds, props.data, props.relationships)
  );
  const { expandedTracks } = expandedState;

  // Apply newly selected tracks to expanded state-- updates only on new tracks
  // to avoid expanding selected tracks that were previously collapsed.
  const prevTracks = useRef<Set<number>>(new Set());
  useMemo(() => {
    prevTracks.current = new Set();
  }, [props.dataset, props.data, props.relationships]);

  const newTracks = useMemo(() => {
    const newTracks = new Set<number>();
    for (const trackId of props.selectedTracks.keys()) {
      if (!prevTracks.current.has(trackId)) {
        newTracks.add(trackId);
      }
    }
    return newTracks;
  }, [props.selectedTracks]);

  useEffect(() => {
    for (const trackId of newTracks) {
      setExpandedState((prev) => expandTrack(trackId, prev, props.data, props.relationships));
    }
    prevTracks.current = new Set(props.selectedTracks.keys());
  }, [newTracks, props.data, props.relationships]);

  // Reset expanded state when the data or relationships change (e.g. when the
  // user switches to a different dataset)
  useEffect(() => {
    setExpandedState(getInitialExpandedState(trackIds, props.data, props.relationships));
  }, [props.data, props.relationships]);

  // Expand/collapse the tree when clicking the expand/collapse button.
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

  // Apply zoom to SVG
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.call(zoom.current);
    }
  }, [zoom]);

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
        cleanupPointerHandlers = setupPointerHandlers(node, onClickRef, onToggleExpandedRef, onHoverRef);
      }
    }

    // Clear on unmount
    return () => {
      if (cleanupPointerHandlers) {
        cleanupPointerHandlers();
      }
      if (groupRef.current) {
        // TODO: If the lineage tree is having performance issues, consider
        // using the .join() method to update the tree instead of clearing and
        // re-rendering.
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

  // Fit on data change
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
