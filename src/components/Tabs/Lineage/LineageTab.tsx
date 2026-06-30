import * as d3 from "d3";
import React, { ReactElement, useCallback, useMemo, useRef, useState } from "react";

import Track from "src/colorizer/Track";
import HoverTooltip from "src/components/Tooltips/HoverTooltip";
import { TooltipCard } from "src/components/Tooltips/TooltipCard";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

import { getLineageData } from "./lineage_utils";
import TreeLineageView from "./LineageViews/TreeLineageView";

export default function LineageTab(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setTracks = useViewerStateStore((state) => state.setTracks);
  const setFrame = useViewerStateStore((state) => state.setFrame);

  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const lastHoveredTrack = useRef<Track | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const lineageData = useMemo(() => {
    return dataset ? getLineageData(dataset) : { trackInfo: [], edges: [] };
  }, [dataset]);

  const startMin = d3.min(lineageData.trackInfo, (d) => d.startTime) ?? 0;
  const startMax = d3.max(lineageData.trackInfo, (d) => d.startTime) ?? startMin;
  const lengthMin = d3.min(lineageData.trackInfo, (d) => d.length) ?? 1;
  const lengthMax = d3.max(lineageData.trackInfo, (d) => d.length) ?? lengthMin;

  const safeStartMax = startMin === startMax ? startMin + 1 : startMax;
  const safeLengthMax = lengthMin === lengthMax ? lengthMin + 1 : lengthMax;

  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([startMin, safeStartMax]);
  const radiusScale = d3.scaleSqrt().domain([lengthMin, safeLengthMax]).range([10, 30]);

  // useEffect(() => {
  //   if (containerRef.current && lineageData) {
  //     if (layoutMode === LayoutMode.FORCE) {
  //       force.render(containerRef.current, lineageData);
  //       return () => {
  //         force.teardown(containerRef.current!);
  //       };
  //     } else {
  //       tree.render(containerRef.current, lineageData);
  //       return () => {
  //         tree.teardown(containerRef.current!);
  //       };
  //     }
  //   }
  //   return undefined;
  // }, [lineageData, layoutMode]);

  const onClickTrack = useCallback(
    (trackId: number) => {
      const track = dataset?.getTrack(trackId);
      if (track) {
        setTracks([track]);
        if (currentFrame < track.times[0] || currentFrame > track.times[track.times.length - 1]) {
          setFrame(track.times[0]);
        }
      }
    },
    [dataset, setTracks, currentFrame, setFrame]
  );

  const onHoverTrack = useCallback(
    (trackId: number | null) => {
      if (trackId === null) {
        setHoveredTrack(null);
      } else {
        const track = dataset?.getTrack(trackId);
        if (track) {
          setHoveredTrack(track);
          lastHoveredTrack.current = track;
        }
      }
    },
    [dataset]
  );

  const tooltipContent = useMemo(() => {
    return (
      <TooltipCard style={{ opacity: hoveredTrack ? 1 : 0 }}>
        {lastHoveredTrack.current && (
          <FlexColumn>
            <div>Track ID: {lastHoveredTrack.current.trackId}</div>
            <div>Start: {lastHoveredTrack.current.startTime()}</div>
            <div>Length: {lastHoveredTrack.current.duration()}</div>
          </FlexColumn>
        )}
      </TooltipCard>
    );
  }, [hoveredTrack]);

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <FlexRow></FlexRow>

      <HoverTooltip tooltipContent={tooltipContent} style={{ width: "100%", height: "100%" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
          <TreeLineageView
            container={containerRef}
            data={lineageData}
            colorScale={colorScale}
            radiusScale={radiusScale}
            onClick={onClickTrack}
            onHover={onHoverTrack}
          ></TreeLineageView>
          {lineageData?.edges.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
          )}
        </div>
      </HoverTooltip>
    </FlexColumn>
  );
}
