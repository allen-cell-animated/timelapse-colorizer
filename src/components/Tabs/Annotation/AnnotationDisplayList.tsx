import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import { Color } from "three";

import { TagIconSVG } from "../../../assets";
import { Dataset, Track } from "../../../colorizer";
import { ScrollShadowContainer, useScrollShadow } from "../../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import DropdownItem from "../../Dropdowns/DropdownItem";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";
import AnnotationTrackThumbnail from "./AnnotationTrackThumbnail";

type AnnotationDisplayListProps = {
  dataset: Dataset | null;
  ids: number[];
  idToValue: Map<number, string> | undefined;
  valueToIds: Map<string, Set<number>> | undefined;
  setFrame: (frame: number) => Promise<void>;
  onClickTrack: (trackId: number) => void;
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  selectedTrack: Track | null;
  selectedId?: number;
  highlightRange: number[] | null;
  lastClickedId: number | null;
  frame: number;
  labelColor: Color;
};

const ListLayoutContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  gap: 10px;
`;

const VerticalDivider = styled.div`
  height: 20px;
  width: 1px;
  background-color: var(--color-dividers);
`;

type LookupInfo = {
  trackIds: number[];
  trackToIds: Map<string, number[]>;
  valueToTracksToIds?: Map<string, Map<number, number[]>>;
};

const getTrackLookups = (
  dataset: Dataset,
  ids: number[],
  idToValue: Map<number, string> | undefined,
  valueToIds: Map<string, Set<number>> | undefined
): LookupInfo => {
  const trackToIds: Map<string, number[]> = new Map();
  const valueToTracksToIds: Map<string, Map<number, number[]>> = new Map();
  const trackIds: Set<number> = new Set();

  const hasValueInfo = idToValue !== undefined && valueToIds !== undefined;

  // Reverse the order of IDs so that the most recently added IDs are at the
  // front of the list.
  const idsReversed = ids.toReversed();
  for (const id of idsReversed) {
    const trackId = dataset.getTrackId(id);
    const trackIdString = trackId.toString();
    if (!trackToIds.has(trackIdString)) {
      trackToIds.set(trackIdString, [id]);
    } else {
      const ids = trackToIds.get(trackIdString);
      if (ids) {
        ids.push(id);
      }
    }

    trackIds.add(trackId);

    // Store value information.
    if (hasValueInfo) {
      const value = idToValue.get(id);
      if (!value) {
        continue;
      }
      if (!valueToTracksToIds.has(value)) {
        valueToTracksToIds.set(value, new Map());
      }
      const trackIdToIds = valueToTracksToIds.get(value)!;
      if (!trackIdToIds.has(trackId)) {
        trackIdToIds.set(trackId, [id]);
      } else {
        const ids = trackIdToIds.get(trackId);
        if (ids) {
          ids.push(id);
        }
      }
    }
  }

  return {
    trackIds: Array.from(trackIds),
    trackToIds,
    valueToTracksToIds: hasValueInfo ? valueToTracksToIds : undefined,
  };
};

const TrackListItem = (props: {
  trackId: number;
  ids: number[];
  dataset: Dataset;
  isSelectedTrack: boolean;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
}): ReactElement => {
  const { trackId, ids, dataset, isSelectedTrack, onClickTrack, labelColor } = props;
  const theme = useContext(AppThemeContext);

  const track = dataset.getTrack(trackId);
  return (
    <DropdownItem
      key={trackId}
      onClick={() => {
        onClickTrack(trackId);
      }}
      selected={isSelectedTrack}
    >
      <FlexRowAlignCenter $gap={5}>
        <AnnotationTrackThumbnail
          widthPx={75}
          heightPx={14}
          ids={ids}
          track={track ?? null}
          dataset={dataset}
          color={labelColor}
        ></AnnotationTrackThumbnail>
        <p style={{ margin: 0 }}>
          {trackId}{" "}
          <span style={{ color: theme.color.text.hint }}>
            ({ids.length}/{track?.times.length ?? 0})
          </span>
        </p>
      </FlexRowAlignCenter>
    </DropdownItem>
  );
};

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  // Organize ids by track and value for display.
  const {
    trackIds,
    trackToIds,
    valueToTracksToIds: valueToTrackIds,
  } = useMemo((): LookupInfo => {
    if (!props.dataset) {
      return {
        trackIds: [],
        trackToIds: new Map(),
        valueToTracksToIds: new Map(),
      };
    }
    return getTrackLookups(props.dataset, props.ids, props.idToValue, props.valueToIds);
  }, [props.dataset, props.ids, props.idToValue, props.valueToIds]);

  function createTrackList(tracksAndIds: { trackId: number; ids: number[] }[]): ReactElement {
    return (
      <ul style={{ margin: 0, listStyle: "none", paddingLeft: "5px" }}>
        {tracksAndIds.map(({ trackId, ids }) => {
          const isSelectedTrack = props.selectedTrack?.trackId === trackId;
          return (
            <li key={trackId}>
              <TrackListItem
                trackId={trackId}
                ids={ids}
                dataset={props.dataset!}
                isSelectedTrack={isSelectedTrack}
                labelColor={props.labelColor}
                onClickTrack={props.onClickTrack}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  let listContents;
  if (props.ids.length === 0 || props.dataset === null) {
    // Show placeholder if there are no elements
    listContents = (
      <FlexRowAlignCenter style={{ width: "100% ", height: "100px" }}>
        <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", width: "100%", color: theme.color.text.disabled }}>
          <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
          <p>Labeled tracks will appear here.</p>
        </FlexColumnAlignCenter>
      </FlexRowAlignCenter>
    );
  } else if (valueToTrackIds && valueToTrackIds.size > 0) {
    // Multi-value labels; organize tracks by value.
    listContents = (
      <FlexColumn style={{ marginLeft: "10px" }}>
        {/* Render each label as its own section */}
        {Array.from(valueToTrackIds.entries()).map(([value, trackIdToIds]) => {
          const trackIdsWithIds = Array.from(trackIdToIds.entries()).map(([trackId, ids]) => ({
            trackId,
            ids,
          }));
          return (
            <FlexColumn>
              <FlexRowAlignCenter $gap={5}>
                <p style={{ minWidth: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <b>{value}</b>
                </p>
                <VerticalDivider />
                <p style={{ whiteSpace: "nowrap" }}>
                  {trackIdsWithIds.length} track{trackIdsWithIds.length > 1 ? "s" : ""}
                </p>
              </FlexRowAlignCenter>
              <FlexColumn>{createTrackList(trackIdsWithIds)}</FlexColumn>
            </FlexColumn>
          );
        })}
      </FlexColumn>
    );
  } else {
    // Boolean values. All tracks are displayed in a single list.
    // TODO: Handle updates to this in a transition so the UI updates don't block
    // interaction.
    listContents = createTrackList(
      trackIds.map((trackId) => {
        const ids = trackToIds.get(trackId.toString())!;
        return { trackId, ids };
      })
    );
  }

  const selectedTrackIds = trackToIds.get(selectedTrackId?.toString() ?? "") ?? [];

  // Show a marker in the selected track thumbnail if the last clicked ID is
  // part of the selected track.
  let markedTime: number | undefined;
  if (props.lastClickedId !== null && props.dataset) {
    const id = props.lastClickedId;
    const lastClickedTime = props.dataset.getTime(id);
    const isSelectedTrack = props.dataset.getTrackId(id) === selectedTrackId;
    if (lastClickedTime !== undefined && isSelectedTrack) {
      markedTime = lastClickedTime;
    }
  }
  // Highlight a range of objects in the selected track thumbnail if provided
  let highlightRange: number[] | undefined;
  if (props.highlightRange && props.highlightRange.length > 0) {
    const trackId = props.dataset?.getTrackId(props.highlightRange[0]);
    if (trackId === selectedTrackId) {
      highlightRange = props.highlightRange;
    }
  }

  return (
    <FlexColumn>
      <p
        style={{
          fontSize: theme.font.size.label,
          marginTop: 0,
          marginBottom: "5px",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <b>{trackIds.length > 0 ? `${trackIds.length} track(s)` : "No tracks labeled"}</b>
      </p>
      {/* Column 1 is all of the tracks displayed as an unordered list */}
      <ListLayoutContainer>
        <FlexColumn style={{ height: "100%", width: "45%" }}>
          <div style={{ position: "relative" }}>
            <div style={{ height: "490px", overflowY: "auto" }} ref={scrollRef} onScroll={onScrollHandler}>
              {listContents}
            </div>
            <ScrollShadowContainer style={scrollShadowStyle} />
          </div>
        </FlexColumn>
        {/* Column 2  is a side panel showing the labeled IDs for the selected track. */}
        <div
          style={{
            width: "calc(55% - 20px)",
            height: "calc(100% - 10px)",
            padding: "5px 10px 10px 10px",
            border: "1px solid var(--color-borders)",
            borderRadius: "4px",
            flexGrow: 2,
          }}
        >
          <FlexRowAlignCenter style={{ marginBottom: "5px" }} $gap={10}>
            <AnnotationTrackThumbnail
              frame={props.frame}
              setFrame={props.setFrame}
              ids={selectedTrackIds}
              track={props.selectedTrack}
              dataset={props.dataset}
              color={props.labelColor}
              mark={markedTime}
              highlightedIds={highlightRange}
            ></AnnotationTrackThumbnail>

            <p style={{ fontSize: theme.font.size.label, marginTop: 0 }}>
              {selectedTrackId ? (
                <span>
                  Track {selectedTrackId}{" "}
                  <span style={{ color: theme.color.text.hint }}>
                    ({selectedTrackIds.length}/{props.selectedTrack?.times.length})
                  </span>
                </span>
              ) : (
                `No track selected`
              )}
            </p>
          </FlexRowAlignCenter>
          <AnnotationDisplayTable
            onClickObjectRow={props.onClickObjectRow}
            onClickDeleteObject={props.onClickDeleteObject}
            dataset={props.dataset}
            ids={selectedTrackId ? trackToIds.get(selectedTrackId?.toString()) ?? [] : []}
            idToValue={props.idToValue}
            height={410}
            selectedId={props.selectedId}
            hideTrackColumn={true}
          ></AnnotationDisplayTable>
        </div>
      </ListLayoutContainer>
    </FlexColumn>
  );
}
