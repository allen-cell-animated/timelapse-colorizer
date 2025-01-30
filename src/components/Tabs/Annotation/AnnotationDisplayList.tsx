import React, { ReactElement, useContext, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";

import { TagIconSVG } from "../../../assets";
import { Dataset, Track } from "../../../colorizer";
import { ScrollShadowContainer, useScrollShadow } from "../../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../styles/utils";

import { AppThemeContext } from "../../AppStyle";
import DropdownItem from "../../Dropdowns/DropdownItem";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplayTable";

type AnnotationDisplayListProps = {
  dataset: Dataset | null;
  ids: number[];
  onClickTrack: (trackId: number) => void;
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  selectedTrack: Track | null;
  selectedId?: number;
};

const ListLayoutContainer = styled.div`
  display: flex;
  flex-direction: row;
  /* flex-wrap: nowrap; */
  width: 100%;
  height: 100%;
  gap: 10px;

  & > div {
    /* width: 50%; */
    height: 100%;
    flex-grow: 2;
  }
`;

export default function AnnotationDisplayList(props: AnnotationDisplayListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const trackToLength = useRef<Record<string, number>>({});
  const selectedTrackId = props.selectedTrack?.trackId.toString();

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  useEffect(() => {
    trackToLength.current = {};
  }, [props.dataset]);

  // Building the track is an expensive operation (takes O(N) where N is the
  // size of the dataset for each track), so cache the length of all tracks in
  // the dataset.
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

  // Track IDs, in order of appearance in the ID list. The newest track ID will
  // be added to the bottom of the list.
  const trackIds = useMemo(() => {
    return Array.from(trackToIds.keys())
      .map((trackId) => parseInt(trackId, 10))
      .reverse();
  }, [trackToIds]);

  let listContents;
  if (props.ids.length === 0) {
    // Show placeholder if there are no elements
    listContents = (
      // Padding here keeps the icon aligned with the table view
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
          const ids = trackToIds.get(trackId.toString()) ?? [];
          if (!props.dataset || ids.length === 0) {
            return null;
          }
          const trackLength = getTrackLength(trackId);
          const isSelectedTrack = props.selectedTrack?.trackId === trackId;
          return (
            <li>
              <DropdownItem
                key={""}
                onClick={() => {
                  props.onClickTrack(trackId);
                }}
                selected={isSelectedTrack}
              >
                <p style={{ margin: 0 }}>
                  {trackId}{" "}
                  <span style={{ color: theme.color.text.hint }}>
                    ({ids.length}/{trackLength})
                  </span>
                </p>
              </DropdownItem>
            </li>
          );
        })}
      </ul>
    );
  }

  const selectedTrackLength = getTrackLength(selectedTrackId ? parseInt(selectedTrackId, 10) : 0);
  const selectedTrackIds = trackToIds.get(selectedTrackId ?? "") ?? [];

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
      <ListLayoutContainer>
        <FlexColumn style={{ height: "100%", width: "40%" }}>
          <div style={{ position: "relative" }}>
            <div style={{ height: "490px", overflowY: "auto" }} ref={scrollRef} onScroll={onScrollHandler}>
              {listContents}
            </div>
            <ScrollShadowContainer style={scrollShadowStyle} />
          </div>
        </FlexColumn>
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
          <p style={{ fontSize: theme.font.size.label, marginTop: 0, marginBottom: "5px" }}>
            {selectedTrackId ? (
              <span>
                Track {selectedTrackId}{" "}
                <span style={{ color: theme.color.text.hint }}>
                  ({selectedTrackIds.length}/{selectedTrackLength})
                </span>
              </span>
            ) : (
              `No track selected`
            )}
          </p>
          <AnnotationDisplayTable
            onClickObjectRow={props.onClickObjectRow}
            onClickDeleteObject={props.onClickDeleteObject}
            dataset={props.dataset}
            ids={selectedTrackId ? trackToIds.get(selectedTrackId) ?? [] : []}
            height={412}
          ></AnnotationDisplayTable>
        </div>
      </ListLayoutContainer>
    </FlexColumn>
  );
}
