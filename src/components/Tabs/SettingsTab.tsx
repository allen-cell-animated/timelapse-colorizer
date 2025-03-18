import { Color as AntdColor } from "@rc-component/color-picker";
import { Checkbox, ColorPicker } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";

import { OUTLINE_COLOR_DEFAULT } from "../../colorizer/constants";
import { DrawMode } from "../../colorizer/types";
import { FlexColumn } from "../../styles/utils";
import { DEFAULT_OUTLINE_COLOR_PRESETS } from "./Settings/constants";

import { useViewerStateStore } from "../../state/ViewerState";
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

export default function SettingsTab(): ReactElement {
  // State accessors
  const backdropBrightness = useViewerStateStore((state) => state.backdropBrightness);
  const backdropKey = useViewerStateStore((state) => state.backdropKey) ?? NO_BACKDROP.value;
  const backdropSaturation = useViewerStateStore((state) => state.backdropSaturation);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const dataset = useViewerStateStore((state) => state.dataset);
  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const outlierDrawSettings = useViewerStateStore((state) => state.outlierDrawSettings);
  const outlineColor = useViewerStateStore((state) => state.outlineColor);
  const outOfRangeDrawSettings = useViewerStateStore((state) => state.outOfRangeDrawSettings);
  const setBackdropBrightness = useViewerStateStore((state) => state.setBackdropBrightness);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropSaturation = useViewerStateStore((state) => state.setBackdropSaturation);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);
  const setOutlierDrawSettings = useViewerStateStore((state) => state.setOutlierDrawSettings);
  const setOutlineColor = useViewerStateStore((state) => state.setOutlineColor);
  const setOutOfRangeDrawSettings = useViewerStateStore((state) => state.setOutOfRangeDrawSettings);
  const setShowScaleBar = useViewerStateStore((state) => state.setShowScaleBar);
  const setShowTimestamp = useViewerStateStore((state) => state.setShowTimestamp);
  const setShowTrackPath = useViewerStateStore((state) => state.setShowTrackPath);
  const showScaleBar = useViewerStateStore((state) => state.showScaleBar);
  const showTimestamp = useViewerStateStore((state) => state.showTimestamp);
  const showTrackPath = useViewerStateStore((state) => state.showTrackPath);

  let backdropOptions = useMemo(
    () =>
      dataset
        ? Array.from(dataset.getBackdropData().entries()).map(([key, data]) => ({ value: key, label: data.name }))
        : [],
    [dataset]
  );

  const isBackdropDisabled = backdropOptions.length === 0 || backdropKey === null;
  const isBackdropOptionsDisabled = isBackdropDisabled || !backdropVisible;
  let selectedBackdropKey = backdropKey ?? NO_BACKDROP.value;
  if (isBackdropDisabled) {
    backdropOptions = [NO_BACKDROP];
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
              checked={backdropVisible}
              onChange={(event) => setBackdropVisible(event.target.checked)}
            />
          </SettingsItem>
          <SettingsItem label="Backdrop">
            <SelectionDropdown
              selected={selectedBackdropKey}
              items={backdropOptions}
              onChange={(key) => dataset && setBackdropKey(dataset, key)}
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
                value={backdropBrightness}
                onChange={setBackdropBrightness}
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
                value={backdropSaturation}
                onChange={setBackdropSaturation}
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
                value={objectOpacity}
                onChange={setObjectOpacity}
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
                onChange={(_color, hex) => setOutlineColor(new Color(hex as ColorRepresentation))}
                value={new AntdColor(outlineColor.getHexString())}
                presets={DEFAULT_OUTLINE_COLOR_PRESETS}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Filtered object color">
            <DrawModeDropdown
              htmlLabelId="filtered-object-color-label"
              selected={outOfRangeDrawSettings.mode}
              color={outOfRangeDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                setOutOfRangeDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Outlier object color" id="outlier-object-color-label">
            <DrawModeDropdown
              htmlLabelId="outlier-object-color-label"
              selected={outlierDrawSettings.mode}
              color={outlierDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                setOutlierDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>

          <SettingsItem label={"Show track path"}>
            <Checkbox
              type="checkbox"
              checked={showTrackPath}
              onChange={(event) => {
                setShowTrackPath(event.target.checked);
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show scale bar">
            <Checkbox
              type="checkbox"
              checked={showScaleBar}
              onChange={(event) => {
                setShowScaleBar(event.target.checked);
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show timestamp">
            <Checkbox
              type="checkbox"
              checked={showTimestamp}
              onChange={(event) => {
                setShowTimestamp(event.target.checked);
              }}
            />
          </SettingsItem>
        </SettingsContainer>
      </CustomCollapse>

      <CustomCollapse label="Vector arrows">
        <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={SETTINGS_GAP_PX}>
          <VectorFieldSettings />
        </SettingsContainer>
      </CustomCollapse>
      <div style={{ height: "100px" }}></div>
    </FlexColumn>
  );
}
