import { Checkbox, Slider } from "antd";
import React, { ReactElement } from "react";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { DrawMode } from "../../colorizer/ColorizeCanvas";
import { FlexColumn } from "../../styles/utils";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";
import { DrawSettings } from "../CanvasWrapper";
import DrawModeDropdown from "../DrawModeDropdown";
import LabeledDropdown from "../LabeledDropdown";
import CustomCollapse from "../CustomCollapse";
import styled from "styled-components";

const NO_BACKDROP = {
  key: "",
  label: "(None)",
};

const INDENT_PX = 24;

type SettingsTabProps = {
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  showScaleBar: boolean;
  showTimestamp: boolean;
  dataset: Dataset | null;
  backdropBrightness: number;
  backdropSaturation: number;
  selectedBackdropKey: string | null;
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

const HiddenMarksSlider = styled(Slider)`
  &.ant-slider-with-marks {
    /** Override ant default styling which adds margin for mark text */
    margin-bottom: 9.625px;
  }
  & .ant-slider-mark {
    /** Hide mark text */
    display: none;
    height: 0;
  }
`;

const makeAntSliderMarks = (marks: number[]): { [key: number]: string } => {
  return marks.reduce((acc, mark) => {
    acc[mark] = mark.toString();
    return acc;
  }, {} as { [key: number]: string });
};

const h3Wrapper = (label: string | ReactElement): ReactElement => {
  return <h3>{label}</h3>;
};

export default function SettingsTab(props: SettingsTabProps): ReactElement {
  const backdropOptions = props.dataset
    ? Array.from(props.dataset.getBackdropData().entries()).map(([key, data]) => {
        return { key, label: data.name };
      })
    : [];
  backdropOptions.unshift(NO_BACKDROP);

  return (
    <FlexColumn $gap={5}>
      <CustomCollapse label="Backdrop">
        <SettingsContainer indentPx={INDENT_PX} labelFormatter={h3Wrapper}>
          <SettingsItem label="Backdrop images">
            <LabeledDropdown
              selected={props.selectedBackdropKey || NO_BACKDROP.key}
              items={backdropOptions}
              onChange={props.setBackdropKey}
              disabled={backdropOptions.length === 1}
            />
          </SettingsItem>
          <SettingsItem label="Brightness">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={50}
              max={150}
              step={10}
              marks={makeAntSliderMarks([50, 100, 150])}
              value={props.backdropBrightness}
              onChange={props.setBackdropBrightness}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </SettingsItem>

          <SettingsItem label="Saturation">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              step={10}
              marks={makeAntSliderMarks([0, 50, 100])}
              value={props.backdropSaturation}
              onChange={props.setBackdropSaturation}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>
      <CustomCollapse label="Objects">
        <SettingsContainer indentPx={INDENT_PX} labelFormatter={h3Wrapper}>
          <SettingsItem label="Filtered object color">
            <DrawModeDropdown
              selected={props.outOfRangeDrawSettings.mode}
              color={props.outOfRangeDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.setOutOfRangeDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Outlier object color">
            <DrawModeDropdown
              selected={props.outlierDrawSettings.mode}
              color={props.outlierDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.setOutlierDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Opacity">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              value={props.objectOpacity}
              onChange={props.setObjectOpacity}
            />
          </SettingsItem>
          <SettingsItem>
            <Checkbox
              type="checkbox"
              checked={props.showScaleBar}
              onChange={() => {
                props.setShowScaleBar(!props.showScaleBar);
              }}
            >
              Show scale bar
            </Checkbox>
          </SettingsItem>
          <SettingsItem>
            <Checkbox
              type="checkbox"
              checked={props.showTimestamp}
              onChange={() => {
                props.setShowTimestamp(!props.showTimestamp);
              }}
            >
              Show timestamp
            </Checkbox>
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>
    </FlexColumn>
  );
}
