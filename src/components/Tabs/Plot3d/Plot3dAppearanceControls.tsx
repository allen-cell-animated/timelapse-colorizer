import React, { type ReactElement } from "react";

import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
} from "src/colorizer";
import ButtonWithPopover from "src/components/Buttons/ButtonWithConfig";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { StyledHorizontalRule } from "src/styles/components";

type Plot3dConeControlsProps = {
  disabled?: boolean;
};

const enum Plot3dConeControlsHtmlIds {
  CONE_SIZE_SLIDER = "plot3d-cone-size-slider",
  CONE_COLOR_RAMP_SELECTION = "plot3d-cone-color-ramp-selection",
  MOVING_AVERAGE_WINDOW_SLIDER = "plot3d-line-moving-average-window-slider",
}

export default function Plot3dAppearanceControls(props: Plot3dConeControlsProps): ReactElement {
  const movingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);
  const setMovingAverageWindow = useViewerStateStore((state) => state.setPlot3dLineMovingAverageWindow);

  const coneSize = useViewerStateStore((state) => state.plot3dVectorScale);
  const setConeSize = useViewerStateStore((state) => state.setPlot3dVectorScale);

  const coneColorRampKey = useViewerStateStore((state) => state.plot3dVectorColorRampKey);
  const coneColorRampReversed = useViewerStateStore((state) => state.plot3dVectorColorRampReversed);
  const setConeColorRampKey = useViewerStateStore((state) => state.setPlot3dVectorColorRampKey);
  const setConeColorRampReversed = useViewerStateStore((state) => state.setPlot3dVectorColorRampReversed);

  const configMenuContents = (
    <SettingsContainer labelWidth="140px">
      <SettingsItem label={"Cone size"} htmlFor={Plot3dConeControlsHtmlIds.CONE_SIZE_SLIDER}>
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

      <SettingsItem label={"Line Window Size"} htmlFor={Plot3dConeControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}
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
    <>
      <ButtonWithPopover
        label={"Appearance"}
        popoverContent={configMenuContents}
        buttonProps={{ type: "default" }}
      ></ButtonWithPopover>
    </>
  );
}
