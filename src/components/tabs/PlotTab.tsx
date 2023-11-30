import React, { ReactElement } from "react";

import { Dataset, Track } from "../../colorizer";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import IconButton from "../IconButton";
import PlotWrapper from "../PlotWrapper";
import styled from "styled-components";
import { FlexRowAlignCenter, NoSpinnerContainer } from "../../styles/utils";

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
  currentFrame: number;
  dataset: Dataset | null;
  featureName: string;
  selectedTrack: Track | null;
  disabled: boolean;
};

export default function PlotTab(props: PlotTabProps): ReactElement {
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
            />
            <IconButton
              disabled={props.disabled}
              onClick={() => {
                props.findTrack(parseInt(props.findTrackInputText, 10));
              }}
            >
              <SearchOutlined />
            </IconButton>
          </TrackSearch>
        </NoSpinnerContainer>
      </TrackTitleBar>
      <PlotWrapper
        frame={props.currentFrame}
        dataset={props.dataset}
        featureName={props.featureName}
        selectedTrack={props.selectedTrack}
      />
    </>
  );
}
