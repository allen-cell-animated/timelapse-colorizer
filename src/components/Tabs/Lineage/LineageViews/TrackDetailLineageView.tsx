import * as d3 from "d3";
import React, { MouseEvent, type ReactElement, useEffect, useMemo, useRef } from "react";
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
  time: number;
  onClick?: (info: TrackInfo, time: number) => void;
  onHover?: (info: TrackInfo | null, time: number) => void;
};

// const enum TrackDetailLineageViewHtmlIds {}

const TREE_LEAF_HEIGHT_PX = 30;
const NODE_HEIGHT_PX = 20;
const TREE_LAYER_DEPTH_PX = 5;
const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_NODE_FILL_COLOR = "#414141";
const PARENT_NODE_FILL_COLOR = "#c4c4c4";
const PARENT_NODE_EDGE_COLOR = "#8f8f8f";
const DEFAULT_EDGE_COLOR = "#4a5568";
const DEFAULT_NODE_EDGE_COLOR = "#1a1f2e";

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;
type RenderData = {
  node: NodeSelection;
  parentIds: Set<number>;
  childIds: Set<number>;
};

function idToNode(id: number, dataset: Dataset): LineageObjectInfo | undefined {
  if (id >= dataset.numObjects) {
    return undefined;
  }
  // TODO: Add indirection through ID to node ID lookup
  return {
    id: id,
    trackId: dataset.trackIds?.[id] ?? -1,
    time: dataset.times?.[id] ?? -1,
  };
}

function renderView(
  g: d3.Selection<SVGGElement, TrackInfo, null, undefined>,
  fullData: LineageData<TrackInfo>,
  fullRelationships: LineageDataRelationships,
  selectedTracks: Map<number, Track>
): NodeSelection | undefined {
  const selectedTrackIds = new Set(selectedTracks.keys());

  const data = getLineageSubset(fullData, fullRelationships, selectedTrackIds);
  const relationships = getLineageRelationships(data);
  const { multiparentEdges } = relationships;
  const root = getTreeHierarchy(data, relationships);

  if (!root) {
    return undefined;
  }

  const leafCount = root.leaves().length;
  const depth = root.height;
  const treeRoot = d3.tree<TrackInfo>().size([leafCount * TREE_LEAF_HEIGHT_PX, depth * TREE_LAYER_DEPTH_PX])(root);

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
    .attr("x1", (d) => (d.source.data.startTime + d.source.data.length) * TREE_LAYER_DEPTH_PX)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.data.startTime * TREE_LAYER_DEPTH_PX)
    .attr("y2", (d) => d.target.x);

  if (multiparentEdges.length > 0) {
    const srcPosOf = new Map(
      treeRoot
        .descendants()
        .map((d) => [d.data.id, { x: d.x, y: (d.data.startTime + d.data.length) * TREE_LAYER_DEPTH_PX }])
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

  // Text labels
  node.append("text");

  return node;
}

function setupPointerHandlers(
  node: NodeSelection,
  svg: React.RefObject<SVGSVGElement>,
  hoveredNodeRef: React.MutableRefObject<undefined | (EventTarget & Element)>,
  onClick?: React.RefObject<undefined | ((info: TrackInfo, time: number) => void)>,
  onHover?: React.RefObject<undefined | ((info: TrackInfo | null, time: number) => void)>
): () => void {
  const handleClickNode = (_event: any, d: d3.HierarchyPointNode<TrackInfo>): void => {
    onClick?.current?.(d.data, 0);
  };

  const handleHoverNode = (event: MouseEvent, d: d3.HierarchyPointNode<TrackInfo>): void => {
    d3.select(event.currentTarget).select("text").attr("opacity", "1");
    if (svg.current) {
      svg.current.style.cursor = "pointer";
    }
    if (hoveredNodeRef) {
      hoveredNodeRef.current = event.currentTarget;
    }
    onHover?.current?.(d.data, 0);
  };

  if (hoveredNodeRef?.current) {
    d3.select(hoveredNodeRef.current).select("text").attr("opacity", "1");
  }

  const handleUnhoverNode = (event: MouseEvent, _d: d3.HierarchyPointNode<TrackInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#1a1f2e").attr("stroke-width", 1.5);
    d3.select(event.currentTarget).select("text").attr("opacity", "0");
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
  const isNotSelected = (d: d3.HierarchyPointNode<TrackInfo>): boolean => {
    return !trackIds.has(d.data.id);
  };

  const getFillColor = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    if (isNotSelected(d)) {
      return PARENT_NODE_FILL_COLOR;
    }
    // TODO: Show CSS gradient here
    return d.data.startTime <= time && time < d.data.startTime + d.data.length
      ? trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_FILL_COLOR
      : DEFAULT_NODE_FILL_COLOR;
  };

  const getStrokeColor = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    if (isNotSelected(d)) {
      return PARENT_NODE_EDGE_COLOR;
    }
    return trackColors.get(d.data.id)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR;
  };

  const getTextLabel = (d: d3.HierarchyPointNode<TrackInfo>): string => {
    if (d.data.id === -1) {
      return "";
    } else if (isNotSelected(d)) {
      return "+";
    } else if (d.data.startTime <= time && time < d.data.startTime + d.data.length) {
      return "-";
    }
    return "";
  };

  node
    .select<SVGCircleElement>("rect")
    .attr("transform", `translate(${-TREE_LAYER_DEPTH_PX / 2},${-NODE_HEIGHT_PX / 2})`)
    .attr("width", TREE_LAYER_DEPTH_PX)
    .attr("height", NODE_HEIGHT_PX)
    .attr("fill", (d) => getFillColor(d))
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1)) // Hide the dummy root node
    .attr("stroke", (d) => getStrokeColor(d))
    .attr("stroke-width", 1.5);

  // Text labels

  node
    .select<SVGTextElement>("text")
    .text((d) => getTextLabel(d))
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#ffffff")
    .attr("opacity", 0) // Hide the dummy root node
    .attr("font-size", 20)
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

  //// Viewport ////
  useEffect(() => {
    let cleanupPointerHandlers: (() => void) | undefined;
    if (svgRef.current && groupRef.current && props.dataset) {
      const g = d3.select(groupRef.current) as d3.Selection<SVGGElement, TrackInfo, null, undefined>;
      const node = renderView(g, props.data, props.relationships, props.selectedTracks);
      nodeSelectionRef.current = node;
      if (node) {
        cleanupPointerHandlers = setupPointerHandlers(node, svgRef, hoveredNodeRef, onClickRef, onHoverRef);
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
  }, [props.data, props.relationships, props.dataset, props.selectedTracks]);

  useEffect(() => {
    // Update node styling
    if (nodeSelectionRef.current) {
      updateNodeStyles(nodeSelectionRef.current, trackIds, props.trackColors, props.time);
    }
  }, [props.data, props.time, props.trackColors]);

  useEffect(() => {
    if (!svgRef.current || !nodeSelectionRef.current) {
      return;
    }
    return setupPointerHandlers(nodeSelectionRef.current, svgRef, hoveredNodeRef, onClickRef, onHoverRef);
  }, [props.time]);

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
