import { Collapse } from "antd";
import React, { ReactElement, useContext, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";

import { TagIconSVG } from "../../../assets";
import { Dataset } from "../../../colorizer";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";

type AnnotationDisplayListProps = {
  dataset: Dataset | null;
  ids: number[];
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
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

  const trackToLength = useRef<Record<string, number>>({});

  useEffect(() => {
    trackToLength.current = {};
  }, [props.dataset]);

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
          return (
            <Collapse.Panel
              header={
                <p>
                  Track {trackId}{" "}
                  <span style={{ color: theme.color.text.hint }}>
                    ({ids.length}/{trackLength})
                  </span>
                </p>
              }
              key={trackId}
            >
              <AnnotationDisplayTable
                ids={ids}
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
    <FlexColumn style={{ width: "100%" }}>
      <p style={{ fontSize: theme.font.size.label }}>{trackIdsSorted.length} track(s) selected</p>
      {listContents}
    </FlexColumn>
  );
}
