import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../../colorizer";
import { getEmptyLookupInfo, getTrackLookups, LookupInfo } from "../../../../colorizer/utils/annotation_utils";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "../../../../styles/utils";
import { formatQuantityString } from "../../../../utils/formatting";

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
  rangeStartId: number | null;
  frame: number;
  labelColor: Color;
};

const ListLayoutContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  gap: 15px;
`;

const SectionLabel = styled.p`
  && {
    font-size: var(--font-size-label);
    margin-top: 0;
    margin-bottom: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: bold;
  }
`;

const VerticalDivider = styled.span`
  width: 1px;
  min-height: 50%;
  margin: 5px 0;
  background-color: var(--color-borders);
  align-self: stretch;
`;

const NO_WRAP: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;

  // Organize ids by track and value for display.
  const lookupInfo = useMemo((): LookupInfo => {
    if (!props.dataset) {
      return getEmptyLookupInfo();
    }
    return getTrackLookups(props.dataset, props.ids, props.idToValue, props.valueToIds);
  }, [props.dataset, props.ids, props.idToValue, props.valueToIds]);
  const { trackIds, trackToIds, valueToTracksToIds } = lookupInfo;

  const selectedTrackIds = trackToIds.get(selectedTrackId?.toString() ?? "") ?? [];

  // Show a marker in the selected track thumbnail if the last clicked ID is
  // part of the selected track.
  let markedTime: number | undefined;
  if (props.rangeStartId !== null && props.dataset) {
    const id = props.rangeStartId;
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

  let trackInfoText = formatQuantityString(trackIds.length, "track", "tracks");
  if (valueToTracksToIds) {
    trackInfoText += `, ${formatQuantityString(valueToTracksToIds.size, "value", "values")}`;
  }

  return (
    <FlexColumn>
      {/* Column 1 is all of the tracks displayed as an unordered list */}
      <ListLayoutContainer>
        <FlexColumn style={{ height: "100%", width: "calc(40% - 16px)" }}>
          <FlexRow style={{ marginBottom: "5px", alignItems: "flex-end" }} $gap={5}>
            <SectionLabel>Tracks</SectionLabel>
            <p
              style={{
                margin: 0,
                color: theme.color.text.hint,
                ...NO_WRAP,
              }}
            >
              ({trackInfoText})
            </p>
          </FlexRow>
          <div style={{ height: "480px", overflowY: "auto" }}>
            <ValueAndTrackList lookupInfo={lookupInfo} {...props} />
          </div>
        </FlexColumn>
        <VerticalDivider />
        {/* Column 2  is a side panel showing the labeled IDs for the selected track. */}
        <FlexColumn
          style={{
            width: "calc(60% - 15px)",
            height: "calc(100% - 10px)",
            flexGrow: 2,
          }}
        >
          <SectionLabel>Track detail</SectionLabel>
          <FlexRowAlignCenter style={{ marginBottom: "8px" }} $gap={4}>
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

            <p
              style={{
                fontSize: theme.font.size.label,
                marginTop: 0,
                marginLeft: "4px",
                ...NO_WRAP,
              }}
            >
              {selectedTrackId ? <span>Track {selectedTrackId} </span> : `No track selected`}
            </p>
            {selectedTrackId && (
              <p
                style={{
                  marginTop: 0,
                  color: theme.color.text.hint,
                  ...NO_WRAP,
                }}
              >
                {selectedTrackIds.length}/{props.selectedTrack?.times.length}
              </p>
            )}
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
        </FlexColumn>
      </ListLayoutContainer>
    </FlexColumn>
  );
}
