import * as d3 from "d3";
import React, { ReactElement, useCallback, useMemo, useRef } from "react";

import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

import { getLineageData } from "./lineage_utils";
import TreeLineageView from "./LineageViews/TreeLineageView";

export default function LineageTab(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setTracks = useViewerStateStore((state) => state.setTracks);
  const setFrame = useViewerStateStore((state) => state.setFrame);

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

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <FlexRow></FlexRow>

      <div ref={containerRef} style={{ width: "100%", height: "calc(100% - 40px)" }}>
        <TreeLineageView
          container={containerRef}
          data={lineageData}
          colorScale={colorScale}
          radiusScale={radiusScale}
          onClick={onClickTrack}
        ></TreeLineageView>
        {lineageData?.edges.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
        )}
      </div>
    </FlexColumn>
  );
}
