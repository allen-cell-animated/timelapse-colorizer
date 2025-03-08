import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";
import { useShallow } from "zustand/shallow";

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
  const store = useViewerStateStore(
    useShallow((state) => ({
      currentFrame: state.currentFrame,
      pendingFrame: state.pendingFrame,
      dataset: state.dataset,
      featureKey: state.featureKey,
      selectedTrack: state.track,
      setFrame: state.setFrame,
      setTrack: state.setTrack,
    }))
  );

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

  const [findTrackInput, setFindTrackInput] = useState("");
  const isLoading = store.currentFrame !== store.pendingFrame;

  const searchForTrack = (): void => {
    if (findTrackInput === "" || !store.dataset) {
      return;
    }
    const trackId = parseInt(findTrackInput, 10);
    const track = store.dataset.getTrack(trackId);
    if (track) {
      store.setTrack(track);
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
            setFrame={store.setFrame}
            frame={store.currentFrame}
            dataset={store.dataset}
            featureKey={store.featureKey}
            selectedTrack={store.selectedTrack}
          />
        </LoadingSpinner>
      </div>
    </>
  );
}
