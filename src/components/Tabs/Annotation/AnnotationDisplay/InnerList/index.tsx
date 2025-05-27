import React, { ReactElement, useContext } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList as List } from "react-window";
import { Color } from "three";

import { TagIconSVG } from "../../../../../assets";
import { Dataset, Track } from "../../../../../colorizer";
import { ScrollShadowContainer, useScrollShadow } from "../../../../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../../../styles/utils";
import { AnnotationDisplayInnerListProps } from "./types";

import { AppThemeContext } from "../../../../AppStyle";
import { TRACK_LIST_ITEM_HEIGHT_PX, TrackListItem } from "./TrackList";

type ListItemData = {
  dataset: Dataset | null;
  selectedTrack?: Track | null;
  labelColor: Color;
  onClickTrack: (trackId: number) => void;
  onFocus: (index: number) => void;
  trackAndIds?: { trackId: number; ids: number[] }[];
};
type ListItemRenderer = (props: { index: number; data: ListItemData; style: React.CSSProperties }) => ReactElement;

const trackListRenderer: ListItemRenderer = ({ index, data, style }) => {
  const trackAndIds = data.trackAndIds![index];
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

// const valueAndTrackListRenderer: ListItemRenderer = ({ index, data, style }) => {

// };

/**
 * Displays either a placeholder, a list of tracks, or a list of values based on
 * the provided props.
 */
export default function (props: AnnotationDisplayInnerListProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
  const listRef = React.useRef<List>(null);

  const { dataset } = props;
  const { trackIds, trackToIds, valueToTracksToIds } = props.lookupInfo;
  const hasValueInfo = valueToTracksToIds !== undefined && valueToTracksToIds.size > 0;

  let listItemHeightsPx: number[] = [];
  let listRenderer: ListItemRenderer = () => <></>;
  let listData: ListItemData = {
    ...props,
    onFocus: (index: number) => {
      if (listRef.current) {
        listRef.current.scrollToItem(index, "smart");
      }
    },
  };

  // Show a placeholder if no annotations are provided
  if (props.lookupInfo.trackIds.length === 0 || dataset === null) {
    listItemHeightsPx = [TRACK_LIST_ITEM_HEIGHT_PX];
    listRenderer = () => (
      <FlexRowAlignCenter style={{ width: "100% ", height: "100px" }}>
        <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", width: "100%", color: theme.color.text.disabled }}>
          <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
          <p>Labeled tracks will appear here.</p>
        </FlexColumnAlignCenter>
      </FlexRowAlignCenter>
    );
  } else if (!hasValueInfo) {
    const tracksAndIds = trackIds.map((trackId) => {
      const ids = trackToIds.get(trackId.toString())!;
      return { trackId, ids };
    });
    // All items have a fixed height
    listData.trackAndIds = tracksAndIds;
    listItemHeightsPx = tracksAndIds.map(() => TRACK_LIST_ITEM_HEIGHT_PX);
    listRenderer = trackListRenderer;
  } else {
    // Display list of values
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
            itemCount={listItemHeightsPx.length}
            itemData={listData}
            itemSize={(index: number) => listItemHeightsPx[index]}
            width={width}
            height={height}
            // outerElementType={outerElementType}
            overscanCount={3}
          >
            {listRenderer}
          </List>
        )}
      </AutoSizer>
      <ScrollShadowContainer style={scrollShadowStyle} />
    </div>
  );
}
