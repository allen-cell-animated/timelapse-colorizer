import React, { type ReactElement } from "react";

import { LinePlotIconSVG, LinePlotSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";

type Plot3dLineControlsProps = {
  disabled?: boolean;
};

const enum Plot3dLineControlsHtmlIds {
  MOVING_AVERAGE_WINDOW_SLIDER = "plot3d-moving-average-window-slider",
}

// TODO: Move properties into global state instead of passing via props.
export default function Plot3dLineControls(props: Plot3dLineControlsProps): ReactElement {
  const movingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);
  const setMovingAverageWindow = useViewerStateStore((state) => state.setPlot3dLineMovingAverageWindow);

  const configMenuContents = (
    <SettingsContainer>
      <SettingsItem label={"Line Window Size"} htmlFor={Plot3dLineControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dLineControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}
            type="value"
            value={movingAverageWindow}
            onChange={setMovingAverageWindow}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={50}
            maxSliderBound={20}
            step={1}
            numberFormatter={(number) => number?.toFixed(0)}
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name="lines"
      visible={true}
      setVisible={() => {}}
      configMenuContents={configMenuContents}
      outlined={true}
      visibleIcon={<LinePlotIconSVG />}
      hiddenIcon={<LinePlotSlashIconSVG />}
      configMenuPlacement="vertical"
    ></ToggleButtonWithConfig>
  );
}
