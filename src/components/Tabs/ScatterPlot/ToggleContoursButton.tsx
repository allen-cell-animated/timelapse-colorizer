import React, { ReactElement } from "react";

import { ContourIconSVG, ContourSlashIconSVG } from "src/assets";
import { DISPLAY_COLOR_RAMP_LINEAR_KEYS } from "src/colorizer";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

type ToggleContoursButtonProps = {
  popupContainer?: HTMLElement;
};

const enum ToggleContoursButtonHtmlIds {
  contourColorMapSelect = "toggle-contour-color-map-select",
}

export default function ToggleContoursButton(props: ToggleContoursButtonProps): ReactElement {
  const showContours = useViewerStateStore((state) => state.scatterShowContours);
  const setShowContours = useViewerStateStore((state) => state.setScatterShowContours);
  const contourColorRampKey = useViewerStateStore((state) => state.scatterContourColorRampKey);
  const contourCount = useViewerStateStore((state) => state.scatterContourCount);
  const setContourCount = useViewerStateStore((state) => state.setScatterContourCount);
  const setContourColorRampKey = useViewerStateStore((state) => state.setScatterContourColorRampKey);
  const setContourColorRampReversed = useViewerStateStore((state) => state.setScatterContourColorRampReversed);
  const contourColorRampReversed = useViewerStateStore((state) => state.scatterContourColorRampReversed);

  const configMenuContents = (
    <SettingsContainer gapPx={6} labelWidth="90px" style={{ width: "320px" }}>
      <SettingsItem label="Max contours">
        <LabeledSlider
          type="value"
          value={contourCount}
          onChange={setContourCount}
          minInputBound={1}
          maxInputBound={50}
          minSliderBound={1}
          maxSliderBound={20}
          step={1}
        />
      </SettingsItem>

      <SettingsItem
        label="Colormap"
        htmlFor={ToggleContoursButtonHtmlIds.contourColorMapSelect}
        style={{ marginTop: "6px" }}
      >
        <ColorRampSelection
          id={ToggleContoursButtonHtmlIds.contourColorMapSelect}
          selectedRamp={contourColorRampKey}
          reversed={contourColorRampReversed}
          showReverseButton={true}
          onChangeRamp={(key, reversed) => {
            setContourColorRampKey(key);
            setContourColorRampReversed(reversed);
          }}
          colorRampsToDisplay={DISPLAY_COLOR_RAMP_LINEAR_KEYS}
          popupContainer={props.popupContainer}
        ></ColorRampSelection>
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name={"contours"}
      visible={showContours}
      setVisible={setShowContours}
      configMenuContents={configMenuContents}
      configMenuPlacement="vertical"
      popupContainer={props.popupContainer}
      visibleIcon={<ContourIconSVG />}
      hiddenIcon={<ContourSlashIconSVG />}
    />
  );
}
