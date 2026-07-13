import * as d3 from "d3";
import React, { MouseEvent, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import { getLineageRelationships, getLineageSubset, getTreeHierarchy } from "src/components/Tabs/Lineage/lineage_utils";
import type {
  LineageData,
  LineageDataRelationships,
  LineageObjectInfo,
  TrackInfo,
} from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

type TrackDetailLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  dataset: Dataset | null;
  data: LineageData<TrackInfo>;
  selectedTracks: Map<number, Track>;
  trackColors: Map<number, Color>;
  relationships: LineageDataRelationships;
  hierarchy: d3.HierarchyNode<TrackInfo> | null;
  time: number;
  onClick?: (info: TrackInfo, time: number) => void;
  onHover?: (info: TrackInfo | null, time: number) => void;
};

const RECT_BUTTON_CLASS = "rect-button";
const COLLAPSE_BUTTON_CLASS = "collapse-button";
const EXPAND_BUTTON_CLASS = "expand-button";

const TREE_LEAF_HEIGHT_PX = 30;
const NODE_HEIGHT_PX = 20;
const TREE_LAYER_DEPTH_PX = 5;

const COLLAPSED_NODE_WIDTH_PX = 20;
const COLLAPSED_NODE_FILL_COLOR = "#e0e0e0";
const COLLAPSED_NODE_FILL_HOVER_COLOR = "#8f8f8f";
const COLLAPSED_NODE_EDGE_COLOR = "#8f8f8f";

const DEFAULT_NODE_FILL_COLOR = "#ffffff";
const DEFAULT_NODE_EDGE_COLOR = "#1a1f2e";

const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_EDGE_COLOR = "#4a5568";

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;

/**
 * Renders a subset of the lineage view with the selected tracks visible and
 * expanded, and other related tracks collapsed.
 */
function renderView(
  g: d3.Selection<SVGGElement, TrackInfo, null, undefined>,
  fullData: LineageData<TrackInfo>,
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
  node.append("rect");

  // Add expand/collapse button for each node
  node
    .filter((d) => !selectedTrackIds.has(d.data.id))
    .append("rect")
    .attr("class", `${EXPAND_BUTTON_CLASS} ${RECT_BUTTON_CLASS}`)
    .append("text");
  node
    .filter((d) => selectedTrackIds.has(d.data.id))
    .append("rect")
    .attr("class", `${COLLAPSE_BUTTON_CLASS} ${RECT_BUTTON_CLASS}`)
    .append("text");

  // Track ID label
  node.append("text");

  return node;
}

function setupPointerHandlers(
  node: NodeSelection,
  svg: React.RefObject<SVGSVGElement>,
  hoveredNodeRef: React.MutableRefObject<undefined | (EventTarget & Element)>,
  isSelected: (d: d3.HierarchyPointNode<TrackInfo>) => boolean,
  onClick?: React.RefObject<undefined | ((info: TrackInfo, time: number) => void)>,
  onHover?: React.RefObject<undefined | ((info: TrackInfo | null, time: number) => void)>
): () => void {
  const handleClickNode = (event: any, d: d3.HierarchyPointNode<TrackInfo>): void => {
    if (event) onClick?.current?.(d.data, 0);
  };

  const handleHoverNode = (event: MouseEvent, d: d3.HierarchyPointNode<TrackInfo>): void => {
    if (
      event.currentTarget instanceof SVGElement &&
      event.currentTarget.attributes.getNamedItem("class")?.value.includes(RECT_BUTTON_CLASS)
    ) {
      d3.select(event.currentTarget).select("text").transition().duration(200).attr("fill", "#ffffff");
      d3.select(event.currentTarget)
        .select("rect")
        .transition()
        .duration(200)
        .attr("fill", COLLAPSED_NODE_FILL_HOVER_COLOR);
    }
    if (svg.current) {
      svg.current.style.cursor = "pointer";
    }
    hoveredNodeRef.current = event.currentTarget;
    onHover?.current?.(d.data, 0);
  };

  const handleUnhoverNode = (event: MouseEvent, d: d3.HierarchyPointNode<TrackInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#1a1f2e").attr("stroke-width", 1.5);
    if (!isSelected(d)) {
      d3.select(event.currentTarget).select("text").transition().duration(200).attr("fill", COLLAPSED_NODE_EDGE_COLOR);
      d3.select(event.currentTarget).select("rect").transition().duration(200).attr("fill", COLLAPSED_NODE_FILL_COLOR);
    }
    if (svg.current) {
      svg.current.style.cursor = "default";
    }
    if (hoveredNodeRef) {
      hoveredNodeRef.current = undefined;
    }
    onHover?.current?.(null, 0);
  };
  node.on("click", handleClickNode).on("mouseenter", handleHoverNode).on("mouseleave", handleUnhoverNode);

  return () => {
    node.on("click", null).on("mouseenter", null).on("mouseleave", null);
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

  const isParentOfSelected = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return !isSelected(d) && (d.children?.some((child) => trackIds.has(child.data.id)) ?? false);
  };

  const getFillColor = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    // TODO: Show CSS gradient here
    return d.data.startTime <= time && time < d.data.startTime + d.data.length
      ? trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_FILL_COLOR
      : DEFAULT_NODE_FILL_COLOR;
  };

  const getTextLabel = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    if (d.data.id === -1) {
      return "";
    } else if (!isSelected(d)) {
      return "+";
    } else if (d.data.startTime <= time && time < d.data.startTime + d.data.length) {
      return "-";
    }
    return "";
  };

  node
    .select<SVGRectElement>("rect")
    .attr("transform", `translate(${-TREE_LAYER_DEPTH_PX / 2},${-NODE_HEIGHT_PX / 2})`)
    .attr("width", (d) => d.data.length * TREE_LAYER_DEPTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("rx", 4)
    .attr("fill", (d) => getFillColor(d))
    .attr("opacity", (d) => (isSelected(d) ? 1 : 0)) // Hide the dummy root node
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s");

  // Buttons
  node
    .select<SVGRectElement>(`.${EXPAND_BUTTON_CLASS}`)
    .attr("y", -NODE_HEIGHT_PX / 2)
    .attr("width", COLLAPSED_NODE_WIDTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", COLLAPSED_NODE_FILL_COLOR)
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1))
    .attr("stroke", COLLAPSED_NODE_EDGE_COLOR)
    .attr("stroke-width", 2)
    .attr("transition", "fill 0.3s, stroke 0.3s")
    .attr("rx", 4)

    .select<SVGTextElement>("text")
    .text("+")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", COLLAPSED_NODE_EDGE_COLOR)
    .attr("font-size", 20)
    .attr("pointer-events", "none")
    .attr("transition", "fill 0.3s");

  // track label
  node
    .selectChild<SVGTextElement>("text")
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
    for (const trackId of props.data.idToInfo.keys()) {
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

  const expandTrack = (trackId: number): void => {
    const newExpandedTracks = new Set(expandedTracks);
    newExpandedTracks.add(trackId);
    trackIdToExpanded.set(trackId, true);
    const node = trackIdToNode.get(trackId);
    // Expand all parents of the node, up to a root node.
    for (const parent of node?.ancestors() ?? []) {
      newExpandedTracks.add(parent.data.id);
    }
    // Traverse children, expand if previously expanded too.
    const traverseChildren = (node: d3.HierarchyNode<TrackInfo>): void => {
      for (const child of node.children ?? []) {
        if (trackIdToExpanded.get(child.data.id)) {
          newExpandedTracks.add(child.data.id);
          traverseChildren(child);
        }
      }
    };
    node && traverseChildren(node);
    setExpandedTracks(newExpandedTracks);
  };

  const collapseTrack = (trackId: number): void => {
    const newExpandedTracks = new Set(expandedTracks);
    newExpandedTracks.delete(trackId);
    trackIdToExpanded.set(trackId, false);

    const node = trackIdToNode.get(trackId);

    // Remove all children of the node from the expanded set.
    const traverseChildren = (node: d3.HierarchyNode<TrackInfo>): void => {
      for (const child of node.children ?? []) {
        newExpandedTracks.delete(child.data.id);
        traverseChildren(child);
      }
    };
    node && traverseChildren(node);

    setExpandedTracks(newExpandedTracks);
  };

  useEffect(() => {
    for (const trackId of props.selectedTracks.keys()) {
      expandTrack(trackId);
    }
  }, [props.selectedTracks]);

  const onClickNode = (info: TrackInfo, time: number): void => {
    if (trackIdToExpanded.get(info.id)) {
      collapseTrack(info.id);
    } else {
      expandTrack(info.id);
    }
    onClickRef.current?.(info, time);
  };
  const onClickNodeRef = useRef(onClickNode);
  onClickNodeRef.current = onClickNode;

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
          svgRef,
          hoveredNodeRef,
          isSelected,
          onClickNodeRef,
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

  console.log("Rendering LineageTrackDetailView with expandedTracks:", expandedTracks);
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

    return setupPointerHandlers(nodeSelectionRef.current, svgRef, hoveredNodeRef, isSelected, onClickRef, onHoverRef);
  }, [props.time, isSelected]);

  // Fit on first render
  useEffect(() => {
    resetZoom();
  }, [props.data]);

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} id="track-detail-lineage-view-svg">
      <g ref={groupRef}></g>
    </svg>
  );
}
