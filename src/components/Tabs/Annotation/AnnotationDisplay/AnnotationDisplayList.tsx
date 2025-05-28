import { Tooltip } from "antd";
import React, { ReactElement, useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../../colorizer";
import { getEmptyLookupInfo, getTrackLookups, LookupInfo } from "../../../../colorizer/utils/annotation_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../../../styles/utils";

import { AppThemeContext } from "../../../AppStyle";
import AnnotationTrackThumbnail from "../AnnotationTrackThumbnail";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";
import ValueAndTrackList from "./ValueAndTrackList";

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

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;
  // const [thumbnailHoveredX, setThumbnailHoveredX] = useState<number | null>(null);
  const [thumbnailHoveredTime, setThumbnailHoveredTime] = useState<number | null>(null);

  // Organize ids by track and value for display.
  const lookupInfo = useMemo((): LookupInfo => {
    if (!props.dataset) {
      return getEmptyLookupInfo();
    }
    return getTrackLookups(props.dataset, props.ids, props.idToValue, props.valueToIds);
  }, [props.dataset, props.ids, props.idToValue, props.valueToIds]);
  const { trackIds, trackToIds } = lookupInfo;

  let highlightedIds = trackToIds.get(selectedTrackId?.toString() ?? "") ?? [];
  let bgIds: number[] = [];

  // If the selected track has an ID in the current frame, show it and all IDs
  // with the same value with a more prominently in the thumbnail.
  // Also trigger this when the user hovers over a time in the thumbnail.
  const hoveredId = thumbnailHoveredTime ? props.selectedTrack?.getIdAtTime(thumbnailHoveredTime) : undefined;
  const hoveredValue = hoveredId ? props.idToValue?.get(hoveredId) : undefined;
  const currentId = props.selectedTrack?.getIdAtTime(props.frame);
  const currentValue = currentId ? props.idToValue?.get(currentId) : undefined;
  // Hovered highlight takes precedence over current frame.
  const value = hoveredValue ?? currentValue;
  const id = hoveredValue ? hoveredId : currentId;
  if (value !== undefined && id && highlightedIds.includes(id)) {
    const currentValueIds = highlightedIds.filter((id) => props.idToValue?.get(id) === value);
    bgIds = highlightedIds;
    highlightedIds = currentValueIds;
  }

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
          <div style={{ height: "480px", overflowY: "auto" }}>
            <ValueAndTrackList lookupInfo={lookupInfo} {...props} />
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
            <Tooltip
              title={hoveredValue}
              placement="top"
              open={hoveredValue ? true : false}
              trigger={["hover", "focus"]}
            >
              <AnnotationTrackThumbnail
                frame={props.frame}
                setFrame={props.setFrame}
                onHover={(_x, time) => {
                  // setThumbnailHoveredX(x);
                  setThumbnailHoveredTime(time);
                }}
                ids={highlightedIds}
                bgIds={bgIds}
                track={props.selectedTrack}
                dataset={props.dataset}
                color={props.labelColor}
                mark={markedTime}
                highlightedIds={highlightRange}
              ></AnnotationTrackThumbnail>
            </Tooltip>

            <p style={{ fontSize: theme.font.size.label, marginTop: 0 }}>
              {selectedTrackId ? (
                <span>
                  Track {selectedTrackId}{" "}
                  <span style={{ color: theme.color.text.hint }}>
                    ({highlightedIds.length}/{props.selectedTrack?.times.length})
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
