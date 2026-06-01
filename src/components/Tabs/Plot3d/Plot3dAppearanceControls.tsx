import React, { type ReactElement } from "react";

import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
} from "src/colorizer";
import ButtonWithPopover from "src/components/Buttons/ButtonWithConfig";
import InlineHint from "src/components/Display/InlineHint";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { StyledHorizontalRule } from "src/styles/components";
import { FlexRow } from "src/styles/utils";

type Plot3dConeControlsProps = {
  disabled?: boolean;
};

const enum Plot3dConeControlsHtmlIds {
  CONE_SIZE_SLIDER = "plot3d-cone-size-slider",
  CONE_COLOR_RAMP_SELECTION = "plot3d-cone-color-ramp-selection",
  LINE_WINDOW_SLIDER = "plot3d-line-moving-average-window-slider",
  LINE_WIDTH_SLIDER = "plot3d-line-width-slider",
}

export default function Plot3dAppearanceControls(props: Plot3dConeControlsProps): ReactElement {
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

  const windowSizeHint = <InlineHint title="Total number of points to average over, including past and future." />;
  const windowSizeLabel = <FlexRow $gap={6}>Line window size {windowSizeHint}</FlexRow>;

  const configMenuContents = (
    <SettingsContainer labelWidth="140px">
      <SettingsItem
        label={"Cone size"}
        htmlFor={Plot3dConeControlsHtmlIds.CONE_SIZE_SLIDER}
        style={{ marginBottom: 6 }}
      >
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.CONE_SIZE_SLIDER}
            type="value"
            value={coneSize}
            onChange={setConeSize}
            minInputBound={0.1}
            minSliderBound={0.1}
            maxInputBound={10}
            maxSliderBound={2.5}
            step={0.1}
            marks={[1]}
            numberFormatter={(number) => number?.toFixed(1)}
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>
      <SettingsItem label="Color ramp" htmlFor={Plot3dConeControlsHtmlIds.CONE_COLOR_RAMP_SELECTION}>
        <ColorRampSelection
          selectedRamp={coneColorRampKey}
          onChangeRamp={function (colorRampKey: string, reversed: boolean): void {
            setConeColorRampKey(colorRampKey);
            setConeColorRampReversed(reversed);
          }}
          reversed={coneColorRampReversed}
          colorRampsToDisplay={DISPLAY_COLOR_RAMP_LINEAR_KEYS}
          selectedPaletteKey={DEFAULT_CATEGORICAL_PALETTE_KEY}
          onChangePalette={() => {}}
          numCategories={0}
          categoricalPalettesToDisplay={DISPLAY_CATEGORICAL_PALETTE_KEYS}
          disabled={props.disabled}
        />
      </SettingsItem>

      <div style={{ gridColumn: "1 / -1" }}>
        <StyledHorizontalRule />
      </div>

      <SettingsItem
        label={windowSizeLabel}
        htmlFor={Plot3dConeControlsHtmlIds.LINE_WINDOW_SLIDER}
        style={{ marginBottom: "6px" }}
      >
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.LINE_WINDOW_SLIDER}
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

      <SettingsItem label="Line width" htmlFor={Plot3dConeControlsHtmlIds.LINE_WIDTH_SLIDER}>
        <LabeledSlider
          id={Plot3dConeControlsHtmlIds.LINE_WIDTH_SLIDER}
          type="value"
          value={lineWidth}
          onChange={setLineWidth}
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
      <ButtonWithPopover
        label="Appearance"
        popoverContent={configMenuContents}
        buttonProps={{ type: "default" }}
      ></ButtonWithPopover>
    </>
  );
}
