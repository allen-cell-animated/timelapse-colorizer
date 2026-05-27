import { Checkbox } from "antd";
import React, { type ReactElement } from "react";

import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
} from "src/colorizer";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import InlineHint from "src/components/Display/InlineHint";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { StyledHorizontalRule } from "src/styles/components";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dConeControlsProps = {
  disabled?: boolean;
};

const enum Plot3dConeControlsHtmlIds {
  CONE_SIZE_SLIDER = "plot3d-cone-size-slider",
  CONE_COLOR_RAMP_SELECTION = "plot3d-cone-color-ramp-selection",
  THRESHOLD_SLIDER = "plot3d-cone-threshold-slider",
  GAUSSIAN_BANDWIDTH_SLIDER = "plot3d-cone-gaussian-bandwidth-slider",
  GAUSSIAN_WEIGHTING_TOGGLE = "plot3d-cone-gaussian-weighting-toggle",
}

export default function Plot3dConeControls(props: Plot3dConeControlsProps): ReactElement {
  const showCones = useViewerStateStore((state) => state.plot3dShowVectors);
  const setShowCones = useViewerStateStore((state) => state.setPlot3dShowVectors);
  const coneSize = useViewerStateStore((state) => state.plot3dVectorScale);
  const setConeSize = useViewerStateStore((state) => state.setPlot3dVectorScale);
  const threshold = useViewerStateStore((state) => state.plot3dVectorThreshold);
  const setThreshold = useViewerStateStore((state) => state.setPlot3dVectorThreshold);
  const useGaussian = useViewerStateStore((state) => state.plot3dUseGaussian);
  const setUseGaussian = useViewerStateStore((state) => state.setPlot3dUseGaussian);
  const gaussianBandwidthPct = useViewerStateStore((state) => state.plot3dGaussianBandwidthPct);
  const setGaussianBandwidthPct = useViewerStateStore((state) => state.setPlot3dGaussianBandwidthPct);
  const coneColorRampKey = useViewerStateStore((state) => state.plot3dVectorColorRampKey);
  const coneColorRampReversed = useViewerStateStore((state) => state.plot3dVectorColorRampReversed);
  const setConeColorRampKey = useViewerStateStore((state) => state.setPlot3dVectorColorRampKey);
  const setConeColorRampReversed = useViewerStateStore((state) => state.setPlot3dVectorColorRampReversed);

  const densityHint = <InlineHint title="Minimum vector count for a bin to be displayed, scales with bin count" />;
  const densityThresholdLabel = <FlexRowAlignCenter $gap={4}>Density threshold {densityHint}</FlexRowAlignCenter>;

  const configMenuContents = (
    <SettingsContainer labelWidth="130px">
      <SettingsItem label={densityThresholdLabel} htmlFor={Plot3dConeControlsHtmlIds.THRESHOLD_SLIDER}>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.THRESHOLD_SLIDER}
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
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>
      <SettingsItem label="Gaussian weighting" htmlFor={Plot3dConeControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}>
        <Checkbox
          id={Plot3dConeControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}
          checked={useGaussian}
          onChange={(e) => setUseGaussian(e.target.checked)}
          disabled={props.disabled}
        />
      </SettingsItem>
      <SettingsItem label="Gaussian bandwidth" htmlFor={Plot3dConeControlsHtmlIds.GAUSSIAN_BANDWIDTH_SLIDER}>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dConeControlsHtmlIds.GAUSSIAN_BANDWIDTH_SLIDER}
            type="value"
            value={gaussianBandwidthPct}
            onChange={setGaussianBandwidthPct}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={100}
            maxSliderBound={30}
            step={1}
            marks={[15]}
            numberFormatter={(number) => number?.toFixed(0) + "%"}
            disabled={props.disabled}
          ></LabeledSlider>
        </div>
      </SettingsItem>
      <div style={{ gridColumn: "1 / -1" }}>
        <StyledHorizontalRule />
      </div>
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
    </SettingsContainer>
  );

  return (
    <>
      <ToggleButtonWithConfig
        name={"cones"}
        visible={showCones}
        setVisible={setShowCones}
        configMenuContents={configMenuContents}
        configMenuPlacement="vertical"
      ></ToggleButtonWithConfig>
    </>
  );
}
