import React, { type ReactElement } from "react";

import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
} from "src/colorizer";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dConeControlsProps = {
  coneSize: number;
  setConeSize: (value: number) => void;
  coneColorRampKey: string;
  setConeColorRampKey: (value: string) => void;
  coneColorRampReversed: boolean;
  setConeColorRampReversed: (value: boolean) => void;
  threshold: number;
  setThreshold: (value: number) => void;
};

const enum Plot3dConeControlsHtmlIds {
  CONE_SIZE_SLIDER = "plot3d-cone-size-slider",
  THRESHOLD_SLIDER = "plot3d-cone-threshold-slider",
}

export default function Plot3dConeControls(props: Plot3dConeControlsProps): ReactElement {
  const {
    coneSize,
    setConeSize,
    coneColorRampKey,
    setConeColorRampKey,
    coneColorRampReversed,
    setConeColorRampReversed,
    threshold,
    setThreshold,
  } = props;

  return (
    <>
      <FlexRowAlignCenter $gap={6}>
        <label htmlFor={Plot3dConeControlsHtmlIds.CONE_SIZE_SLIDER} style={{ whiteSpace: "nowrap" }}>
          <h3>Cone size</h3>
        </label>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.CONE_SIZE_SLIDER}
            type="value"
            value={coneSize}
            onChange={setConeSize}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={10}
            maxSliderBound={2.5}
            step={0.1}
            marks={[1]}
            numberFormatter={(number) => number?.toFixed(1)}
          ></LabeledSlider>
        </div>
      </FlexRowAlignCenter>

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
      />

      <FlexRowAlignCenter $gap={6}>
        <label htmlFor={Plot3dConeControlsHtmlIds.THRESHOLD_SLIDER}>
          <h3>Threshold</h3>
        </label>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.THRESHOLD_SLIDER}
            type="value"
            value={threshold}
            onChange={setThreshold}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={50}
            maxSliderBound={20}
            step={1}
            marks={[5]}
            numberFormatter={(number) => number?.toFixed(0)}
          ></LabeledSlider>
        </div>
      </FlexRowAlignCenter>
    </>
  );
}
