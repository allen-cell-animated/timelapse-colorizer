import React, { ReactElement, useContext, useEffect, useMemo, useRef } from "react";
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
  setFrame: (frame: number) => void;
  onClickTrack: (trackId: number) => void;
  onClickObjectRow: (record: TableDataType) => void;
  onClickDeleteObject: (record: TableDataType) => void;
  selectedTrack: Track | null;
  selectedId?: number;
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

  const cachedTracks = useRef<Map<string, Track | undefined>>(new Map());
  const selectedTrackId = props.selectedTrack?.trackId.toString();

  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  useEffect(() => {
    cachedTracks.current.clear();
  }, [props.dataset]);

  // Building a track is an expensive operation (takes O(N) where N is the
  // size of the dataset), so cache the length of tracks.
  // TODO: This could be optimized by having the dataset perform this once
  // and save the results in a lookup table.
  const getTrack = (trackId: number): Track | undefined => {
    const cachedTrack = cachedTracks.current.get(trackId.toString());
    if (cachedTrack !== undefined) {
      return cachedTrack;
    } else {
      const track = props.dataset?.buildTrack(trackId);
      cachedTracks.current.set(trackId.toString(), track);
      return track;
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
          const track = getTrack(trackId);
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
                      ({ids.length}/{track?.times.length})
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
            ids={selectedTrackId ? trackToIds.get(selectedTrackId) ?? [] : []}
            height={412}
            selectedId={props.selectedId}
            hideTrackColumn={true}
          ></AnnotationDisplayTable>
        </div>
      </ListLayoutContainer>
    </FlexColumn>
  );
}
