import { PlusOutlined } from "@ant-design/icons";
import { Input } from "antd";
import React, { type ReactElement, useEffect, useMemo, useState } from "react";
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
  const tracks = useViewerStateStore((state) => state.tracks);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const addTracks = useViewerStateStore((state) => state.addTracks);
  const trackToColorMap = useViewerStateStore((state) => state.trackColors);

  const trackColors = useMemo(() => {
    return Array.from(tracks.keys())
      .map(trackToColorMap.get)
      .map((color) => "#" + (color?.getHexString() || "ff00ff"));
  }, [tracks, trackToColorMap]);

  const [findTrackInput, setFindTrackInput] = useState("");

  // Sync track searchbox with selected track
  useEffect(() => {
    const unsubscribe = useViewerStateStore.subscribe(
      (state) => [state.tracks],
      ([tracks]) => {
        const trackIds = Array.from(tracks.keys());
        const track = tracks.get(trackIds[trackIds.length - 1]);
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
      addTracks(track);
      // Check if track exists at the current frame; if not, jump to the first frame of the track.
      if (!track.times.includes(currentFrame)) {
        setFrame(track.times[0]);
      }
    }
  };

  return (
    <>
      <TrackTitleBar>
        <NoSpinnerContainer>
          <TrackSearch $gap={6}>
            <label htmlFor={TRACK_SEARCH_ID}>
              <h3>Add track</h3>
            </label>
            <Input
              id={TRACK_SEARCH_ID}
              type="number"
              value={findTrackInput}
              size="small"
              placeholder="Track ID"
              disabled={props.disabled}
              onChange={(event) => {
                setFindTrackInput(event.target.value);
              }}
              onPressEnter={searchForTrack}
            />
            <IconButton disabled={props.disabled} onClick={searchForTrack}>
              <PlusOutlined />
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
            tracks={tracks}
            trackColors={trackColors}
          />
        </LoadingSpinner>
      </div>
    </>
  );
}
