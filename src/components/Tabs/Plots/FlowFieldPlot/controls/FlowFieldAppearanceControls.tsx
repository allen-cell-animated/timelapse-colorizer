import { Button } from "antd";
import React, { type ReactElement } from "react";

import { DISPLAY_COLOR_RAMP_LINEAR_KEYS } from "src/colorizer";
import ConfigMenuWrapper from "src/components/Controls/ConfigMenuWrapper";
import LabelWithHint from "src/components/Display/LabelWithHint";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { StyledHorizontalRule } from "src/styles/components";

const SLIDER_WIDTH = "180px";

type FlowFieldAppearanceControlsProps = {
  disabled?: boolean;
};

const enum FlowFieldAppearanceControlsHtmlIds {
  CONE_SIZE_SLIDER = "flow-field-cone-size-slider",
  CONE_COLOR_RAMP_SELECTION = "flow-field-cone-color-ramp-selection",
  LINE_WINDOW_SLIDER = "flow-field-line-moving-average-window-slider",
  LINE_WIDTH_SLIDER = "flow-field-line-width-slider",
}

export default function FlowFieldAppearanceControls(props: FlowFieldAppearanceControlsProps): ReactElement {
  const movingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);
  const setMovingAverageWindow = useViewerStateStore((state) => state.setPlot3dLineMovingAverageWindow);
  const lineWidth = useViewerStateStore((state) => state.plot3dLineWidth);
  const setLineWidth = useViewerStateStore((state) => state.setPlot3dLineWidth);

  const coneSize = useViewerStateStore((state) => state.plot3dVectorScale);
  const setConeSize = useViewerStateStore((state) => state.setPlot3dVectorScale);

  const coneColorRampKey = useViewerStateStore((state) => state.plot3dVectorColorRampKey);
  const coneColorRampReversed = useViewerStateStore((state) => state.plot3dVectorColorRampReversed);
  const setConeColorRampKey = useViewerStateStore((state) => state.setPlot3dVectorColorRampKey);
  const setConeColorRampReversed = useViewerStateStore((state) => state.setPlot3dVectorColorRampReversed);

  const windowSizeLabel = (
    <LabelWithHint hintProps={{ title: "Total number of points to average over, including past and future." }}>
      Line window size
    </LabelWithHint>
  );
  const configMenuContents = (
    <SettingsContainer labelWidth="140px">
      <SettingsItem
        label={"Cone size"}
        htmlFor={FlowFieldAppearanceControlsHtmlIds.CONE_SIZE_SLIDER}
        style={{ marginBottom: 6 }}
      >
        <div style={{ width: SLIDER_WIDTH }}>
          <LabeledSlider
            id={FlowFieldAppearanceControlsHtmlIds.CONE_SIZE_SLIDER}
            type="value"
            value={coneSize}
            onChange={setConeSize}
            minInputBound={0.1}
            maxInputBound={10}
            minSliderBound={0.1}
            maxSliderBound={3}
            step={0.1}
            marks={[1]}
            numberFormatter={(number) => number?.toFixed(1)}
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>
      <SettingsItem label="Color ramp" htmlFor={FlowFieldAppearanceControlsHtmlIds.CONE_COLOR_RAMP_SELECTION}>
        <ColorRampSelection
          id={FlowFieldAppearanceControlsHtmlIds.CONE_COLOR_RAMP_SELECTION}
          selectedRamp={coneColorRampKey}
          onChangeRamp={function (colorRampKey: string, reversed: boolean): void {
            setConeColorRampKey(colorRampKey);
            setConeColorRampReversed(reversed);
          }}
          reversed={coneColorRampReversed}
          disabled={props.disabled}
          colorRampsToDisplay={DISPLAY_COLOR_RAMP_LINEAR_KEYS}
        />
      </SettingsItem>

      <div style={{ gridColumn: "1 / -1" }}>
        <StyledHorizontalRule />
      </div>

      <SettingsItem
        label={windowSizeLabel}
        htmlFor={FlowFieldAppearanceControlsHtmlIds.LINE_WINDOW_SLIDER}
        style={{ marginBottom: "6px" }}
      >
        <div style={{ width: SLIDER_WIDTH }}>
          <LabeledSlider
            id={FlowFieldAppearanceControlsHtmlIds.LINE_WINDOW_SLIDER}
            type="value"
            value={movingAverageWindow}
            onChange={setMovingAverageWindow}
            minInputBound={1}
            maxInputBound={51}
            minSliderBound={1}
            maxSliderBound={21}
            step={1}
            numberFormatter={(number) => number?.toFixed(0)}
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>

      <SettingsItem label="Line width" htmlFor={FlowFieldAppearanceControlsHtmlIds.LINE_WIDTH_SLIDER}>
        <LabeledSlider
          id={FlowFieldAppearanceControlsHtmlIds.LINE_WIDTH_SLIDER}
          type="value"
          value={lineWidth}
          onChange={setLineWidth}
          disabled={props.disabled}
          minInputBound={0.5}
          maxInputBound={10}
          minSliderBound={0.5}
          maxSliderBound={5}
          step={0.1}
          numberFormatter={(number) => number?.toFixed(1)}
          marks={[3.0]}
        />
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <>
      <ConfigMenuWrapper popoverContent={configMenuContents}>
        <Button>Appearance</Button>
      </ConfigMenuWrapper>
    </>
  );
}
