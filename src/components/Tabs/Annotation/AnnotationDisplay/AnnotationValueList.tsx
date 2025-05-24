import React, { ReactElement, useContext, useMemo, useState, useTransition } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList as List } from "react-window";
import styled from "styled-components";
import { Color } from "three";

import { TagIconSVG } from "../../../../assets";
import { Dataset, Track } from "../../../../colorizer";
import { LookupInfo } from "../../../../colorizer/utils/annotation_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../../styles/utils";

import { AppThemeContext } from "../../../AppStyle";
import AnnotationTrackList, { getTrackListHeightPx } from "./AnnotationTrackList";

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

  const values = Array.from(valueToTracksToIds.keys());
  const valueHeaderHeight = theme.font.size.content + 12;

  // Row height is the height of the header + the height of the track list
  const rowHeightsPx = values.map((value) => {
    const trackIdsToIds = valueToTracksToIds.get(value)!;
    const trackListHeight = getTrackListHeightPx(trackIdsToIds.size);
    return valueHeaderHeight + trackListHeight;
  });

  const ValueRow = ({ index, style }: { index: number; style: React.CSSProperties }): ReactElement => {
    const value = values[index]!;
    const trackIdsToIds = valueToTracksToIds.get(value)!;
    const trackAndIds = Array.from(trackIdsToIds.entries()).map(([trackId, ids]) => ({
      trackId,
      ids,
    }));

    return (
      <FlexColumn key={value} style={style}>
        <FlexRowAlignCenter $gap={5}>
          <p style={{ minWidth: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{value}</b>
          </p>
          <VerticalDivider />
          <p style={{ whiteSpace: "nowrap" }}>
            {trackAndIds.length} track{trackAndIds.length > 1 ? "s" : ""}
          </p>
        </FlexRowAlignCenter>
        <AnnotationTrackList tracksAndIds={trackAndIds} {...props} dataset={props.dataset!} />
      </FlexColumn>
    );
  };

  return (
    <div style={{ marginLeft: "10px", height: "100%" }}>
      {/* Render each value as its own section */}
      <AutoSizer>
        {({ height, width }) => (
          <List
            itemCount={values.length}
            itemSize={(index: number) => rowHeightsPx[index]}
            width={width}
            height={height}
          >
            {ValueRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
