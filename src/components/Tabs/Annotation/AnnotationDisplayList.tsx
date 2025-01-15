import { Collapse } from "antd";
import React, { ReactElement, useMemo } from "react";
import styled from "styled-components";

import { Dataset, Track } from "../../../colorizer";
import { FlexColumn } from "../../../styles/utils";

import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";

type AnnotationDisplayListProps = {
  dataset: Dataset | null;
  ids: number[];
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
};

const StyledCollapse = styled(Collapse)`
  &&&& .ant-collapse-header {
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
  // Organize ids by track
  const trackToIds: Record<number, number[]> = useMemo(() => {
    if (!props.dataset) {
      return {};
    }
    const trackToIdsMap: Record<string, number[]> = {};
    for (const id of props.ids) {
      const track = props.dataset.getTrackId(id);
      if (track in trackToIdsMap) {
        trackToIdsMap[track].push(id);
      } else {
        trackToIdsMap[track] = [id];
      }
    }
    return trackToIdsMap;
  }, [props.dataset, props.ids]);

  const tracks: Record<string, Track> = useMemo(() => {
    if (!props.dataset) {
      return {};
    }
    const map: Record<string, Track> = {};
    for (const trackId of Object.keys(trackToIds)) {
      map[trackId] = props.dataset.buildTrack(Number.parseInt(trackId, 10));
    }
    return map;
  }, [trackToIds]);

  return (
    <FlexColumn style={{ width: "100%" }}>
      <StyledCollapse size="small" ghost>
        {Object.entries(trackToIds).map(([trackId, ids]) => {
          const totalIds = tracks[trackId].ids.length;
          return (
            <Collapse.Panel header={`Track ${trackId} (${ids.length}/${totalIds})`} key={trackId}>
              <AnnotationDisplayTable
                ids={ids}
                dataset={props.dataset}
                onClickObjectRow={props.onClickObjectRow}
                onClickDeleteObject={props.onClickDeleteObject}
                height={200}
              />
            </Collapse.Panel>
          );
        })}
      </StyledCollapse>
    </FlexColumn>
  );
}
