import { Checkbox, Collapse } from "antd";
import React, { ReactElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { TagIconSVG } from "../../../assets";
import { Dataset, Track } from "../../../colorizer";
import { ScrollShadowContainer, useScrollShadow } from "../../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";

type AnnotationDisplayListProps = {
  dataset: Dataset | null;
  ids: number[];
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  selectedTrack: Track | null;
  selectedId?: number;
};

const StyledCollapse = styled(Collapse)`
  &&&& .ant-collapse-header {
    align-items: center;
    padding-top: 4px;
    padding-bottom: 4px;

    &:hover {
      color: var(--color-collapse-hover);
    }

    &:focus-visible {
      transition: outline 0s;
      outline: 4px solid var(--color-focus-shadow);
      outline-offset: -4px;
    }
  }

  &&&& .ant-collapse-content-box {
    padding: 1px 30px 15px 30px;
  }
`;

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  const [scrollToTrackRow, setScrollToTrackRow] = useState(true);
  const trackToLength = useRef<Record<string, number>>({});
  const selectedTrackRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackToLength.current = {};
  }, [props.dataset]);

  useEffect(() => {
    if (selectedTrackRowRef.current && scrollToTrackRow) {
      selectedTrackRowRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [props.selectedTrack, scrollToTrackRow]);

  // Building the track is an expensive operation (takes O(N) for each track)
  // so cache the length of all tracks in the dataset.
  const getTrackLength = (trackId: number): number => {
    if (trackToLength.current[trackId] !== undefined) {
      return trackToLength.current[trackId];
    } else {
      const track = props.dataset?.buildTrack(trackId);
      trackToLength.current[trackId] = track?.ids.length ?? 0;
      return track?.ids.length ?? 0;
    }
  };

  // Organize ids by track
  const trackToIds: Record<string, number[]> = useMemo(() => {
    if (!props.dataset) {
      return {};
    }
    const map: Record<string, number[]> = {};
    for (const id of props.ids) {
      const trackId: string = props.dataset.getTrackId(id).toString();
      if (trackId in map) {
        map[trackId].push(id);
      } else {
        map[trackId] = [id];
      }
    }
    return map;
  }, [props.dataset, props.ids]);

  const trackIdsSorted = useMemo(() => {
    return Object.keys(trackToIds)
      .map((trackId) => parseInt(trackId, 10))
      .sort((a, b) => a - b);
  }, [trackToIds]);

  let listContents;
  if (props.ids.length === 0) {
    // Show placeholder if there are no elements
    listContents = (
      // Padding here keeps the icon aligned with the table view
      <FlexRowAlignCenter style={{ width: "100% ", height: "100px", paddingRight: "24px" }}>
        <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", width: "100%", color: theme.color.text.disabled }}>
          <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
          <p>No annotated IDs</p>
        </FlexColumnAlignCenter>
      </FlexRowAlignCenter>
    );
  } else {
    listContents = (
      <StyledCollapse size="small" ghost>
        {trackIdsSorted.map((trackId) => {
          const ids = trackToIds[trackId.toString()];
          const trackLength = getTrackLength(trackId);
          const isSelectedTrack = props.selectedTrack?.trackId === trackId;
          return (
            <Collapse.Panel
              header={
                <p>
                  <span style={{ fontWeight: isSelectedTrack ? "600" : "400" }}>Track {trackId} </span>
                  <span style={{ color: theme.color.text.hint }}>
                    ({ids.length}/{trackLength})
                  </span>
                </p>
              }
              ref={isSelectedTrack ? selectedTrackRowRef : undefined}
              key={trackId}
            >
              <AnnotationDisplayTable
                ids={ids}
                selectedId={props.selectedId}
                dataset={props.dataset}
                onClickObjectRow={props.onClickObjectRow}
                onClickDeleteObject={props.onClickDeleteObject}
                height={200}
                hideTrackColumn={true}
              />
            </Collapse.Panel>
          );
        })}
      </StyledCollapse>
    );
  }

  return (
    <FlexColumn style={{ width: "100%", height: "100%" }}>
      <FlexRowAlignCenter style={{ justifyContent: "space-between" }}>
        <p style={{ fontSize: theme.font.size.label, marginTop: 0, marginBottom: "5px" }}>
          {trackIdsSorted.length} track(s) selected
        </p>
        <Checkbox
          checked={scrollToTrackRow}
          onChange={(e) => {
            setScrollToTrackRow(e.target.checked);
          }}
        >
          Auto-scroll to track
        </Checkbox>
      </FlexRowAlignCenter>
      <div style={{ position: "relative" }}>
        <div
          style={{ maxHeight: "400px", height: "100%", overflowY: "scroll" }}
          ref={scrollRef}
          onScroll={onScrollHandler}
        >
          {listContents}
        </div>
        <ScrollShadowContainer style={scrollShadowStyle} />
      </div>
    </FlexColumn>
  );
}
