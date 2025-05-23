import React, { ReactElement, useContext } from "react";
import { Color } from "three";

import { Dataset, Track } from "../../../../colorizer";
import { FlexRowAlignCenter } from "../../../../styles/utils";

import { AppThemeContext } from "../../../AppStyle";
import DropdownItem from "../../../Dropdowns/DropdownItem";
import AnnotationTrackThumbnail from "../AnnotationTrackThumbnail";

type TrackListItemProps = {
  trackId: number;
  ids: number[];
  dataset: Dataset;
  isSelectedTrack: boolean;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};

function TrackListItem(props: TrackListItemProps): ReactElement {
  const { trackId, ids, dataset, isSelectedTrack, onClickTrack, labelColor } = props;
  const theme = useContext(AppThemeContext);

  const track = dataset.getTrack(trackId);
  return (
    <DropdownItem
      key={trackId}
      onClick={() => {
        onClickTrack(trackId);
      }}
      selected={isSelectedTrack}
    >
      <FlexRowAlignCenter $gap={5}>
        <AnnotationTrackThumbnail
          widthPx={75}
          heightPx={14}
          ids={ids}
          track={track ?? null}
          dataset={dataset}
          color={labelColor}
        ></AnnotationTrackThumbnail>
        <p style={{ margin: 0 }}>
          {trackId}{" "}
          <span style={{ color: theme.color.text.hint }}>
            ({ids.length}/{track?.times.length ?? 0})
          </span>
        </p>
      </FlexRowAlignCenter>
    </DropdownItem>
  );
}

type TrackListProps = {
  tracksAndIds: { trackId: number; ids: number[] }[];
  dataset: Dataset;
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};

/**
 * Displays an array of annotated tracks as an unsorted list of
 * clickable/interactive thumbnails.
 */
export default function AnnotationTrackList(props: TrackListProps): ReactElement {
  return (
    <ul style={{ margin: 0, listStyle: "none", paddingLeft: "5px" }}>
      {props.tracksAndIds.map(({ trackId, ids }) => {
        const isSelectedTrack = props.selectedTrack?.trackId === trackId;
        return (
          <li key={trackId}>
            <TrackListItem
              trackId={trackId}
              ids={ids}
              dataset={props.dataset!}
              isSelectedTrack={isSelectedTrack}
              labelColor={props.labelColor}
              onClickTrack={props.onClickTrack}
            />
          </li>
        );
      })}
    </ul>
  );
}
