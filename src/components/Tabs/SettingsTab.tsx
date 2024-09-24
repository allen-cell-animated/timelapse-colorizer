import { Checkbox } from "antd";
import React, { ReactElement } from "react";
import { Color } from "three";

import { Dataset } from "../../colorizer";
import { DrawMode, ViewerConfig } from "../../colorizer/types";
import { FlexColumn } from "../../styles/utils";

import CustomCollapse from "../CustomCollapse";
import DrawModeDropdown from "../Dropdowns/DrawModeDropdown";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import LabeledSlider from "../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";

const NO_BACKDROP = {
  value: "",
  label: "(None)",
};

const INDENT_PX = 24;
const MAX_SLIDER_WIDTH = "250px";

type SettingsTabProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;

  selectedBackdropKey: string | null;
  setSelectedBackdropKey: (key: string | null) => void;

  dataset: Dataset | null;
};

const h3Wrapper = (label: string | ReactElement): ReactElement => {
  return <h3>{label}</h3>;
};

export default function SettingsTab(props: SettingsTabProps): ReactElement {
  const backdropOptions = props.dataset
    ? Array.from(props.dataset.getBackdropData().entries()).map(([key, data]) => {
        return { value: key, label: data.name };
      })
    : [];
  backdropOptions.unshift(NO_BACKDROP);

  const isBackdropDisabled = backdropOptions.length === 1 || !props.selectedBackdropKey;

  return (
    <FlexColumn $gap={5}>
      <CustomCollapse label="Backdrop">
        <SettingsContainer indentPx={INDENT_PX} labelFormatter={h3Wrapper}>
          <SettingsItem label="Backdrop images" id="backdrop-images-dropdown-label">
            <SelectionDropdown
              htmlLabelId="backdrop-images-dropdown-label"
              selected={props.selectedBackdropKey || NO_BACKDROP.value}
              items={backdropOptions}
              onChange={props.setSelectedBackdropKey}
              disabled={backdropOptions.length === 1}
            />
          </SettingsItem>
          <SettingsItem label="Brightness">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                type="value"
                minSliderBound={0}
                maxSliderBound={200}
                minInputBound={0}
                maxInputBound={200}
                value={props.config.backdropBrightness}
                onChange={(brightness: number) => props.updateConfig({ backdropBrightness: brightness })}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
                disabled={isBackdropDisabled}
              />
            </div>
          </SettingsItem>

          <SettingsItem label="Saturation">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                type="value"
                minSliderBound={0}
                maxSliderBound={100}
                minInputBound={0}
                maxInputBound={100}
                value={props.config.backdropSaturation}
                onChange={(saturation: number) => props.updateConfig({ backdropSaturation: saturation })}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
                disabled={isBackdropDisabled}
              />
            </div>
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>
      <CustomCollapse label="Objects">
        <SettingsContainer indentPx={INDENT_PX} labelFormatter={h3Wrapper}>
          <SettingsItem label="Filtered object color" id="filtered-object-color-label">
            <DrawModeDropdown
              htmlLabelId="filtered-object-color-label"
              selected={props.config.outOfRangeDrawSettings.mode}
              color={props.config.outOfRangeDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.updateConfig({ outOfRangeDrawSettings: { mode, color } });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Outlier object color" id="outlier-object-color-label">
            <DrawModeDropdown
              htmlLabelId="outlier-object-color-label"
              selected={props.config.outlierDrawSettings.mode}
              color={props.config.outlierDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                props.updateConfig({ outlierDrawSettings: { mode, color } });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Opacity">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                type="value"
                minSliderBound={0}
                maxSliderBound={100}
                minInputBound={0}
                maxInputBound={100}
                value={props.config.objectOpacity}
                onChange={(objectOpacity: number) => props.updateConfig({ objectOpacity: objectOpacity })}
                marks={[100]}
                numberFormatter={(value?: number) => `${value}%`}
              />
            </div>
          </SettingsItem>

          <SettingsItem>
            <Checkbox
              type="checkbox"
              checked={props.config.showTrackPath}
              onChange={(event) => {
                props.updateConfig({ showTrackPath: event.target.checked });
              }}
            >
              Show track path
            </Checkbox>
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
