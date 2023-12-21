import { Checkbox, Divider, Slider } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { DrawMode } from "../../colorizer/ColorizeCanvas";
import { FlexColumn, SettingsContainer } from "../../styles/utils";
import { DrawSettings } from "../CanvasWrapper";
import DrawModeDropdown from "../DrawModeDropdown";
import LabeledDropdown from "../LabeledDropdown";

const NO_BACKDROP = {
  key: "",
  label: "(None)",
};

type SettingsTabProps = {
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  showScaleBar: boolean;
  showTimestamp: boolean;
  dataset: Dataset | null;
  backdropBrightness: number;
  backdropSaturation: number;
  backdropKey: string | null;
  objectOpacity: number;
  setOutOfRangeDrawSettings: (drawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (drawSettings: DrawSettings) => void;
  setShowScaleBar: (show: boolean) => void;
  setShowTimestamp: (show: boolean) => void;
  setBackdropBrightness: (percent: number) => void;
  setBackdropSaturation: (percent: number) => void;
  setBackdropKey: (name: string | null) => void;
  setObjectOpacity: (opacity: number) => void;
};

const SectionHeaderText = styled.h2`
  margin: 10px 0 0 0;
  padding: 0;
  grid-column: section;
`;

export default function SettingsTab(props: SettingsTabProps): ReactElement {
  const backdropOptions = props.dataset
    ? Array.from(props.dataset.getBackdropData().entries()).map(([key, data]) => {
        return { key, label: data.name };
      })
    : [];
  backdropOptions.unshift(NO_BACKDROP);

  return (
    <FlexColumn $gap={5}>
      <SettingsContainer>
        <SectionHeaderText>Backdrop</SectionHeaderText>
        <LabeledDropdown
          // TODO: Add a None option? Or an option to clear?
          label={"Backdrop images"}
          selected={props.backdropKey || NO_BACKDROP.key}
          items={backdropOptions}
          onChange={props.setBackdropKey}
          disabled={backdropOptions.length === 1}
        />
        <label>
          <span>
            <h3>Brightness</h3>
          </span>
          <Slider
            // TODO: Add a mark at the 100% position
            style={{ maxWidth: "200px", width: "100%" }}
            min={50}
            max={150}
            step={10}
            value={props.backdropBrightness}
            onChange={props.setBackdropBrightness}
            tooltip={{ formatter: (value) => `${value}%` }}
          />
        </label>
        <label>
          <span>
            <h3>Saturation</h3>
          </span>
          <Slider
            style={{ maxWidth: "200px", width: "100%" }}
            min={0}
            max={100}
            step={10}
            value={props.backdropSaturation}
            onChange={props.setBackdropSaturation}
            tooltip={{ formatter: (value) => `${value}%` }}
          />
        </label>
        <Divider />
        <SectionHeaderText>Objects</SectionHeaderText>
        <DrawModeDropdown
          label="Filtered out values"
          selected={props.outOfRangeDrawSettings.mode}
          color={props.outOfRangeDrawSettings.color}
          onChange={(mode: DrawMode, color: Color) => {
            props.setOutOfRangeDrawSettings({ mode, color });
          }}
        />
        <DrawModeDropdown
          label="Outliers"
          selected={props.outlierDrawSettings.mode}
          color={props.outlierDrawSettings.color}
          onChange={(mode: DrawMode, color: Color) => {
            props.setOutlierDrawSettings({ mode, color });
          }}
        />{" "}
        <label>
          <span>
            <h3>Opacity</h3>
          </span>
          <Slider
            style={{ maxWidth: "200px", width: "100%" }}
            min={0}
            max={100}
            value={props.objectOpacity}
            onChange={props.setObjectOpacity}
          />
        </label>
        <label>
          <span></span>
          <Checkbox
            type="checkbox"
            checked={props.showScaleBar}
            onChange={() => {
              props.setShowScaleBar(!props.showScaleBar);
            }}
          >
            Show scale bar
          </Checkbox>
        </label>
        <label>
          <span></span>
          <Checkbox
            type="checkbox"
            checked={props.showTimestamp}
            onChange={() => {
              props.setShowTimestamp(!props.showTimestamp);
            }}
          >
            Show timestamp
          </Checkbox>
        </label>
      </SettingsContainer>
    </FlexColumn>
  );
}
