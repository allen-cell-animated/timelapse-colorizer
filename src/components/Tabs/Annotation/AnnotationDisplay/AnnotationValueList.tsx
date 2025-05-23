import React, { ReactElement, useContext, useMemo, useState, useTransition } from "react";
import styled from "styled-components";
import { Color } from "three";

import { TagIconSVG } from "../../../../assets";
import { Dataset, Track } from "../../../../colorizer";
import { LookupInfo } from "../../../../colorizer/utils/annotation_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../../styles/utils";

import { AppThemeContext } from "../../../AppStyle";
import AnnotationTrackList from "./AnnotationTrackList";

type AnnotationValueListProps = {
  lookupInfo: LookupInfo;
  dataset: Dataset | null;
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};

const VerticalDivider = styled.div`
  height: 20px;
  width: 1px;
  background-color: var(--color-dividers);
`;

// TODO: This can be quite slow if there are a lot of values/tracks.
// Consider using list virtualization to improve performance.

/**
 * Displays a list of annotation values and their associated tracks.
 * Shows a placeholder if no annotations are provided.
 */
export default function AnnotationValueList(props: AnnotationValueListProps): ReactElement {
  const theme = useContext(AppThemeContext);
  // The list can be quite large, so use a transition to mark updates as
  // deferred.
  const [, startTransition] = useTransition();

  const { dataset, selectedTrack } = props;

  const [lookupInfo, setLookupInfo] = useState(props.lookupInfo);
  const { trackIds, trackToIds, valueToTracksToIds } = lookupInfo;

  useMemo(() => {
    if (props.lookupInfo !== lookupInfo) {
      startTransition(() => {
        setLookupInfo(props.lookupInfo);
      });
    }
  }, [props.lookupInfo, lookupInfo]);

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

  const hasValueInfo = valueToTracksToIds !== undefined && valueToTracksToIds.size > 0;
  if (!hasValueInfo) {
    // Boolean values. All tracks are displayed in a single list.
    const tracksAndIds = trackIds.map((trackId) => {
      const ids = trackToIds.get(trackId.toString())!;
      return { trackId, ids };
    });
    return (
      <AnnotationTrackList
        tracksAndIds={tracksAndIds}
        dataset={dataset}
        selectedTrack={selectedTrack}
        labelColor={props.labelColor}
        onClickTrack={props.onClickTrack}
      />
    );
  }

  return (
    <FlexColumn style={{ marginLeft: "10px" }}>
      {/* Render each value as its own section */}
      {Array.from(valueToTracksToIds.entries()).map(([value, trackIdToIds]) => {
        const trackIdsWithIds = Array.from(trackIdToIds.entries()).map(([trackId, ids]) => ({
          trackId,
          ids,
        }));
        return (
          <FlexColumn key={value}>
            <FlexRowAlignCenter $gap={5}>
              <p style={{ minWidth: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b>{value}</b>
              </p>
              <VerticalDivider />
              <p style={{ whiteSpace: "nowrap" }}>
                {trackIdsWithIds.length} track{trackIdsWithIds.length > 1 ? "s" : ""}
              </p>
            </FlexRowAlignCenter>
            <AnnotationTrackList tracksAndIds={trackIdsWithIds} {...props} dataset={props.dataset!} />
          </FlexColumn>
        );
      })}
    </FlexColumn>
  );
}
