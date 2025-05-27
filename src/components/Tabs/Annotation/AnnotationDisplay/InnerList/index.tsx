import React, { ReactElement } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../../../colorizer";
import { LookupInfo } from "../../../../../colorizer/utils/annotation_utils";
import { ScrollShadowContainer, useScrollShadow } from "../../../../../colorizer/utils/react_utils";
import { FlexRowAlignCenter } from "../../../../../styles/utils";

import PlaceholderListItem from "./PlaceholderListItem";
import TrackListItem from "./TrackListItem";

type AnnotationDisplayInnerListProps = {
  lookupInfo: LookupInfo;
  dataset: Dataset | null;
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
};

const enum ListItemType {
  TRACK = "TRACK",
  VALUE = "VALUE",
  PLACEHOLDER = "PLACEHOLDER",
}

type TrackItemData = {
  type: ListItemType.TRACK;
  trackId: number;
  ids: number[];
};

type ValueItemData = {
  type: ListItemType.VALUE;
  value: string;
  numTracks: number;
};

type PlaceholderItemData = {
  type: ListItemType.PLACEHOLDER;
};

type ListItemData = {
  dataset: Dataset | null;
  selectedTrack?: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
  onFocus: (index: number) => void;
  itemData: (TrackItemData | ValueItemData | PlaceholderItemData)[];
};
type ListItemRenderer = (props: { index: number; data: ListItemData; style: React.CSSProperties }) => ReactElement;

const VerticalDivider = styled.div`
  height: 20px;
  width: 1px;
  background-color: var(--color-dividers);
`;

const trackListRenderer: ListItemRenderer = ({ index, data, style }) => {
  const trackAndIds = data.itemData[index] as TrackItemData;
  return (
    <div style={style} role="row" aria-rowindex={index + 1} key={trackAndIds.trackId}>
      <TrackListItem
        trackId={trackAndIds.trackId}
        ids={trackAndIds.ids}
        dataset={data.dataset!}
        isSelectedTrack={trackAndIds.trackId === data.selectedTrack?.trackId}
        labelColor={data.labelColor}
        onClickTrack={data.onClickTrack}
        onFocus={() => data.onFocus(index)}
      />
    </div>
  );
};

const unpackValuesAndTracks = (
  valueToTracksToIds: Map<string, Map<number, number[]>>
): (TrackItemData | ValueItemData)[] => {
  const items: (TrackItemData | ValueItemData)[] = [];
  valueToTracksToIds.forEach((trackIdsToIds, value) => {
    const numTracks = trackIdsToIds.size;
    items.push({ type: ListItemType.VALUE, value, numTracks });
    trackIdsToIds.forEach((ids, trackId) => {
      items.push({ type: ListItemType.TRACK, trackId, ids });
    });
  });
  return items;
};

const valueAndTrackListRenderer: ListItemRenderer = ({ index, data, style }) => {
  const item = data.itemData[index];
  if (item.type === ListItemType.VALUE) {
    return (
      <FlexRowAlignCenter $gap={5} style={style}>
        <p style={{ minWidth: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <b>{item.value}</b>
        </p>
        <VerticalDivider />
        <p style={{ whiteSpace: "nowrap" }}>
          {item.numTracks} track{item.numTracks > 1 ? "s" : ""}
        </p>
      </FlexRowAlignCenter>
    );
  } else if (item.type === ListItemType.TRACK) {
    return trackListRenderer({ index, data, style });
  } else {
    // Placeholder item
    return <PlaceholderListItem />;
  }
};

/**
 * Displays either a placeholder, a list of tracks, or a list of values + tracks
 * based on the provided props. Uses list virtualization for performance.
 */
export default function (props: AnnotationDisplayInnerListProps): ReactElement {
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
  const listRef = React.useRef<List>(null);

  const { dataset } = props;
  const { trackIds, trackToIds, valueToTracksToIds } = props.lookupInfo;
  const hasValueInfo = valueToTracksToIds !== undefined && valueToTracksToIds.size > 0;

  const listData: ListItemData = {
    ...props,
    onFocus: (index: number) => {
      if (listRef.current) {
        listRef.current.scrollToItem(index, "smart");
      }
    },
    itemData: [],
  };

  // Show a placeholder if no annotations are provided
  if (props.lookupInfo.trackIds.length === 0 || dataset === null) {
    listData.itemData = [{ type: ListItemType.PLACEHOLDER }];
  } else if (!hasValueInfo) {
    const tracksAndIds = trackIds.map((trackId) => {
      const ids = trackToIds.get(trackId.toString())!;
      return { trackId, ids, type: ListItemType.TRACK } as const;
    });
    // All items have a fixed height
    listData.itemData = tracksAndIds;
  } else {
    // Display list of values
    const items = unpackValuesAndTracks(valueToTracksToIds);
    listData.itemData = items;
  }

  return (
    <div style={{ marginLeft: "10px", height: "100%", position: "relative" }}>
      {/* Render each value as its own section */}
      <AutoSizer defaultWidth={300} defaultHeight={480}>
        {({ height, width }) => (
          <List
            ref={listRef}
            outerRef={scrollRef}
            onScroll={onScrollHandler}
            itemCount={listData.itemData.length}
            itemData={listData}
            itemSize={28}
            width={width}
            height={height}
            // outerElementType={outerElementType}
            overscanCount={3}
          >
            {valueAndTrackListRenderer}
          </List>
        )}
      </AutoSizer>
      <ScrollShadowContainer style={scrollShadowStyle} />
    </div>
  );
}
