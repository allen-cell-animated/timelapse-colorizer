import * as d3 from "d3";
import React, { type ReactElement, useCallback, useMemo, useRef, useState } from "react";

import type Track from "src/colorizer/Track";
import HoverTooltip from "src/components/Tooltips/HoverTooltip";
import { TooltipCard } from "src/components/Tooltips/TooltipCard";
import { SHORTCUT_KEYS } from "src/constants/shortcuts";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";
import { areAnyHotkeysPressed } from "src/utils/user_input";

import { getLineageData, getLineageRelationships } from "./lineage_utils";
import TreeLineageView from "./LineageViews/TreeLineageView";
import type { LineageData, SharedLineageViewProps } from "./types";

function getColorAndRadiusScale(data: LineageData): {
  colorScale: d3.ScaleSequential<string>;
  radiusScale: d3.ScalePower<number, number>;
} {
  const trackInfo = Array.from(data.trackIdToTrackInfo.values());
  const startMin = d3.min(trackInfo, (d) => d.startTime) ?? 0;
  const startMax = d3.max(trackInfo, (d) => d.startTime) ?? startMin;
  const lengthMin = d3.min(trackInfo, (d) => d.length) ?? 1;
  const lengthMax = d3.max(trackInfo, (d) => d.length) ?? lengthMin;

  const safeStartMax = startMin === startMax ? startMin + 1 : startMax;
  const safeLengthMax = lengthMin === lengthMax ? lengthMin + 1 : lengthMax;

  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([startMin, safeStartMax]);
  const radiusScale = d3.scaleSqrt().domain([lengthMin, safeLengthMax]).range([10, 25]);
  return { colorScale, radiusScale };
}

const EMPTY_LINEAGE_DATA = { trackIdToTrackInfo: new Map(), edges: [] } satisfies LineageData;

/**
 * Renders lineage data in a tab. Includes a tree view of the tracks and their
 * relationships, and a tooltip on hover.
 */
export default function LineageTab(): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const tracks = useViewerStateStore((state) => state.tracks);
  const trackColors = useViewerStateStore((state) => state.trackColors);
  const setTracks = useViewerStateStore((state) => state.setTracks);
  const toggleTrack = useViewerStateStore((state) => state.toggleTrack);
  const setFrame = useViewerStateStore((state) => state.setFrame);

  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const lastHoveredTrack = useRef<Track | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const lineageData = useMemo(() => {
    return dataset ? getLineageData(dataset) : EMPTY_LINEAGE_DATA;
  }, [dataset]);
  const lineageRelationships = useMemo(() => {
    return getLineageRelationships(lineageData);
  }, [lineageData]);
  const { colorScale, radiusScale } = useMemo(() => getColorAndRadiusScale(lineageData), [lineageData]);

  //// Callbacks ////

  const onClickTrack = useCallback(
    (trackId: number) => {
      const isMultiTrackSelectHotkeyPressed = areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode);
      const track = dataset?.getTrack(trackId);
      if (track) {
        if (isMultiTrackSelectHotkeyPressed) {
          toggleTrack(track);
        } else {
          setTracks([track]);
        }
        if (currentFrame < track.times[0] || currentFrame > track.times[track.times.length - 1]) {
          setFrame(track.times[0]);
        }
      }
    },
    [dataset, setTracks, toggleTrack, currentFrame, setFrame]
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

  //// Rendering ////

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

  const lineageViewProps: SharedLineageViewProps = {
    container: containerRef,
    data: lineageData,
    relationships: lineageRelationships,
    colorScale: colorScale,
    radiusScale: radiusScale,
    onClick: onClickTrack,
    onHover: onHoverTrack,
    selectedTracks: tracks,
    trackColors: trackColors,
  };

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <FlexRow></FlexRow>

      <HoverTooltip tooltipContent={tooltipContent} style={{ width: "100%", height: "100%" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
          <TreeLineageView {...lineageViewProps}></TreeLineageView>

          {lineageData?.edges.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
          )}
        </div>
      </HoverTooltip>
    </FlexColumn>
  );
}
