import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../colorizer";
import { getEmptyLookupInfo, getTrackLookups, LookupInfo } from "../../../colorizer/utils/annotation_utils";
import { ScrollShadowContainer, useScrollShadow } from "../../../colorizer/utils/react_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import AnnotationValueList from "./AnnotationDisplay/AnnotationValueList";
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

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  // Organize ids by track and value for display.
  const lookupInfo = useMemo((): LookupInfo => {
    if (!props.dataset) {
      return getEmptyLookupInfo();
    }
    return getTrackLookups(props.dataset, props.ids, props.idToValue, props.valueToIds);
  }, [props.dataset, props.ids, props.idToValue, props.valueToIds]);
  const { trackIds, trackToIds } = lookupInfo;

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
            <div style={{ height: "450px", overflowY: "auto" }} ref={scrollRef} onScroll={onScrollHandler}>
              <AnnotationValueList lookupInfo={lookupInfo} {...props} />
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
