import React, { ReactElement, useContext } from "react";

import InlineHint from "src/components/Display/InlineHint";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import Plot3dAppearanceControls from "src/components/Tabs/Plot3d/Plot3dAppearanceControls";
import Plot3dDataControls from "src/components/Tabs/Plot3d/Plot3dDataControls";
import Plot3dFeatureControls from "src/components/Tabs/Plot3d/Plot3dFeatureControls";
import { useViewerStateStore } from "src/state/ViewerState";
import { AppThemeContext } from "src/styles/AppStyle";
import { StyledVerticalRule } from "src/styles/components";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

const enum Plot3dToolbarHtmlIds {
  THRESHOLD_SLIDER = "plot3d-cone-threshold-slider",
}

export default function Plot3dToolbar(): ReactElement {
  const theme = useContext(AppThemeContext);
  const dataset = useViewerStateStore((state) => state.dataset);

  const disabled = !dataset;

  const threshold = useViewerStateStore((state) => state.plot3dVectorThreshold);
  const setThreshold = useViewerStateStore((state) => state.setPlot3dVectorThreshold);

  const densityHint = <InlineHint title="Minimum sample density for bins. Scales with bin count." />;
  const densityThresholdLabel = <FlexRowAlignCenter $gap={6}>Density threshold {densityHint}</FlexRowAlignCenter>;
  const densitySlider = (
    <FlexRow $gap={6}>
      <label htmlFor={Plot3dToolbarHtmlIds.THRESHOLD_SLIDER} style={{ fontSize: theme.font.size.label }}>
        {densityThresholdLabel}
      </label>
      <div style={{ width: "250px" }}>
        <LabeledSlider
          id={Plot3dToolbarHtmlIds.THRESHOLD_SLIDER}
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
    <FlexColumn $gap={10}>
      {/* Plot Feature Controls */}
      <FlexRow $gap={8} style={{ flexGrow: 1 }}>
        <Plot3dFeatureControls disabled={disabled} />
      </FlexRow>
      {/* Cone Controls */}
      <FlexRowAlignCenter $gap={8}>
        <Plot3dDataControls disabled={disabled} />
        <Plot3dAppearanceControls disabled={disabled} />

        <StyledVerticalRule style={{ margin: "0 2px" }} />

        {densitySlider}
      </FlexRowAlignCenter>{" "}
    </FlexColumn>
  );
}
