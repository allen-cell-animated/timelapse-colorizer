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

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  // Organize ids by track
  const trackToIds: Map<string, number[]> = useMemo(() => {
    if (!props.dataset) {
      return new Map();
    }
    const map: Map<string, number[]> = new Map();
    for (const id of props.ids) {
      const trackId: string = props.dataset.getTrackId(id).toString();
      if (!map.has(trackId)) {
        map.set(trackId, [id]);
      } else {
        const ids = map.get(trackId);
        if (ids) {
          ids.push(id);
        }
      }
    }
    return map;
  }, [props.dataset, props.ids]);

  // Track IDs, in order of appearance in the ID list. The track that was last
  // added will be at the top of the list.
  const trackIds = useMemo(() => {
    return Array.from(trackToIds.keys())
      .map((trackId) => parseInt(trackId, 10))
      .reverse();
  }, [trackToIds]);

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
  } else {
    listContents = (
      <ul style={{ marginTop: 0 }}>
        {trackIds.map((trackId) => {
          const track = props.dataset?.getTrack(trackId);
          const ids = trackToIds.get(trackId.toString())!;
          const isSelectedTrack = props.selectedTrack?.trackId === trackId;
          return (
            <li key={trackId}>
              <DropdownItem
                key={trackId}
                onClick={() => {
                  props.onClickTrack(trackId);
                }}
                selected={isSelectedTrack}
              >
                <FlexRowAlignCenter $gap={5}>
                  <AnnotationTrackThumbnail
                    widthPx={75}
                    heightPx={14}
                    ids={ids}
                    track={track ?? null}
                    dataset={props.dataset}
                    color={props.labelColor}
                  ></AnnotationTrackThumbnail>
                  <p style={{ margin: 0 }}>
                    {trackId}{" "}
                    <span style={{ color: theme.color.text.hint }}>
                      ({ids.length}/{track?.times.length ?? 0})
                    </span>
                  </p>
                </FlexRowAlignCenter>
              </DropdownItem>
            </li>
          );
        })}
      </ul>
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
        <FlexColumn style={{ height: "100%", width: "40%" }}>
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
            width: "calc(60% + 5px)",
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
            height={410}
            selectedId={props.selectedId}
            hideTrackColumn={true}
          ></AnnotationDisplayTable>
        </div>
      </ListLayoutContainer>
    </FlexColumn>
  );
}
