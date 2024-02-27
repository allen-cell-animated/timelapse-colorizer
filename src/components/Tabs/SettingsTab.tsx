import { Checkbox, Slider } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { DrawMode, ViewerConfig } from "../../colorizer/types";
import { FlexColumn } from "../../styles/utils";

import CustomCollapse from "../CustomCollapse";
import DrawModeDropdown from "../Dropdowns/DrawModeDropdown";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";

const NO_BACKDROP = {
  key: "",
  label: "(None)",
};

const INDENT_PX = 24;

type SettingsTabProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;

  selectedBackdropKey: string | null;
  setSelectedBackdropKey: (key: string | null) => void;

  dataset: Dataset | null;
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
            <SelectionDropdown
              selected={props.selectedBackdropKey || NO_BACKDROP.key}
              items={backdropOptions}
              onChange={props.setSelectedBackdropKey}
              disabled={backdropOptions.length === 1}
            />
          </SettingsItem>
          <SettingsItem label="Brightness">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={50}
              max={150}
              step={10}
              value={props.config.backdropBrightness}
              onChange={(newBrightness: number) => props.updateConfig({ backdropBrightness: newBrightness })}
              marks={makeAntSliderMarks([50, 100, 150])}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </SettingsItem>

          <SettingsItem label="Saturation">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              step={10}
              value={props.config.backdropSaturation}
              onChange={(saturation) => props.updateConfig({ backdropSaturation: saturation })}
              marks={makeAntSliderMarks([0, 50, 100])}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>
      <CustomCollapse label="Objects">
        <SettingsContainer indentPx={INDENT_PX} labelFormatter={h3Wrapper}>
          <SettingsItem label="Filtered object color">
            <DrawModeDropdown
              selected={props.config.outOfRangeDrawSettings.mode}
              color={props.config.outOfRangeDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.updateConfig({ outOfRangeDrawSettings: { mode, color } });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Outlier object color">
            <DrawModeDropdown
              selected={props.config.outlierDrawSettings.mode}
              color={props.config.outlierDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.updateConfig({ outlierDrawSettings: { mode, color } });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Opacity">
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              value={props.config.objectOpacity}
              onChange={(opacity) => props.updateConfig({ objectOpacity: opacity })}
            />
          </SettingsItem>
          <SettingsItem>
            <Checkbox
              type="checkbox"
              checked={props.config.showScaleBar}
              onChange={(event) => {
                props.updateConfig({ showScaleBar: event.target.checked });
              }}
            >
              Show scale bar
            </Checkbox>
          </SettingsItem>
          <SettingsItem>
            <Checkbox
              type="checkbox"
              checked={props.config.showTimestamp}
              onChange={(event) => {
                props.updateConfig({ showTimestamp: event.target.checked });
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
