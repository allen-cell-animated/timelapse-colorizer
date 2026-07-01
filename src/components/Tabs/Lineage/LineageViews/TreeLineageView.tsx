import * as d3 from "d3";
import React, { ReactElement, useEffect, useRef } from "react";
import { Color } from "three";

import { useConstructor } from "src/hooks";

import { LineageData, SharedLineageViewProps, TrackInfo } from "../types";

const TREE_LEAF_HEIGHT_PX = 30;
const TREE_LAYER_DEPTH_PX = 110;

type TreeLineageViewProps = SharedLineageViewProps & {};

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, d3.HierarchyPointNode<TrackInfo>, SVGGElement, TrackInfo>;

function getRelationships(data: LineageData): {
  idToChildren: Map<number, number[]>;
  idToParents: Map<number, number[]>;
  crossLinks: [number, number][];
} {
  const idToChildren = new Map<number, number[]>(data.trackInfo.map((n) => [n.id, []]));
  const idToParents = new Map<number, number[]>(data.trackInfo.map((n) => [n.id, []]));

  // Links to a node where the node already has a parent (i.e. the second parent
  // of a merge node).
  const crossLinks: [number, number][] = [];
  const idsWithParents = new Set<number>();

  for (const [source, target] of data.edges) {
    if (!idsWithParents.has(target)) {
      idToChildren.get(source)?.push(target);
    } else {
      // If the target node already has a parent, intentionally prevent adding
      // it to the children of this source node or else it will be duplicated in
      // the tree. Instead, add it to a list of cross links that will be
      // rendered separately.
      crossLinks.push([source, target]);
    }
    idToParents.get(target)?.push(source);
    idsWithParents.add(target);
  }
  return { idToChildren, idToParents, crossLinks };
}

function renderTree(
  g: d3.Selection<SVGGElement, TrackInfo, null, undefined>,
  data: LineageData,
  onClickTrack?: (trackId: number) => void,
  onHoverTrack?: (trackId: number | null) => void
): NodeSelection | undefined {
  const { trackInfo } = data;
  const edges = [...data.edges];

  const trackIdToTrackInfo = new Map<number, TrackInfo>(trackInfo.map((track) => [track.id, track]));
  const { idToChildren, idToParents, crossLinks } = getRelationships(data);

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
    .attr("x1", (d) => d.source.y)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.y)
    .attr("y2", (d) => d.target.x);

  if (crossLinks.length) {
    const posOf = new Map(treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.y }]));
    g.append("g")
      .selectAll("line")
      .data(crossLinks)
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

  // TODO: return nodes out of this method, so they can be updated/recalculated
  // without updating the entire tree?

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
  const handleClickTrack = (_event: any, d: d3.HierarchyPointNode<TrackInfo>) => {
    onClickTrack?.(d.data.id);
  };
  const handleHoverTrack = (_event: any, d: d3.HierarchyPointNode<TrackInfo>) => {
    // d3.select(event.currentTarget).select("circle").attr("stroke", "#fff").attr("stroke-width", 2.5);
    onHoverTrack?.(d.data.id);
  };
  const handleUnhoverTrack = (_event: any, _d: d3.HierarchyPointNode<TrackInfo>) => {
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
) {
  // Draw circles for each node
  node
    .select<SVGCircleElement>("circle")
    .attr("r", (d) => radiusScale(d.data.length))
    .attr("fill", (d) => colorScale(d.data.startTime))
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
    .attr("font-size", 9)
    .attr("pointer-events", "none");
}

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

  const resetZoom = () => {
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
      const onClickTrack = (trackId: number) => onClickRef.current?.(trackId);
      const onHoverTrack = (trackId: number | null) => onHoverRef.current?.(trackId);
      nodeRef.current = renderTree(g, props.data, onClickTrack, onHoverTrack);
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
