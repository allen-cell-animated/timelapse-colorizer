import React, { ReactElement, useContext } from "react";

import { TagIconSVG } from "../../../../../assets";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../../../styles/utils";
import { AnnotationDisplayInnerListProps } from "./types";

import { AppThemeContext } from "../../../../AppStyle";
import TrackList from "./TrackList";
import ValueList from "./ValueList";

/**
 * Displays either a placeholder, a list of tracks, or a list of values based on
 * the provided props.
 */
export default function (props: AnnotationDisplayInnerListProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const { dataset, selectedTrack } = props;
  const { trackIds, trackToIds, valueToTracksToIds } = props.lookupInfo;
  const hasValueInfo = valueToTracksToIds !== undefined && valueToTracksToIds.size > 0;

  // Show a placeholder if no annotations are provided
  if (props.lookupInfo.trackIds.length === 0 || dataset === null) {
    return (
      <FlexRowAlignCenter style={{ width: "100% ", height: "100px" }}>
        <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", width: "100%", color: theme.color.text.disabled }}>
          <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
          <p>Labeled tracks will appear here.</p>
        </FlexColumnAlignCenter>
      </FlexRowAlignCenter>
    );
  }

  if (!hasValueInfo) {
    // Boolean values. All tracks are displayed in a single list.
    const tracksAndIds = trackIds.map((trackId) => {
      const ids = trackToIds.get(trackId.toString())!;
      return { trackId, ids };
    });
    return (
      <div>
        <TrackList
          tracksAndIds={tracksAndIds}
          dataset={dataset}
          selectedTrack={selectedTrack}
          labelColor={props.labelColor}
          onClickTrack={props.onClickTrack}
        />
      </div>
    );
  }

  return <ValueList {...{ ...props, dataset }}></ValueList>;
}
