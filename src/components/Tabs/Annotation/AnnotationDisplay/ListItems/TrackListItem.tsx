import React, { type ReactElement, useContext } from "react";
import type { Color } from "three";

import type { Dataset } from "src/colorizer";
import DropdownItem from "src/components/Dropdowns/DropdownItem";
import AnnotationTrackThumbnail from "src/components/Tabs/Annotation/AnnotationDisplay/AnnotationTrackThumbnail";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRowAlignCenter } from "src/styles/utils";
import { formatQuantityString } from "src/utils/formatting";

type TrackListItemProps = {
  trackId: number;
  ids: number[];
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
          track={track ?? null}
          dataset={dataset}
          color={labelColor}
        ></AnnotationTrackThumbnail>
        <p style={{ margin: 0 }}>{trackId}</p>
        <p style={{ margin: 0, color: theme.color.text.hint, fontSize: theme.font.size.labelSmall }}>
          | {formatQuantityString(ids.length, "object", "objects")}
        </p>
      </FlexRowAlignCenter>
    </DropdownItem>
  );
}
