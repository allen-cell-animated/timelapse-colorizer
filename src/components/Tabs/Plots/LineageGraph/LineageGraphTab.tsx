import * as d3 from "d3";
import React, { type ReactElement, useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";

import type Track from "src/colorizer/Track";
import PlotsTabToolbar from "src/components/Tabs/Plots/PlotsTabToolbar";
import type { SharedPlotTabProps } from "src/components/Tabs/Plots/types";
import HoverTooltip from "src/components/Tooltips/HoverTooltip";
import { TooltipCard } from "src/components/Tooltips/TooltipCard";
import { SHORTCUT_KEYS } from "src/constants/shortcuts";
import { colorizeStateSelector, useViewerStateStore } from "src/state";
import { getNextColorId } from "src/state/slices";
import { StyledHorizontalRule } from "src/styles/components";
import { FlexColumn } from "src/styles/utils";
import { areAnyHotkeysPressed } from "src/utils/user_input";

import { getLineageData, getLineageRelationships, getTreeHierarchy } from "./lineage_utils";
import LineageTrackDetailView from "./LineageViews/TrackDetailLineageView";
import TreeLineageView, { type TreeLineageViewProps } from "./LineageViews/TreeLineageView";
import { getAncestors, getDescendants } from "./tree_utils";
import type { LineageData, TrackInfo } from "./types";

const enum TreeTraversalDirection {
  ANCESTORS,
  DESCENDANTS,
}

function getColorAndRadiusScale(data: LineageData): {
  colorScale: d3.ScaleSequential<string>;
  radiusScale: d3.ScalePower<number, number>;
} {
  const trackInfo = Array.from(data.trackIdToTrackInfo.values());
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

const EMPTY_LINEAGE_DATA: LineageData = { trackIdToTrackInfo: new Map(), edges: [] };

type LineageGraphTabProps = SharedPlotTabProps;

/**
 * Renders lineage data in a tab. Includes a tree view of the tracks and their
 * relationships, and a tooltip on hover.
 */
export default function LineageGraphTab(props: LineageGraphTabProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const tracks = useViewerStateStore((state) => state.tracks);
  const trackColors = useViewerStateStore((state) => state.trackColors);
  const addTracks = useViewerStateStore((state) => state.addTracks);
  const removeTracks = useViewerStateStore((state) => state.removeTracks);
  const clearTracks = useViewerStateStore((state) => state.clearTracks);
  const setTracks = useViewerStateStore((state) => state.setTracks);
  const toggleTrack = useViewerStateStore((state) => state.toggleTrack);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const applyTrackColorToRelatives = useViewerStateStore((state) => state.applyTrackColorToRelatives);
  const setApplyTrackColorToRelatives = useViewerStateStore((state) => state.setApplyTrackColorToRelatives);
  const colorizeParams = useViewerStateStore(useShallow(colorizeStateSelector));

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
  const hierarchy = useMemo(() => {
    return getTreeHierarchy(lineageData, lineageRelationships);
  }, [lineageData, lineageRelationships]);

  const { colorScale, radiusScale } = useMemo(() => getColorAndRadiusScale(lineageData), [lineageData]);

  //// Callbacks ////

  const handleTrackClicked = useCallback(
    (trackId: number | null): Track | undefined => {
      const isMultiTrackSelectHotkeyPressed = areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode);
      if (trackId === null) {
        if (!isMultiTrackSelectHotkeyPressed) {
          clearTracks();
        }
        return;
      }
      const track = dataset?.getTrack(trackId) ?? undefined;
      if (track) {
        if (isMultiTrackSelectHotkeyPressed) {
          toggleTrack(track);
        } else {
          setTracks([track]);
        }
      }
      return track;
    },
    [dataset, setTracks, toggleTrack, clearTracks]
  );

  const onClickTrack = useCallback(
    (trackId: number | null, time?: number) => {
      const track = handleTrackClicked(trackId);
      if (track) {
        if (time !== undefined) {
          setFrame(time);
        } else if (currentFrame < track.times[0] || currentFrame > track.times[track.times.length - 1]) {
          setFrame(track.times[0]);
        }
      }
    },
    [handleTrackClicked, currentFrame, setFrame]
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

  /** Select and deselect the node and its relatives (parents or children). */
  const setRelativesSelected = useCallback(
    (trackId: number, direction: TreeTraversalDirection, select: boolean) => {
      const trackIdSet =
        direction === TreeTraversalDirection.DESCENDANTS
          ? getDescendants(trackId, lineageData, lineageRelationships)
          : getAncestors(trackId, lineageData, lineageRelationships);
      trackIdSet.add(trackId);
      const trackIds = Array.from(trackIdSet);

      if (select) {
        const trackObjects = trackIds
          .map((id) => dataset?.getTrack(id))
          .filter((track): track is Track => track !== undefined);
        let colorId: number | undefined;
        if (applyTrackColorToRelatives) {
          const { tracks, trackToColorId } = useViewerStateStore.getState();
          // Get base track color
          const baseTrackColorId = trackToColorId.get(trackId) ?? getNextColorId(tracks, trackToColorId);
          colorId = applyTrackColorToRelatives ? baseTrackColorId : undefined;
          // Remove any existing track colors if all relatives should have the
          // same color
          removeTracks(trackIds);
        }
        addTracks(trackObjects, colorId);
      } else {
        removeTracks(trackIds);
      }
    },
    [dataset, lineageData, lineageRelationships, applyTrackColorToRelatives, addTracks, removeTracks]
  );
  const selectNodeAndChildren = useCallback(
    (id: number) => setRelativesSelected(id, TreeTraversalDirection.DESCENDANTS, true),
    [setRelativesSelected]
  );
  const selectNodeAndParents = useCallback(
    (id: number) => setRelativesSelected(id, TreeTraversalDirection.ANCESTORS, true),
    [setRelativesSelected]
  );
  const deselectNodeAndChildren = useCallback(
    (id: number) => setRelativesSelected(id, TreeTraversalDirection.DESCENDANTS, false),
    [setRelativesSelected]
  );
  const deselectNodeAndParents = useCallback(
    (id: number) => setRelativesSelected(id, TreeTraversalDirection.ANCESTORS, false),
    [setRelativesSelected]
  );

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

  const lineageViewProps: TreeLineageViewProps = {
    container: treeViewContainerRef,
    data: lineageData,
    hierarchy,
    relationships: lineageRelationships,
    colorScale,
    radiusScale,
    onClick: (trackId: number) => onClickTrack(trackId),
    onHover: onHoverTrack,
    selectedTracks: tracks,
    trackColors,
    selectNodeAndChildren,
    selectNodeAndParents,
    deselectNodeAndChildren,
    deselectNodeAndParents,
    applyTrackColorToRelatives,
    setApplyTrackColorToRelatives,
  };

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <PlotsTabToolbar>
        {props.toolbar}
        <div></div>
      </PlotsTabToolbar>
      <HoverTooltip
        tooltipContent={tooltipContent}
        style={{ width: "100%", flexGrow: 3, flexBasis: "300px" }}
        disabled={!tooltipVisible}
      >
        <div ref={treeViewContainerRef} style={{ width: "100%", height: "100%" }}>
          <TreeLineageView {...lineageViewProps}></TreeLineageView>

          {lineageData?.edges.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>No lineage data available.</div>
          )}
        </div>
      </HoverTooltip>
      <StyledHorizontalRule style={{ margin: "0", flexGrow: 0 }} />
      <div
        ref={detailViewContainerRef}
        style={{ width: "100%", flexGrow: 1, flexBasis: "300px", backgroundColor: "#fafafa" }}
      >
        <LineageTrackDetailView
          container={detailViewContainerRef}
          dataset={dataset}
          selectedTracks={tracks}
          trackColors={trackColors}
          data={lineageData}
          relationships={lineageRelationships}
          time={currentFrame}
          colorizeParams={colorizeParams}
          onClick={(trackInfo, time) => onClickTrack(trackInfo.id, time)}
          // TODO: Show hover tooltip for track detail view
          onHover={undefined}
          selectNodeAndChildren={selectNodeAndChildren}
          selectNodeAndParents={selectNodeAndParents}
          deselectNodeAndChildren={deselectNodeAndChildren}
          deselectNodeAndParents={deselectNodeAndParents}
          applyTrackColorToRelatives={applyTrackColorToRelatives}
          setApplyTrackColorToRelatives={setApplyTrackColorToRelatives}
        ></LineageTrackDetailView>
      </div>
    </FlexColumn>
  );
}
