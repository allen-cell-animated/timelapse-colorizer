import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import React, { type ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import IconButton from "src/components/Buttons/IconButton";
import LoadingSpinner from "src/components/LoadingSpinner";
import PlotWrapper from "src/components/Tabs/TrackPlot/PlotWrapper";
import { useViewerStateStore } from "src/state";
import { FlexRowAlignCenter, NoSpinnerContainer } from "src/styles/utils";

const TRACK_SEARCH_ID = "plot-tab-track-search-input";

const TrackTitleBar = styled(FlexRowAlignCenter)`
  justify-content: end;
  flex-wrap: wrap;
`;

const TrackSearch = styled(FlexRowAlignCenter)`
  & input {
    max-width: 80px;
  }

  & h3 {
    margin: 0;
  }
`;

type PlotTabProps = {
  disabled: boolean;
};

export default function PlotTab(props: PlotTabProps): ReactElement {
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const pendingFrame = useViewerStateStore((state) => state.pendingFrame);
  const selectedTrack = useViewerStateStore((state) => state.track);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const setTrack = useViewerStateStore((state) => state.setTrack);

  const [findTrackInput, setFindTrackInput] = useState("");

  // Sync track searchbox with selected track
  useEffect(() => {
    const unsubscribe = useViewerStateStore.subscribe(
      (state) => [state.track],
      ([track]) => {
        if (track) {
          setFindTrackInput(track.trackId.toString());
        } else {
          setFindTrackInput("");
        }
      }
    );
    return unsubscribe;
  }, []);

  const isLoading = currentFrame !== pendingFrame;

  const searchForTrack = (): void => {
    if (findTrackInput === "" || !dataset) {
      return;
    }
    const trackId = parseInt(findTrackInput, 10);
    const track = dataset.getTrack(trackId);
    // TODO: Show error text if track is not found?
    if (track) {
      setTrack(track);
      setFrame(track.times[0]);
    }
  };

  return (
    <>
      <TrackTitleBar>
        <NoSpinnerContainer>
          <TrackSearch $gap={6}>
            <label htmlFor={TRACK_SEARCH_ID}>
              <h3>Search</h3>
            </label>
            <Input
              id={TRACK_SEARCH_ID}
              type="number"
              value={findTrackInput}
              size="small"
              placeholder="Track ID..."
              disabled={props.disabled}
              onChange={(event) => {
                setFindTrackInput(event.target.value);
              }}
              onPressEnter={searchForTrack}
            />
            <IconButton disabled={props.disabled} onClick={searchForTrack}>
              <SearchOutlined />
            </IconButton>
          </TrackSearch>
        </NoSpinnerContainer>
      </TrackTitleBar>
      <div>
        <LoadingSpinner loading={isLoading}>
          <PlotWrapper
            setFrame={setFrame}
            frame={currentFrame}
            dataset={dataset}
            featureKey={featureKey}
            selectedTrack={selectedTrack}
          />
        </LoadingSpinner>
      </div>
    </>
  );
}
