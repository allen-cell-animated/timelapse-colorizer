import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";

import { useViewerStateStore } from "../../state";
import { FlexRowAlignCenter, NoSpinnerContainer } from "../../styles/utils";

import IconButton from "../IconButton";
import LoadingSpinner from "../LoadingSpinner";
import PlotWrapper from "../PlotWrapper";

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
            <h3>Search</h3>
            <Input
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
