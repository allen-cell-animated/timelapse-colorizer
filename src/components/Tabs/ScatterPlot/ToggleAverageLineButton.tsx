import React, { type ReactElement } from "react";

import { LinePlotIconSVG, LinePlotSlashIconSVG } from "src/assets";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import InlineHint from "src/components/Display/InlineHint";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state/ViewerState";
import { FlexRow } from "src/styles/utils";

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

  const pointsToAverageHint = (
    <InlineHint subtitle="Number of points to average over, as a rolling window centered on the current point." />
  );

  const configMenu = (
    <SettingsContainer labelWidth="105px" style={{ width: "300px", marginBottom: "6px" }} gapPx={10}>
      <SettingsItem
        label={
          <FlexRow $gap={6}>
            Window size <InlineHint title="Total number of points to average over, including past and future." />
          </FlexRow>
        }
        htmlFor={ToggleAverageLineButtonHtmlIds.averageLineWindowSlider}
      >
        <div style={{ marginBottom: "auto" }}>
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
        </div>
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
          maxSliderBound={2.5}
          step={0.1}
          numberFormatter={(number) => number?.toFixed(1)}
          marks={[1.6]}
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
      outlined={true}
    ></ToggleButtonWithConfig>
  );
}
