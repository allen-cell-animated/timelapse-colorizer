import * as d3 from "d3";
import React, { type ReactElement, useEffect, useRef } from "react";
import type { Color } from "three";

import type {
  LineageData,
  LineageDataRelationships,
  SharedLineageViewProps,
  TrackInfo,
} from "src/components/Tabs/Lineage/types";
import { useConstructor } from "src/hooks";

const TREE_LEAF_HEIGHT_PX = 30;
const TREE_LAYER_DEPTH_PX = 110;

type TreeLineageViewProps = SharedLineageViewProps & {};

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;

function renderTree(
  g: d3.Selection<SVGGElement, TrackInfo, null, undefined>,
  data: LineageData,
  relationships: LineageDataRelationships,
  onClickTrack?: (trackId: number) => void,
  onHoverTrack?: (trackId: number | null) => void
): NodeSelection | undefined {
  const { trackIdToTrackInfo } = data;
  const edges = [...data.edges];
  const { idToChildrenRenderable: idToChildren, idToParents, multiparentEdges: multiparentEdges } = relationships;

  const mergeNodes = new Set([...idToParents.entries()].filter(([, parents]) => parents.length > 1).map(([id]) => id));
  // All nodes with no parents
  const rootNodeIds = [...idToParents.entries()].filter(([, parents]) => parents.length === 0).map(([id]) => id);

  let rootNode: TrackInfo;
  if (rootNodeIds.length === 0) {
    return;
  } else if (rootNodeIds.length === 1) {
    rootNode = trackIdToTrackInfo.get(rootNodeIds[0])!;
  } else {
    // TODO: Hide the dummy root node
    // Multiple root nodes, make a dummy root node that is the parent of all root nodes
    rootNode = { id: -1, length: 0, startTime: 0 };
    // Add dummy track info for the dummy root node
    trackIdToTrackInfo.set(rootNode.id, rootNode);
    for (const root of rootNodeIds) {
      edges.push([rootNode.id, root]);
    }
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

  const leafCount = root.leaves().length;
  const depth = root.height;

  const treeRoot = d3.tree<TrackInfo>().size([leafCount * TREE_LEAF_HEIGHT_PX, depth * TREE_LAYER_DEPTH_PX])(root);

  // Render tree edges, coloring merge edges as an orange dotted line
  g.append("g")
    .selectAll("line")
    .data(treeRoot.links())
    .join("line")
    // TODO: Make colors into constants here? Or parameterize via options
    .attr("stroke", (d) => (mergeNodes.has(d.target.data.id) ? "#f6ad55" : "#4a5568"))
    .attr("stroke-opacity", (d) => (mergeNodes.has(d.target.data.id) ? 0.7 : 0.6))
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", (d) => (mergeNodes.has(d.target.data.id) ? "4 3" : null))
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
      .attr("stroke", "#f6ad55")
      .attr("stroke-opacity", 0.7)
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

  // Setup pointer events
  const handleClickTrack = (_event: any, d: d3.HierarchyPointNode<TrackInfo>): void => {
    onClickTrack?.(d.data.id);
  };
  const handleHoverTrack = (_event: any, d: d3.HierarchyPointNode<TrackInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#fff").attr("stroke-width", 2.5);
    onHoverTrack?.(d.data.id);
  };
  const handleUnhoverTrack = (_event: any, _d: d3.HierarchyPointNode<TrackInfo>): void => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#1a1f2e").attr("stroke-width", 1.5);
    onHoverTrack?.(null);
  };

  node.on("click", handleClickTrack).on("mouseover", handleHoverTrack).on("mouseout", handleUnhoverTrack);

  return node;
}

function updateNodeStyles(
  node: NodeSelection,
  radiusScale: d3.ScalePower<number, number>,
  colorScale: d3.ScaleSequential<string>,
  trackColors: Map<number, Color>
): void {
  // Draw circles for each node
  node
    .select<SVGCircleElement>("circle")
    .attr("r", (d) => radiusScale(d.data.length))
    .attr("fill", (d) => colorScale(d.data.startTime))
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1)) // Hide the dummy root node
    .attr("stroke", (d) => trackColors.get(d.data.id)?.getStyle() ?? "#1a1f2e")
    .attr("stroke-width", 1.5)
    .style("cursor", "default");

  // Text labels
  node
    .select<SVGTextElement>("text")
    .text((d) => d.data.id)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#ffffff")
    .attr("opacity", (d) => (d.data.id === -1 ? 0 : 1)) // Hide the dummy root node
    .attr("font-size", 9)
    .attr("pointer-events", "none");
}

/** Renders a tree view of the lineage data. */
export default function TreeLineageView(props: TreeLineageViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const nodeRef = useRef<NodeSelection | undefined>(undefined);

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
    const cw = svgNode.clientWidth;
    const ch = svgNode.clientHeight;
    const scale = Math.min(cw / (bbox.width + 80), ch / (bbox.height + 40)) * 0.92;
    const tx = (cw - bbox.width * scale) / 2 - bbox.x * scale;
    const ty = (ch - bbox.height * scale) / 2 - bbox.y * scale;
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
    if (groupRef.current) {
      const g = d3.select(groupRef.current) as d3.Selection<SVGGElement, TrackInfo, null, undefined>;
      const onClickTrack = (trackId: number): void => onClickRef.current?.(trackId);
      const onHoverTrack = (trackId: number | null): void => onHoverRef.current?.(trackId);
      nodeRef.current = renderTree(g, props.data, props.relationships, onClickTrack, onHoverTrack);
    }
    // Clear on unmount
    return () => {
      if (groupRef.current) {
        d3.select(groupRef.current).selectAll("*").remove();
      }
    };
  }, [props.data]);

  useEffect(() => {
    // Update node styling
    if (nodeRef.current) {
      updateNodeStyles(nodeRef.current, props.radiusScale, props.colorScale, props.trackColors);
    }
  }, [props.data, props.radiusScale, props.colorScale, props.trackColors]);

  // Fit on first render
  useEffect(() => {
    resetZoom();
  }, [props.data]);

  return (
    <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} id="tree-lineage-view-svg">
      <g ref={groupRef}></g>
    </svg>
  );
}
