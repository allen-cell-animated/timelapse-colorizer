import { Collapse } from "antd";
import React, { ReactElement, useMemo, useRef } from "react";
import styled from "styled-components";

import { Dataset } from "../../../colorizer";
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
  const trackToLength = useRef<Record<string, number>>({});

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

  const tracksSorted = useMemo(() => {
    return Object.keys(trackToIds)
      .map((trackId) => parseInt(trackId, 10))
      .sort();
  }, [trackToIds]);

  const getTrackLength = (trackId: number): number => {
    if (trackToLength.current[trackId] !== undefined) {
      return trackToLength.current[trackId];
    } else {
      const track = props.dataset?.buildTrack(trackId);
      trackToLength.current[trackId] = track?.ids.length ?? 0;
      return track?.ids.length ?? 0;
    }
  };

  // TODO: Sort track numbers

  return (
    <FlexColumn style={{ width: "100%" }}>
      <StyledCollapse size="small" ghost>
        {tracksSorted.map((trackId) => {
          const ids = trackToIds[trackId];
          const trackLength = getTrackLength(trackId);
          return (
            <Collapse.Panel header={`Track ${trackId} (${ids.length}/${trackLength})`} key={trackId}>
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
