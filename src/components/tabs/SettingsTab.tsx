import { Checkbox, Slider } from "antd";
import React, { ReactElement } from "react";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { FlexColumn, SettingsContainer } from "../../styles/utils";
import DrawModeDropdown from "../DrawModeDropdown";
import LabeledDropdown from "../LabeledDropdown";
import CustomCollapse from "../CustomCollapse";
import { ViewerConfig, DrawMode } from "../../colorizer/types";
import styled from "styled-components";

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
        <SettingsContainer $indentPx={INDENT_PX}>
          <LabeledDropdown
            label={"Backdrop images:"}
            selected={props.selectedBackdropKey || NO_BACKDROP.key}
            items={backdropOptions}
            onChange={props.setSelectedBackdropKey}
            disabled={backdropOptions.length === 1}
          />
          <label>
            <span>
              <h3>Brightness:</h3>
            </span>
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
          </label>
          <label>
            <span>
              <h3>Saturation:</h3>
            </span>
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
          </label>
        </SettingsContainer>
      </CustomCollapse>
      <CustomCollapse label="Objects">
        <SettingsContainer $indentPx={INDENT_PX}>
          <DrawModeDropdown
            label="Filtered object color:"
            selected={props.config.outOfRangeDrawSettings.mode}
            color={props.config.outOfRangeDrawSettings.color}
            onChange={(mode: DrawMode, color: Color) => {
              props.updateConfig({ outOfRangeDrawSettings: { mode, color } });
            }}
          />
          <DrawModeDropdown
            label="Outlier object color:"
            selected={props.config.outlierDrawSettings.mode}
            color={props.config.outlierDrawSettings.color}
            onChange={(mode: DrawMode, color: Color) => {
              props.updateConfig({ outlierDrawSettings: { mode, color } });
            }}
          />{" "}
          <label>
            <span>
              <h3>Opacity:</h3>
            </span>
            <HiddenMarksSlider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              value={props.config.objectOpacity}
              onChange={(opacity) => props.updateConfig({ objectOpacity: opacity })}
            />
          </label>
          <label>
            <span></span>
            <Checkbox
              type="checkbox"
              checked={props.config.showScaleBar}
              onChange={(event) => {
                props.updateConfig({ showScaleBar: event.target.checked });
              }}
            >
              Show scale bar
            </Checkbox>
          </label>
          <label>
            <span></span>
            <Checkbox
              type="checkbox"
              checked={props.config.showTimestamp}
              onChange={(event) => {
                props.updateConfig({ showTimestamp: event.target.checked });
              }}
            >
              Show timestamp
            </Checkbox>
          </label>
        </SettingsContainer>
      </CustomCollapse>
    </FlexColumn>
  );
}
