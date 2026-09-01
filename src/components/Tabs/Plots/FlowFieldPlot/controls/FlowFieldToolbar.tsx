import React, { type ReactElement, useContext } from "react";

import LabelWithHint from "src/components/Display/LabelWithHint";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import FlowFieldAppearanceControls from "src/components/Tabs/Plots/FlowFieldPlot/controls/FlowFieldAppearanceControls";
import FlowFieldDataControls from "src/components/Tabs/Plots/FlowFieldPlot/controls/FlowFieldDataControls";
import FlowFieldFeatureControls from "src/components/Tabs/Plots/FlowFieldPlot/controls/FlowFieldFeatureControls";
import { useViewerStateStore } from "src/state/ViewerState";
import { AppThemeContext } from "src/styles/AppStyle";
import { StyledVerticalRule } from "src/styles/components";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

const enum FlowFieldToolbarHtmlIds {
  THRESHOLD_SLIDER = "flow-field-toolbar-threshold-slider",
}

export default function FlowFieldToolbar(): ReactElement {
  const theme = useContext(AppThemeContext);

  const dataset = useViewerStateStore((state) => state.dataset);
  const threshold = useViewerStateStore((state) => state.plot3dVectorThreshold);
  const setThreshold = useViewerStateStore((state) => state.setPlot3dVectorThreshold);

  const disabled = !dataset;

  const densityThresholdLabel = (
    <LabelWithHint hintProps={{ title: "Minimum sample density for bins. Scales with bin count." }}>
      Density threshold
    </LabelWithHint>
  );
  const densitySlider = (
    <FlexRow $gap={6}>
      <label htmlFor={FlowFieldToolbarHtmlIds.THRESHOLD_SLIDER} style={{ fontSize: theme.font.size.label }}>
        {densityThresholdLabel}
      </label>
      <div style={{ width: "250px" }}>
        <LabeledSlider
          id={FlowFieldToolbarHtmlIds.THRESHOLD_SLIDER}
          type="value"
          value={threshold}
          onChange={setThreshold}
          minInputBound={0}
          minSliderBound={0}
          maxInputBound={100}
          maxSliderBound={30}
          step={1}
          marks={[5]}
          numberFormatter={(number) => number?.toFixed(0)}
          disabled={disabled}
        ></LabeledSlider>
      </div>
    </FlexRow>
  );

  return (
    <FlexColumn $gap={10} style={{ width: "100%" }}>
      {/* Plot Feature Controls */}
      <FlexRow $gap={8}>
        <FlowFieldFeatureControls disabled={disabled} />
      </FlexRow>
      <FlexRowAlignCenter $gap={8}>
        <FlowFieldDataControls disabled={disabled} />
        <FlowFieldAppearanceControls disabled={disabled} />

        <StyledVerticalRule style={{ margin: "0 2px" }} />

        {densitySlider}
      </FlexRowAlignCenter>
    </FlexColumn>
  );
}
