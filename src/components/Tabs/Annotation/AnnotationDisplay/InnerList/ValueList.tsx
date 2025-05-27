import React, { ReactElement, useContext } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList as List } from "react-window";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../../../colorizer";
import { LookupInfo } from "../../../../../colorizer/utils/annotation_utils";
import { ScrollShadowContainer, useScrollShadow } from "../../../../../colorizer/utils/react_utils";
import { FlexColumn, FlexRowAlignCenter } from "../../../../../styles/utils";

import { AppThemeContext } from "../../../../AppStyle";
import TrackList, { getTrackListHeightPx } from "./TrackList";

type AnnotationValueListProps = {
  lookupInfo: LookupInfo;
  dataset: Dataset;
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};

const VerticalDivider = styled.div`
  height: 20px;
  width: 1px;
  background-color: var(--color-dividers);
`;

/**
 * Displays a list of annotation values and their associated tracks.
 * Shows a placeholder if no annotations are provided.
 */
export default function ValueList(props: AnnotationValueListProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();

  const valueToTracksToIds = props.lookupInfo.valueToTracksToIds!;

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
        <TrackList tracksAndIds={trackAndIds} {...props} dataset={props.dataset!} />
      </FlexColumn>
    );
  };

  // NOTE: AutoSizer does not render the inner children until after the first
  // render unless a default width + height is set. Without the default
  // dimensions, `useScrollShadow` will not behave correctly because the div ref
  // will be `null` on first render.

  return (
    <div style={{ marginLeft: "10px", height: "100%", position: "relative" }}>
      {/* Render each value as its own section */}
      <AutoSizer defaultWidth={300} defaultHeight={480}>
        {({ height, width }) => (
          <List
            outerRef={scrollRef}
            onScroll={onScrollHandler}
            itemCount={values.length}
            itemSize={(index: number) => rowHeightsPx[index]}
            width={width}
            height={height}
            // outerElementType={outerElementType}
            overscanCount={3}
          >
            {ValueRow}
          </List>
        )}
      </AutoSizer>
      <ScrollShadowContainer style={scrollShadowStyle} />
    </div>
  );
}
