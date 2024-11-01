import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import React, { ReactElement, useRef, useState } from "react";
import styled from "styled-components";

import { Dataset, Track } from "../../colorizer";
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
  findTrackInputText: string;
  setFindTrackInputText: (text: string) => void;
  findTrack: (trackId: number, seekToFrame?: boolean) => void;
  setFrame: (frame: number) => Promise<void>;
  currentFrame: number;
  dataset: Dataset | null;
  featureKey: string;
  selectedTrack: Track | null;
  disabled: boolean;
};

export default function PlotTab(props: PlotTabProps): ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const pendingFrame = useRef<number>(props.currentFrame);

  const searchForTrack = (): void => {
    if (props.findTrackInputText === "") {
      return;
    }
    props.findTrack(parseInt(props.findTrackInputText, 10));
  };

  const setFrame = async (frame: number): Promise<void> => {
    pendingFrame.current = frame;
    setIsLoading(true);
    await props.setFrame(frame);
    // Continue to show loading spinner if other frames were requested
    // while this one was loading.
    if (pendingFrame.current === frame) {
      setIsLoading(false);
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
              value={props.findTrackInputText}
              size="small"
              placeholder="Track ID..."
              disabled={props.disabled}
              onChange={(event) => {
                props.setFindTrackInputText(event.target.value);
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
            frame={props.currentFrame}
            dataset={props.dataset}
            featureKey={props.featureKey}
            selectedTrack={props.selectedTrack}
          />
        </LoadingSpinner>
      </div>
    </>
  );
}
