import React, { type ReactElement } from "react";

import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { useViewerStateStore } from "src/state";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dLineControlsProps = {
  disabled?: boolean;
};

const enum Plot3dLineControlsHtmlIds {
  MOVING_AVERAGE_WINDOW_SLIDER = "plot3d-moving-average-window-slider",
}

// TODO: Make this into a toggle button control.
// TODO: Move properties into global state instead of passing via props.
export default function Plot3dLineControls(props: Plot3dLineControlsProps): ReactElement {
  const movingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);
  const setMovingAverageWindow = useViewerStateStore((state) => state.setPlot3dLineMovingAverageWindow);

  return (
    <FlexRowAlignCenter>
      <label htmlFor={Plot3dLineControlsHtmlIds.MOVING_AVERAGE_WINDOW_SLIDER}>
        <h3>Line Window Size</h3>
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
          disabled={props.disabled}
        ></LabeledSlider>
      </div>
    </FlexRowAlignCenter>
  );
}
