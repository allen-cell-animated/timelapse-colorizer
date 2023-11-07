import React, { ReactElement } from "react";

import { Dataset, Track } from "../../colorizer";
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import IconButton from "../IconButton";
import PlotWrapper from "../PlotWrapper";
import styled from "styled-components";
import { NoSpinnerContainer } from "../../styles/utils";

const TrackTitleBar = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: end;
  align-items: center;
  flex-wrap: wrap;
`;

const TrackSearch = styled(NoSpinnerContainer)`
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;

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
  disabled?: boolean;
  findTrack: (trackId: number, seekToFrame?: boolean) => void;
  currentFrame: number;
  dataset: Dataset | null;
  featureName: string;
  selectedTrack: Track | null;
};

const defaultProps: Partial<PlotTabProps> = {
  disabled: false,
};

export default function PlotTab(inputProps: PlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<PlotTabProps>;
  return (
    <>
      <TrackTitleBar>
        <TrackSearch>
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
