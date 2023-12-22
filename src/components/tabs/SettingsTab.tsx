import { Checkbox, Slider } from "antd";
import React, { ReactElement } from "react";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { FlexColumn, SettingsContainer } from "../../styles/utils";
import DrawModeDropdown from "../DrawModeDropdown";
import LabeledDropdown from "../LabeledDropdown";
import CustomCollapse from "../CustomCollapse";
import { ViewerConfig, DrawMode } from "../../colorizer/types";

const NO_BACKDROP = {
  key: "",
  label: "(None)",
};

type SettingsTabProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;

  backdropKey: string | null;
  setBackdropKey: (key: string | null) => void;

  dataset: Dataset | null;
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
        <SettingsContainer>
          <LabeledDropdown
            label={"Backdrop images:"}
            selected={props.backdropKey || NO_BACKDROP.key}
            items={backdropOptions}
            onChange={props.setBackdropKey}
            disabled={backdropOptions.length === 1}
          />
          <label>
            <span>
              <h3>Brightness:</h3>
            </span>
            <Slider
              // TODO: Add a mark at the 100% position
              style={{ maxWidth: "200px", width: "100%" }}
              min={50}
              max={150}
              step={10}
              value={props.config.backdropBrightness}
              onChange={(newBrightness: number) => props.updateConfig({ backdropBrightness: newBrightness })}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </label>
          <label>
            <span>
              <h3>Saturation:</h3>
            </span>
            <Slider
              style={{ maxWidth: "200px", width: "100%" }}
              min={0}
              max={100}
              step={10}
              value={props.config.backdropSaturation}
              onChange={(saturation) => props.updateConfig({ backdropSaturation: saturation })}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </label>
        </SettingsContainer>
      </CustomCollapse>
      <CustomCollapse label="Objects">
        <SettingsContainer>
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
            <Slider
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
