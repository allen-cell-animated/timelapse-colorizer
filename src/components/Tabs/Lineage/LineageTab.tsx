import * as d3 from "d3";
import React, { type ReactElement, useCallback, useMemo, useRef, useState } from "react";

import type Track from "src/colorizer/Track";
import HoverTooltip from "src/components/Tooltips/HoverTooltip";
import { TooltipCard } from "src/components/Tooltips/TooltipCard";
import { SHORTCUT_KEYS } from "src/constants/shortcuts";
import { useViewerStateStore } from "src/state";
import { StyledHorizontalRule } from "src/styles/components";
import { FlexColumn } from "src/styles/utils";
import { areAnyHotkeysPressed } from "src/utils/user_input";

import { getLineageData, getLineageRelationships, getObjectLineageData } from "./lineage_utils";
import LineageTrackDetailView from "./LineageViews/TrackDetailLineageView";
import TreeLineageView from "./LineageViews/TreeLineageView";
import type { LineageObjectInfo, TrackInfo } from "./types";
import type { LineageData, SharedLineageViewProps } from "./types";

function getColorAndRadiusScale(data: LineageData<TrackInfo>): {
  colorScale: d3.ScaleSequential<string>;
  radiusScale: d3.ScalePower<number, number>;
} {
  const trackInfo = Array.from(data.idToInfo.values());
  const startMin = d3.min(trackInfo, (d) => d.startTime) ?? 0;
  let startMax = d3.max(trackInfo, (d) => d.startTime) ?? startMin;
  const lengthMin = d3.min(trackInfo, (d) => d.length) ?? 1;
  let lengthMax = d3.max(trackInfo, (d) => d.length) ?? lengthMin;

  startMax = startMin === startMax ? startMin + 1 : startMax;
  lengthMax = lengthMin === lengthMax ? lengthMin + 1 : lengthMax;

  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([startMin, startMax]);
  const radiusScale = d3.scaleSqrt().domain([lengthMin, lengthMax]).range([10, 25]);
  return { colorScale, radiusScale };
}

const EMPTY_LINEAGE_DATA = { idToInfo: new Map(), edges: [] } satisfies LineageData<TrackInfo>;

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

  const treeViewContainerRef = useRef<HTMLDivElement>(null);
  const detailViewContainerRef = useRef<HTMLDivElement>(null);

  // Track data and relationships
  const lineageData = useMemo(() => {
    return dataset ? getLineageData(dataset) : EMPTY_LINEAGE_DATA;
  }, [dataset]);
  const lineageRelationships = useMemo(() => {
    return getLineageRelationships(lineageData);
  }, [lineageData]);
  const { colorScale, radiusScale } = useMemo(() => getColorAndRadiusScale(lineageData), [lineageData]);

  // Per-object data and relationships
  const objectLineageData: LineageData<LineageObjectInfo> = useMemo(() => {
    return dataset ? getObjectLineageData(dataset) : EMPTY_LINEAGE_DATA;
  }, [dataset]);
  const objectLineageRelationships = useMemo(() => {
    return getLineageRelationships(objectLineageData);
  }, [objectLineageData]);

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

  const onClickObject = useCallback(
    (info: LineageObjectInfo) => {
      if (!dataset) {
        return;
      }
      const { trackId, time } = info;
      if (!tracks.has(trackId)) {
        onClickTrack(trackId);
      } else {
        // Just jump to the time of the object in the track.
        setFrame(time);
      }
    },
    [onClickTrack, tracks]
  );

  const onHoverObject = useCallback((_info: LineageObjectInfo | null) => {}, []);

  //// Rendering ////

  const tooltipVisible = hoveredTrack !== null;
  const tooltipContent = useMemo(() => {
    return (
      <TooltipCard>
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

  const sharedProps: SharedLineageViewProps = {
    container: treeViewContainerRef,
    dataset: dataset,
    colorScale: colorScale,
    radiusScale: radiusScale,
    onClick: onClickTrack,
    onHover: onHoverTrack,
    selectedTracks: tracks,
    trackColors: trackColors,
  };

  const lineageViewProps = {
    ...sharedProps,
    data: lineageData,
    relationships: lineageRelationships,
  };

  return (
    <FlexColumn style={{ width: "100%", maxHeight: "100%" }}>
      <HoverTooltip
        tooltipContent={tooltipContent}
        style={{ width: "100%", flexGrow: 1, flexBasis: 3 }}
        disabled={!tooltipVisible}
      >
        <div ref={treeViewContainerRef} style={{ width: "100%", height: "100%" }}>
          <TreeLineageView {...lineageViewProps}></TreeLineageView>

          {lineageData?.edges.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
          )}
        </div>
        <StyledHorizontalRule style={{ margin: "0", flexGrow: 0 }} />
        <div
          ref={detailViewContainerRef}
          style={{ width: "100%", flexGrow: 1, flexBasis: 1, backgroundColor: "#f0f0f0" }}
        >
          <LineageTrackDetailView
            container={detailViewContainerRef}
            dataset={dataset}
            selectedTracks={tracks}
            trackColors={trackColors}
            data={objectLineageData}
            relationships={objectLineageRelationships}
            time={currentFrame}
            onClick={onClickObject}
            onHover={onHoverObject}
          ></LineageTrackDetailView>
        </div>
      </HoverTooltip>
    </FlexColumn>
  );
}
