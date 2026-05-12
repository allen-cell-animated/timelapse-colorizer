import React, { type ReactElement } from "react";

import { LinePlotIconSVG, LinePlotSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state/ViewerState";

type ToggleAverageLineButtonProps = {
  popupContainer?: HTMLElement;
};

const enum ToggleAverageLineButtonHtmlIds {
  averageLineWindowSlider = "average-line-window-slider",
  averageLineWidthSlider = "average-line-width-slider",
}

export default function ToggleAverageLineButton(props: ToggleAverageLineButtonProps): ReactElement {
  const showAverageLine = useViewerStateStore((state) => state.scatterShowAverageLine);
  const averageLineWidth = useViewerStateStore((state) => state.scatterAverageLineWidth);
  const averageLineWindow = useViewerStateStore((state) => state.scatterAverageLineWindow);
  const setShowAverageLine = useViewerStateStore((state) => state.setScatterShowAverageLine);
  const setAverageLineWidth = useViewerStateStore((state) => state.setScatterAverageLineWidth);
  const setAverageLineWindow = useViewerStateStore((state) => state.setScatterAverageLineWindow);

  const configMenu = (
    <SettingsContainer labelWidth="80px" style={{ width: "300px", marginBottom: "6px" }} gapPx={10}>
      <SettingsItem label="Window size" htmlFor={ToggleAverageLineButtonHtmlIds.averageLineWindowSlider}>
        <LabeledSlider
          id={ToggleAverageLineButtonHtmlIds.averageLineWindowSlider}
          type="value"
          value={averageLineWindow}
          onChange={setAverageLineWindow}
          minInputBound={1}
          maxInputBound={101}
          minSliderBound={1}
          maxSliderBound={31}
          step={2}
        />
      </SettingsItem>
      <SettingsItem label="Line width" htmlFor={ToggleAverageLineButtonHtmlIds.averageLineWidthSlider}>
        <LabeledSlider
          id={ToggleAverageLineButtonHtmlIds.averageLineWidthSlider}
          type="value"
          value={averageLineWidth}
          onChange={setAverageLineWidth}
          minInputBound={0.5}
          maxInputBound={10}
          minSliderBound={0.5}
          maxSliderBound={3}
          step={0.1}
        />
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name={"moving average line"}
      visible={showAverageLine}
      setVisible={setShowAverageLine}
      configMenuContents={configMenu}
      configMenuPlacement="vertical"
      popupContainer={props.popupContainer}
      visibleIcon={<LinePlotIconSVG />}
      hiddenIcon={<LinePlotSlashIconSVG />}
    ></ToggleButtonWithConfig>
  );
}
