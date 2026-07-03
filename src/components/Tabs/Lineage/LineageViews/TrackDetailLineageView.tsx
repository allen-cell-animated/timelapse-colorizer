import * as d3 from "d3";
import React, { ReactElement, useEffect, useRef } from "react";

import { Track } from "src/colorizer";
import { useConstructor } from "src/hooks";

import { LineageData, LineageDataRelationships, LineageObjectInfo, SharedLineageViewProps } from "../types";

type TrackDetailLineageViewProps = SharedLineageViewProps & {};

// const enum TrackDetailLineageViewHtmlIds {}

type NodeSelection = d3.Selection<SVGGElement | d3.BaseType, LineageObjectInfo, SVGGElement, LineageObjectInfo>;

function renderView(
  g: d3.Selection<SVGGElement, LineageObjectInfo, null, undefined>,
  data: LineageData,
  relationships: LineageDataRelationships,
  selectedTracks: Map<number, Track>
): NodeSelection | undefined {
  const track = selectedTracks.values().next().value;
  if (!track) {
    return;
  }

  // TODO: will also need to handle node IDs => lookup from object IDs

  const selectedTrackIds = new Set(track.ids);
  const selectedIds = new Set(track.ids);
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

  const allSelectedIds = new Set([...selectedIds, ...parentIds, ...childIds]);
  const trackNodes: LineageObjectInfo[] = [];
  for (const id of allSelectedIds) {
    // Need dataset to look up info from ID....
    // trackNodes.push({
    //   id: track.ids[i],
    //   trackId: track.trackId,
    //   time: track.times[i],
    // });
  }
  // Add on the parent and child nodes into the graph, plus their relationships

  const trackEdges = [];
  for (let i = 0; i < track.ids.length - 1; i++) {
    trackEdges.push([track.ids[i], track.ids[i + 1]]);
  }

  return;
}

function updateNodeStyles(nodeSelection: NodeSelection, selectedTracks: Map<number, Track>, time: number): void {}

export default function LineageTrackDetailView(props: TrackDetailLineageViewProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

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
