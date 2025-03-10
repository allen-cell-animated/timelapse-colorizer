import { Color as AntdColor } from "@rc-component/color-picker";
import { Checkbox, ColorPicker } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Color, ColorRepresentation } from "three";
import { useShallow } from "zustand/shallow";

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
  const dataset = useViewerStateStore((state) => state.dataset);
  // TODO: Other backdrop settings do not yet use `useViewerStateStore`. Replace
  // here once ViewerConfig can be updated through the store.
  const backdropKey = useViewerStateStore((state) => state.backdropKey) ?? NO_BACKDROP.value;
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);

  const store = useViewerStateStore(
    useShallow((state) => ({
      showTrackPath: state.showTrackPath,
      showScaleBar: state.showScaleBar,
      showTimestamp: state.showTimestamp,
      showLegendDuringExport: state.showLegendDuringExport,
      showHeaderDuringExport: state.showHeaderDuringExport,
      outOfRangeDrawSettings: state.outOfRangeDrawSettings,
      outlierDrawSettings: state.outlierDrawSettings,
      outlineColor: state.outlineColor,
      openTab: state.openTab,
      backdropVisible: state.backdropVisible,
      backdropBrightness: state.backdropBrightness,
      backdropSaturation: state.backdropSaturation,
      objectOpacity: state.objectOpacity,
      setBackdropBrightness: state.setBackdropBrightness,
      setBackdropSaturation: state.setBackdropSaturation,
      setObjectOpacity: state.setObjectOpacity,
      setBackdropVisible: state.setBackdropVisible,
      setShowTrackPath: state.setShowTrackPath,
      setShowScaleBar: state.setShowScaleBar,
      setShowTimestamp: state.setShowTimestamp,
      setShowLegendDuringExport: state.setShowLegendDuringExport,
      setShowHeaderDuringExport: state.setShowHeaderDuringExport,
      setOutOfRangeDrawSettings: state.setOutOfRangeDrawSettings,
      setOutlierDrawSettings: state.setOutlierDrawSettings,
      setOutlineColor: state.setOutlineColor,
      setOpenTab: state.setOpenTab,
    }))
  );

  let backdropOptions = useMemo(
    () =>
      dataset
        ? Array.from(dataset.getBackdropData().entries()).map(([key, data]) => ({ value: key, label: data.name }))
        : [],
    [dataset]
  );

  const isBackdropDisabled = backdropOptions.length === 0 || backdropKey === null;
  const isBackdropOptionsDisabled = isBackdropDisabled || !store.backdropVisible;
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
              checked={store.backdropVisible}
              onChange={(event) => store.setBackdropVisible(event.target.checked)}
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
                value={store.backdropBrightness}
                onChange={store.setBackdropBrightness}
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
                value={store.backdropSaturation}
                onChange={store.setBackdropSaturation}
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
                value={store.objectOpacity}
                onChange={store.setObjectOpacity}
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
                onChange={(_color, hex) => store.setOutlineColor(new Color(hex as ColorRepresentation))}
                value={new AntdColor(store.outlineColor.getHexString())}
                presets={DEFAULT_OUTLINE_COLOR_PRESETS}
              />
            </div>
          </SettingsItem>
          <SettingsItem label="Filtered object color">
            <DrawModeDropdown
              htmlLabelId="filtered-object-color-label"
              selected={store.outOfRangeDrawSettings.mode}
              color={store.outOfRangeDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                store.setOutOfRangeDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>
          <SettingsItem label="Outlier object color" id="outlier-object-color-label">
            <DrawModeDropdown
              htmlLabelId="outlier-object-color-label"
              selected={store.outlierDrawSettings.mode}
              color={store.outlierDrawSettings.color}
              onChange={(mode: DrawMode, color: Color) => {
                store.setOutlierDrawSettings({ mode, color });
              }}
            />
          </SettingsItem>

          <SettingsItem label={"Show track path"}>
            <Checkbox
              type="checkbox"
              checked={store.showTrackPath}
              onChange={(event) => {
                store.setShowTrackPath(event.target.checked);
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show scale bar">
            <Checkbox
              type="checkbox"
              checked={store.showScaleBar}
              onChange={(event) => {
                store.setShowScaleBar(event.target.checked);
              }}
            />
          </SettingsItem>
          <SettingsItem label="Show timestamp">
            <Checkbox
              type="checkbox"
              checked={store.showTimestamp}
              onChange={(event) => {
                store.setShowTimestamp(event.target.checked);
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
