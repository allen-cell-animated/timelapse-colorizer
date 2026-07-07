import * as d3 from "d3";
import React, { type ReactElement, useEffect, useRef } from "react";
import type { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import { getLineageRelationships } from "src/components/Tabs/Lineage/lineage_utils";
import type { LineageData, LineageDataRelationships, LineageObjectInfo } from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

type TrackDetailLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  dataset: Dataset | null;
  data: LineageData<LineageObjectInfo>;
  selectedTracks: Map<number, Track>;
  trackColors: Map<number, Color>;
  relationships: LineageDataRelationships;
  time: number;
  onClick?: (info: LineageObjectInfo) => void;
  onHover?: (info: LineageObjectInfo | null) => void;
};

// const enum TrackDetailLineageViewHtmlIds {}

const TREE_LEAF_HEIGHT_PX = 35;
const TREE_LAYER_DEPTH_PX = 35;
const MERGE_EDGE_COLOR = "#ff9410";
const DEFAULT_NODE_FILL_COLOR = "#414141";
const PARENT_NODE_FILL_COLOR = "#c4c4c4";
const PARENT_NODE_EDGE_COLOR = "#8f8f8f";
const DEFAULT_EDGE_COLOR = "#4a5568";
const DEFAULT_NODE_EDGE_COLOR = "#1a1f2e";

type NodeSelection = d3.Selection<
  SVGGElement | d3.BaseType,
  d3.HierarchyPointNode<LineageObjectInfo>,
  SVGGElement,
  LineageObjectInfo
>;
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
  g: d3.Selection<SVGGElement, LineageObjectInfo, null, undefined>,
  data: LineageData<LineageObjectInfo>,
  dataset: Dataset,
  selectedTracks: Map<number, Track>,
  onClick?: React.RefObject<undefined | ((info: LineageObjectInfo) => void)>,
  onHover?: React.RefObject<undefined | ((info: LineageObjectInfo | null) => void)>
): RenderData | undefined {
  const tracks = selectedTracks.values();
  const selectedTrackIds = new Set<number>();

  for (const track of tracks) {
    track.ids.forEach((id) => selectedTrackIds.add(id));
  }

  const parentIds = new Set<number>();
  const childIds = new Set<number>();
  const selectedEdges = new Set<[number, number]>();

  for (const [source, target] of data.edges) {
    const sourceSelected = selectedTrackIds.has(source);
    const targetSelected = selectedTrackIds.has(target);
    if (sourceSelected && targetSelected) {
      // edge within a track <= unsafe assumption, handle multiple tracks later
      selectedEdges.add([source, target]);
    } else if (sourceSelected) {
      childIds.add(target);
      selectedEdges.add([source, target]);
    } else if (targetSelected) {
      parentIds.add(source);
      selectedEdges.add([source, target]);
    }
  }

  const allIds = new Set<number>([...selectedTrackIds, ...parentIds, ...childIds]);
  const trackNodes: LineageObjectInfo[] = [];
  for (const id of allIds) {
    const node = idToNode(id, dataset);
    if (node) {
      trackNodes.push(node);
    }
  }

  // Add on the parent and child nodes into the graph, plus their relationships
  const objectLineageData = {
    idToInfo: new Map(trackNodes.map((node) => [node.id, node])),
    edges: [...selectedEdges],
  };
  const { idToChildrenRenderable, idToParents, multiparentEdges } = getLineageRelationships(objectLineageData);
  const mergeNodes = new Set([...idToParents.entries()].filter(([, parents]) => parents.length > 1).map(([id]) => id));
  const idToChildren = new Map(idToChildrenRenderable);
  const rootNodeIds = [...idToParents.entries()].filter(([, parents]) => parents.length === 0).map(([id]) => id);

  // Determine root node of the tree, creating a dummy one if needed.
  let rootNode: LineageObjectInfo;
  if (rootNodeIds.length === 0) {
    return;
  } else if (rootNodeIds.length === 1) {
    rootNode = idToNode(rootNodeIds[0], dataset)!;
  } else {
    // Multiple root nodes, make a dummy root node that is the parent of all root nodes
    rootNode = { id: -1, trackId: -1, time: 0 };
    idToChildren.set(rootNode.id, [...rootNodeIds]);
  }

  const root = d3.hierarchy<LineageObjectInfo>(rootNode, (objectInfo) => {
    const childIds = idToChildren.get(objectInfo.id) ?? [];
    const childObjectInfo = childIds
      .map((id) => {
        return idToNode(id, dataset);
      })
      .filter((objectInfo) => !!objectInfo) as LineageObjectInfo[];
    return childObjectInfo;
  });
  const leafCount = root.leaves().length;
  const depth = root.height;
  const treeRoot = d3.tree<LineageObjectInfo>().size([leafCount * TREE_LEAF_HEIGHT_PX, depth * TREE_LAYER_DEPTH_PX])(
    root
  );

  function isSplitEdge(sourceId: number, targetId: number): boolean {
    return parentIds.has(sourceId) || childIds.has(targetId) || mergeNodes.has(targetId);
  }

  // Render tree edges, coloring merge edges as an orange dotted line
  g.append("g")
    .selectAll("line")
    .data(treeRoot.links())
    .join("line")
    .attr("stroke", (d) => (mergeNodes.has(d.target.data.id) ? MERGE_EDGE_COLOR : DEFAULT_EDGE_COLOR))
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", (d) => (isSplitEdge(d.source.data.id, d.target.data.id) ? "4 3" : null))
    .attr("opacity", (d) => (d.source.data.id === -1 ? 0 : 1)) // Hide links to the dummy root node
    .attr("x1", (d) => d.source.y)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.y)
    .attr("y2", (d) => d.target.x);

  if (multiparentEdges.length > 0) {
    const posOf = new Map(treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.y }]));
    g.append("g")
      .selectAll("line")
      .data(multiparentEdges)
      .join("line")
      .attr("stroke", MERGE_EDGE_COLOR)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3")
      .attr("x1", (d) => posOf.get(d[0])?.y ?? 0)
      .attr("y1", (d) => posOf.get(d[0])?.x ?? 0)
      .attr("x2", (d) => posOf.get(d[1])?.y ?? 0)
      .attr("y2", (d) => posOf.get(d[1])?.x ?? 0);
  }

  // Render nodes
  const node = g
    .append("g")
    .selectAll("g")
    .data(treeRoot.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  // Draw circles for each node
  node.append("circle");

  // Text labels
  node
    .append("text")
    .text((d) => d.data.id)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#ffffff")
    .attr("font-size", 9)
    .attr("pointer-events", "none");

  return { node, parentIds, childIds };
}

function setupPointerHandlers(
  node: NodeSelection,
  svg: React.RefObject<SVGSVGElement>,
  onClick?: React.RefObject<undefined | ((info: LineageObjectInfo) => void)>,
  onHover?: React.RefObject<undefined | ((info: LineageObjectInfo | null) => void)>
): () => void {
  const handleClickNode = (_event: any, d: d3.HierarchyPointNode<LineageObjectInfo>): void => {
    onClick?.current?.(d.data);
  };
  const handleHoverNode = (_event: any, d: d3.HierarchyPointNode<LineageObjectInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#fff").attr("stroke-width", 2.5);
    if (svg.current) {
      svg.current.style.cursor = "pointer";
    }
    onHover?.current?.(d.data);
  };
  const handleUnhoverNode = (_event: any, d: d3.HierarchyPointNode<LineageObjectInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#1a1f2e").attr("stroke-width", 1.5);
    if (svg.current) {
      svg.current.style.cursor = "default";
    }
    onHover?.current?.(null);
  };
  node.on("click", handleClickNode).on("mouseenter", handleHoverNode).on("mouseleave", handleUnhoverNode);

  return () => {
    node.on("click", null).on("mouseenter", null).on("mouseleave", null);
  };
}

function updateNodeStyles(renderData: RenderData, trackColors: Map<number, Color>, time: number): void {
  const { node, parentIds, childIds } = renderData;

  const isNotSelected = (d: d3.HierarchyPointNode<LineageObjectInfo>): boolean => {
    return parentIds.has(d.data.id) || childIds.has(d.data.id);
  };

  const getFillColor = (d: d3.HierarchyPointNode<LineageObjectInfo>): string => {
    if (isNotSelected(d)) {
      return PARENT_NODE_FILL_COLOR;
    }
    return d.data.time === time
      ? trackColors.get(d.data.trackId)?.getStyle() ?? DEFAULT_NODE_FILL_COLOR
      : DEFAULT_NODE_FILL_COLOR;
  };

  const getStrokeColor = (d: d3.HierarchyPointNode<LineageObjectInfo>): string => {
    if (isNotSelected(d)) {
      return PARENT_NODE_EDGE_COLOR;
    }
    return trackColors.get(d.data.trackId)?.getStyle() ?? DEFAULT_NODE_EDGE_COLOR;
  };

  node
    .select<SVGCircleElement>("circle")
    .attr("r", 15)
    .attr("fill", (d) => getFillColor(d))
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1)) // Hide the dummy root node
    .attr("stroke", (d) => getStrokeColor(d))
    .attr("stroke-width", 1.5);

  // Text labels
  node
    .select<SVGTextElement>("text")
    .text((d) => "t=" + d.data.time)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#ffffff")
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1)) // Hide the dummy root node
    .attr("font-size", 9)
    .attr("pointer-events", "none");
}

export default function LineageTrackDetailView(props: TrackDetailLineageViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const renderDataRef = useRef<RenderData | undefined>(undefined);

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
      const g = d3.select(groupRef.current) as d3.Selection<SVGGElement, LineageObjectInfo, null, undefined>;
      const renderData = renderView(g, props.data, props.dataset, props.selectedTracks);
      renderDataRef.current = renderData;
      if (renderData) {
        cleanupPointerHandlers = setupPointerHandlers(renderData.node, svgRef, onClickRef, onHoverRef);
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
    if (!svgRef.current || !renderDataRef.current) {
      return;
    }
    return setupPointerHandlers(renderDataRef.current.node, svgRef, onClickRef, onHoverRef);
  }, []);

  useEffect(() => {
    // Update node styling
    if (renderDataRef.current) {
      updateNodeStyles(renderDataRef.current, props.trackColors, props.time);
    }
  }, [props.data, props.time, props.trackColors]);

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
