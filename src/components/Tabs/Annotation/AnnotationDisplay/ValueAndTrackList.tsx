import React, { ReactElement, useMemo } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import { Color } from "three";

import { Dataset, Track } from "@/colorizer";
import { LookupInfo } from "@/colorizer/utils/annotation_utils";
import { ScrollShadowContainer, useScrollShadow } from "@/hooks";

import PlaceholderListItem from "./ListItems/PlaceholderListItem";
import TrackListItem from "./ListItems/TrackListItem";
import ValueListItem from "./ListItems/ValueListItem";

type ValueAndTrackListProps = {
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

// Below we are using list virtualization to render a potentially large list of
// items (tracks and/or values). Items can either be a track (with a thumbnail
// and label), a value header, or a placeholder for when there are no tracks or
// values selected. Value headers separate groups of tracks that share the same
// value.

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
  selectedTrack: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
  onFocus: (index: number) => void;
  itemData: (TrackItemData | ValueItemData | PlaceholderItemData)[];
};

/**
 * Unpacks values and tracks from the provided map structure, and returns an
 * array of items that can be rendered in the list.
 * @param valueToTracksToIds Map from a value to another map from track ID to an
 * array of IDs.
 */
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

const listItemRenderer = ({
  index,
  data,
  style,
}: {
  index: number;
  data: ListItemData;
  style: React.CSSProperties;
}): ReactElement => {
  const item = data.itemData[index];
  // Render either a value header, a track item, or a placeholder item based on
  // the item's type.
  if (item.type === ListItemType.VALUE) {
    return <ValueListItem {...item} style={style} />;
  } else if (item.type === ListItemType.TRACK) {
    return (
      <div style={style} key={item.trackId}>
        <TrackListItem
          trackId={item.trackId}
          ids={item.ids}
          dataset={data.dataset!}
          isSelectedTrack={item.trackId === data.selectedTrack?.trackId}
          labelColor={data.labelColor}
          onClickTrack={data.onClickTrack}
          onFocus={() => data.onFocus(index)}
        />
      </div>
    );
  } else {
    return <PlaceholderListItem />;
  }
};

/**
 * Displays either a placeholder, a list of tracks, or a list of values + tracks
 * based on the provided props. Uses list virtualization for increased performance.
 */
export default function ValueAndTrackList(props: ValueAndTrackListProps): ReactElement {
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
  const listRef = React.useRef<FixedSizeList>(null);

  const itemData = useMemo(() => {
    const { trackIds, trackToIds, valueToTracksToIds } = props.lookupInfo;
    const hasValueInfo = valueToTracksToIds !== undefined && valueToTracksToIds.size > 0;

    if (props.lookupInfo.trackIds.length === 0 || props.dataset === null) {
      return [{ type: ListItemType.PLACEHOLDER } as const];
    } else if (!hasValueInfo) {
      return trackIds.map((trackId) => {
        const ids = trackToIds.get(trackId.toString())!;
        return { trackId, ids, type: ListItemType.TRACK } as const;
      });
    } else {
      // Display list of values
      return unpackValuesAndTracks(valueToTracksToIds);
    }
  }, [props.lookupInfo, props.dataset]);

  const listData: ListItemData = {
    ...props,
    onFocus: (index: number) => {
      if (listRef.current) {
        listRef.current.scrollToItem(index, "smart");
      }
    },
    itemData,
  };

  // Note: To use AutoSizer with scroll shadows, a default width and height must
  // be provided. Otherwise, the list won't be rendered on the initial render,
  // which causes the scroll ref to be left unset.

  // TODO: Align with Listbox pattern? https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
  return (
    <div style={{ marginLeft: "10px", height: "100%", position: "relative" }}>
      <AutoSizer defaultWidth={300} defaultHeight={480}>
        {({ height, width }) => (
          <FixedSizeList
            ref={listRef}
            outerRef={scrollRef}
            onScroll={onScrollHandler}
            itemCount={listData.itemData.length}
            itemData={listData}
            // TODO: Currently, all items are the same height. However, if this
            // changes, the component should be changed to a VariableSizeList
            // and the item sizes recorded. Note that this can cause some layout
            // issues if the list is dynamically updated.
            itemSize={28}
            width={width}
            height={height}
            // Determines the number of rows to render outside the visible area.
            // Should be >= 2 to ensure tab navigation works correctly.
            overscanCount={3}
          >
            {listItemRenderer}
          </FixedSizeList>
        )}
      </AutoSizer>
      <ScrollShadowContainer style={scrollShadowStyle} />
    </div>
  );
}
