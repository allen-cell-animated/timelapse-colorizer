import { Color as AntdColor } from "@rc-component/color-picker";
import { Checkbox, ColorPicker } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

import { Dataset } from "../../colorizer";
import { OUTLINE_COLOR_DEFAULT } from "../../colorizer/constants";
import { DrawMode, ViewerConfig } from "../../colorizer/types";
import { FlexColumn } from "../../styles/utils";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./Settings/constants";

import { useViewerStateStore } from "../../colorizer/state/ViewerState";
import CustomCollapse from "../CustomCollapse";
import DrawModeDropdown from "../Dropdowns/DrawModeDropdown";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import LabeledSlider from "../LabeledSlider";
import { SettingsContainer, SettingsItem } from "../SettingsContainer";
import VectorFieldSettings from "./Settings/VectorFieldSettings";

const NO_BACKDROP = {
  value: "",
  label: "(None)",
};

export const SETTINGS_INDENT_PX = 24;
const SETTINGS_GAP_PX = 8;
export const MAX_SLIDER_WIDTH = "250px";

type SettingsTabProps = {
  config: ViewerConfig;
  updateConfig(settings: Partial<ViewerConfig>): void;

  dataset: Dataset | null;
};

export default function SettingsTab(props: SettingsTabProps): ReactElement {
  const backdropOptions = useMemo(
    () =>
      props.dataset
        ? Array.from(props.dataset.getBackdropData().entries()).map(([key, data]) => ({ value: key, label: data.name }))
        : [],
    [props.dataset]
  );

  const backdropKey = useViewerStateStore((state) => state.backdropKey) ?? NO_BACKDROP.value;
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);

  const isBackdropDisabled = backdropOptions.length === 0 || backdropKey === null;
  const isBackdropOptionsDisabled = isBackdropDisabled || !props.config.backdropVisible;
  let selectedBackdropKey = backdropKey ?? NO_BACKDROP.value;
  if (isBackdropDisabled) {
    backdropOptions.push(NO_BACKDROP);
    selectedBackdropKey = NO_BACKDROP.value;
  }

  return (
    <FlexColumn $gap={5}>
      <CustomCollapse label="Backdrop">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <SettingsItem label={"Show backdrops"}>
            <Checkbox
              type="checkbox"
              disabled={isBackdropDisabled}
              checked={props.config.backdropVisible}
              onChange={(event) => {
                props.updateConfig({ backdropVisible: event.target.checked });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Backdrop">
            <SelectionDropdown
              selected={selectedBackdropKey}
              items={backdropOptions}
              onChange={setBackdropKey}
              disabled={isBackdropOptionsDisabled}
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
                disabled={isBackdropOptionsDisabled}
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
                disabled={isBackdropOptionsDisabled}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Object opacity">
            <div style={{ maxWidth: MAX_SLIDER_WIDTH, width: "100%" }}>
              <LabeledSlider
                type="value"
                disabled={isBackdropOptionsDisabled}
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
        </SettingsContainer>
      </CustomCollapse>

      <CustomCollapse label="Objects">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <SettingsItem label="Outline color">
            <div>
              <ColorPicker
                style={{ width: "min-content" }}
                size="small"
                disabledAlpha={true}
                defaultValue={new AntdColor(OUTLINE_COLOR_DEFAULT)}
                onChange={(_color, hex) => {
                  props.updateConfig({ outlineColor: new Color(hex as ColorRepresentation) });
                }}
                value={new AntdColor(props.config.outlineColor.getHexString())}
                presets={DEFAULT_OUTLINE_COLOR_PRESETS}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Filtered object color">
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

          <SettingsItem label={"Show track path"}>
            <Checkbox
              type="checkbox"
              checked={props.config.showTrackPath}
              onChange={(event) => {
                props.updateConfig({ showTrackPath: event.target.checked });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show scale bar">
            <Checkbox
              type="checkbox"
              checked={props.config.showScaleBar}
              onChange={(event) => {
                props.updateConfig({ showScaleBar: event.target.checked });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show timestamp">
            <Checkbox
              type="checkbox"
              checked={props.config.showTimestamp}
              onChange={(event) => {
                props.updateConfig({ showTimestamp: event.target.checked });
              }}
            />
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>

      <CustomCollapse label="Vector arrows">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <VectorFieldSettings config={props.config} updateConfig={props.updateConfig} />
        </SettingsContainer>
      </CustomCollapse>
      <div style={{ height: "100px" }}></div>
    </FlexColumn>
  );
}
