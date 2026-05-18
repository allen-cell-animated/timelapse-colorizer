import React, { type ReactElement } from "react";

import { ContourIconSVG, ContourSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

type ToggleContoursButtonProps = {
  popupContainer?: HTMLElement;
};

const enum ToggleContoursButtonHtmlIds {
  contourCountSlider = "toggle-contour-count-slider",
}

export default function ToggleContoursButton(props: ToggleContoursButtonProps): ReactElement {
  const showContours = useViewerStateStore((state) => state.scatterShowContours);
  const setShowContours = useViewerStateStore((state) => state.setScatterShowContours);
  const contourCount = useViewerStateStore((state) => state.scatterContourCount);
  const setContourCount = useViewerStateStore((state) => state.setScatterContourCount);

  const configMenuContents = (
    <SettingsContainer gapPx={6} labelWidth="90px" style={{ width: "320px", marginBottom: "8px" }}>
      <SettingsItem label="Max contours" htmlFor={ToggleContoursButtonHtmlIds.contourCountSlider}>
        <LabeledSlider
          id={ToggleContoursButtonHtmlIds.contourCountSlider}
          type="value"
          value={contourCount}
          onChange={setContourCount}
          minInputBound={1}
          maxInputBound={50}
          minSliderBound={3}
          maxSliderBound={30}
          step={1}
        />
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name="contours"
      visible={showContours}
      setVisible={setShowContours}
      configMenuContents={configMenuContents}
      configMenuPlacement="vertical"
      popupContainer={props.popupContainer}
      visibleIcon={<ContourIconSVG />}
      hiddenIcon={<ContourSlashIconSVG />}
      outlined={true}
    />
  );
}
