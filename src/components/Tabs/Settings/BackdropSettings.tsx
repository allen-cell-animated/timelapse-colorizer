import React, { type ReactElement, useMemo } from "react";

import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import ToggleCollapse from "src/components/ToggleCollapse";
import { MAX_SETTINGS_SLIDER_WIDTH } from "src/constants";
import { useViewerStateStore } from "src/state";

import { SETTINGS_GAP_PX } from "./constants";

const enum BackdropSettingsHtmlIds {
  SHOW_BACKDROPS_CHECKBOX = "show-backdrops-checkbox",
  BACKDROP_KEY_SELECT = "backdrop-key-select",
  BACKDROP_BRIGHTNESS_SLIDER = "backdrop-brightness-slider",
  BACKDROP_SATURATION_SLIDER = "backdrop-saturation-slider",
  OBJECT_OPACITY_SLIDER = "object-opacity-slider",
}

const NO_BACKDROP = {
  value: "",
  label: "(None)",
};

export default function BackdropSettings(): ReactElement {
  const backdropBrightness = useViewerStateStore((state) => state.backdropBrightness);
  const backdropKey = useViewerStateStore((state) => state.backdropKey) ?? NO_BACKDROP.value;
  const backdropSaturation = useViewerStateStore((state) => state.backdropSaturation);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const dataset = useViewerStateStore((state) => state.dataset);

  const objectOpacity = useViewerStateStore((state) => state.objectOpacity);
  const setBackdropBrightness = useViewerStateStore((state) => state.setBackdropBrightness);
  const setBackdropKey = useViewerStateStore((state) => state.setBackdropKey);
  const setBackdropSaturation = useViewerStateStore((state) => state.setBackdropSaturation);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setObjectOpacity = useViewerStateStore((state) => state.setObjectOpacity);

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
    <ToggleCollapse
      label="2D Backdrop"
      toggleDisabled={isBackdropDisabled}
      toggleChecked={backdropVisible}
      onToggleChange={setBackdropVisible}
    >
      <SettingsContainer gapPx={SETTINGS_GAP_PX}>
        <SettingsItem label="Backdrop" htmlFor={BackdropSettingsHtmlIds.BACKDROP_KEY_SELECT}>
          <SelectionDropdown
            id={BackdropSettingsHtmlIds.BACKDROP_KEY_SELECT}
            selected={selectedBackdropKey}
            items={backdropOptions}
            onChange={(key) => dataset && setBackdropKey(key)}
            disabled={isBackdropOptionsDisabled}
            controlWidth={"280px"}
            controlTooltipPlacement="right"
          />
        </SettingsItem>
        <SettingsItem label="Brightness" htmlFor={BackdropSettingsHtmlIds.BACKDROP_BRIGHTNESS_SLIDER}>
          <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
            <LabeledSlider
              id={BackdropSettingsHtmlIds.BACKDROP_BRIGHTNESS_SLIDER}
              type="value"
              minSliderBound={0}
              maxSliderBound={200}
              minInputBound={0}
              maxInputBound={200}
              value={backdropBrightness}
              onChange={setBackdropBrightness}
              marks={[100]}
              step={1}
              numberFormatter={(value?: number) => `${value}%`}
              disabled={isBackdropOptionsDisabled}
            />
          </div>
        </SettingsItem>

        <SettingsItem label="Saturation" htmlFor={BackdropSettingsHtmlIds.BACKDROP_SATURATION_SLIDER}>
          <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
            <LabeledSlider
              id={BackdropSettingsHtmlIds.BACKDROP_SATURATION_SLIDER}
              type="value"
              minSliderBound={0}
              maxSliderBound={100}
              minInputBound={0}
              maxInputBound={100}
              value={backdropSaturation}
              onChange={setBackdropSaturation}
              marks={[100]}
              step={1}
              numberFormatter={(value?: number) => `${value}%`}
              disabled={isBackdropOptionsDisabled}
            />
          </div>
        </SettingsItem>
        <SettingsItem label="Object opacity" htmlFor={BackdropSettingsHtmlIds.OBJECT_OPACITY_SLIDER}>
          <div style={{ maxWidth: MAX_SETTINGS_SLIDER_WIDTH, width: "100%" }}>
            <LabeledSlider
              id={BackdropSettingsHtmlIds.OBJECT_OPACITY_SLIDER}
              type="value"
              disabled={isBackdropOptionsDisabled}
              minSliderBound={0}
              maxSliderBound={100}
              minInputBound={0}
              maxInputBound={100}
              value={objectOpacity}
              onChange={setObjectOpacity}
              marks={[100]}
              step={1}
              numberFormatter={(value?: number) => `${value}%`}
            />
          </div>
        </SettingsItem>
      </SettingsContainer>
    </ToggleCollapse>
  );
}
