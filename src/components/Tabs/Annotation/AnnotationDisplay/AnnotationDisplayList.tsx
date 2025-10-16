import { Tooltip } from "antd";
import React, { type ReactElement, useContext, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { type Color } from "three";

import { type Dataset, type Track } from "src/colorizer";
import { getEmptyLookupInfo, getTrackLookups, type LookupInfo } from "src/colorizer/utils/annotation_utils";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { formatQuantityString } from "src/utils/formatting";

import AnnotationDisplayTable, { type TableDataType } from "./AnnotationDisplayTable";
import AnnotationTrackThumbnail from "./AnnotationTrackThumbnail";
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

const TooltipContainer = styled.div<{ $x?: number }>`
  position: relative;
  & .ant-tooltip {
    /* Adjust tooltip position so it follows the mouse cursor. */
    inset: auto auto auto ${(props) => props.$x ?? 0}px !important;
    transform: translateX(-50%) translateY(-180%) !important;

    & .ant-tooltip-inner {
      text-align: center;
    }
  }
`;

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const selectedTrackId = props.selectedTrack?.trackId;
  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const [thumbnailHoveredX, setThumbnailHoveredX] = useState<number | null>(null);
  const [thumbnailHoveredTime, setThumbnailHoveredTime] = useState<number | null>(null);
  const lastHoveredX = useRef<number>(0);

  // Organize ids by track and value for display.
  const lookupInfo = useMemo((): LookupInfo => {
    if (!props.dataset) {
      return getEmptyLookupInfo();
    }
    return getTrackLookups(props.dataset, props.ids, props.idToValue, props.valueToIds);
  }, [props.dataset, props.ids, props.idToValue, props.valueToIds]);
  const { trackIds, trackToIds, valueToTracksToIds } = lookupInfo;

  // By default, highlight all selected IDs in the selected track.
  const selectedTrackIds = trackToIds.get(selectedTrackId?.toString() ?? "") ?? [];
  let selectedIds = selectedTrackIds;
  let bgIds: number[] = [];

  // If there is a selected ID in the current frame, highlight only IDs that
  // match that ID's assigned value. Also trigger this when the user hovers over
  // a time in the thumbnail.
  const currentId = props.selectedTrack?.getIdAtTime(props.frame);
  const currentValue = currentId ? props.idToValue?.get(currentId) : undefined;
  const hoveredId = thumbnailHoveredTime ? props.selectedTrack?.getIdAtTime(thumbnailHoveredTime) : undefined;
  const hoveredValue = hoveredId ? props.idToValue?.get(hoveredId) : undefined;
  // Hovering takes precedence over current frame.
  const highlightedId = hoveredValue ? hoveredId : currentId;
  const highlightedValue = hoveredValue ?? currentValue;
  if (highlightedValue !== undefined && highlightedId && selectedIds.includes(highlightedId)) {
    // Filter so only IDs with matching values are highlighted, and the rest are
    // background.
    const currentValueIds = selectedIds.filter((id) => props.idToValue?.get(id) === highlightedValue);
    bgIds = selectedIds;
    selectedIds = currentValueIds;
  }

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
          <FlexRowAlignCenter style={{ marginBottom: "5px" }} $gap={10}>
            <TooltipContainer ref={tooltipContainerRef} $x={thumbnailHoveredX ?? lastHoveredX.current}>
              <AnnotationTrackThumbnail
                frame={props.frame}
                setFrame={props.setFrame}
                onHover={(x, time) => {
                  setThumbnailHoveredX(x);
                  setThumbnailHoveredTime(time);
                  if (x !== null) {
                    lastHoveredX.current = x;
                  }
                }}
                ids={selectedIds}
                bgIds={bgIds}
                track={props.selectedTrack}
                dataset={props.dataset}
                color={props.labelColor}
                mark={markedTime}
                highlightedIds={highlightRange}
              ></AnnotationTrackThumbnail>
              <Tooltip
                title={hoveredValue}
                placement="top"
                open={hoveredValue ? true : false}
                trigger={["hover", "focus"]}
                getPopupContainer={() => tooltipContainerRef.current ?? document.body}
              >
                {/* Anchor element for the tooltip. Position of the tooltip is determined using `TooltipContainer` */}
                <div style={{ position: "absolute", width: 0, height: 0, top: 5, left: 0 }}></div>
              </Tooltip>
            </TooltipContainer>

            <p style={{ fontSize: theme.font.size.label, marginTop: 0, ...NO_WRAP }}>
              {selectedTrackId ? <span>Track {selectedTrackId}</span> : `No track selected`}
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
