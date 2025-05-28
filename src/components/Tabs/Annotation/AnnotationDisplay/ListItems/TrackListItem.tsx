import React, { ReactElement, useContext } from "react";
import { Color } from "three";

import { Dataset } from "../../../../../colorizer";
import { FlexRowAlignCenter } from "../../../../../styles/utils";

import { AppThemeContext } from "../../../../AppStyle";
import DropdownItem from "../../../../Dropdowns/DropdownItem";
import AnnotationTrackThumbnail from "../../AnnotationTrackThumbnail";

type TrackListItemProps = {
  trackId: number;
  ids: number[];
  bgIds?: number[];
  dataset: Dataset;
  isSelectedTrack: boolean;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
  onFocus?: () => void;
};

export default function TrackListItem(props: TrackListItemProps): ReactElement {
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
      onFocus={props.onFocus}
    >
      <FlexRowAlignCenter $gap={5}>
        <AnnotationTrackThumbnail
          widthPx={75}
          heightPx={14}
          ids={ids}
          bgIds={props.bgIds}
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
