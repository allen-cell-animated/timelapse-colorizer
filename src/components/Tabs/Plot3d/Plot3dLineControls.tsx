import React, { ReactElement } from "react";

import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dLineControlsProps = {
  movingAverageWindow: number;
  setMovingAverageWindow: (value: number) => void;
};

const enum Plot3dLineControlsHtmlIds {
  MOVING_AVERAGE_WINDOW_SLIDER = "plot3d-moving-average-window-slider",
}

// TODO: Make this into a toggle button control.
// TODO: Move properties into global state instead of passing via props.
export default function Plot3dLineControls(props: Plot3dLineControlsProps): ReactElement {
  const { movingAverageWindow, setMovingAverageWindow } = props;

  return (
    <FlexRowAlignCenter>
      <label htmlFor={Plot3dLineControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}>
        <h3>Line Moving Avg.</h3>
      </label>
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
        ></LabeledSlider>
      </div>
    </FlexRowAlignCenter>
  );
}
