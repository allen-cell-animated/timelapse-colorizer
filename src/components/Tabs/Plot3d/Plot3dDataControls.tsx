import { Checkbox } from "antd";
import React, { type ReactElement } from "react";

import ButtonWithPopover from "src/components/Buttons/ButtonWithConfig";
import InlineHint from "src/components/Display/InlineHint";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dLineControlsProps = {
  disabled?: boolean;
};

const enum Plot3dDataControlsHtmlIds {
  CONE_SIZE_SLIDER = "plot3d-cone-size-slider",
  CONE_COLOR_RAMP_SELECTION = "plot3d-cone-color-ramp-selection",
  THRESHOLD_SLIDER = "plot3d-cone-threshold-slider",
  GAUSSIAN_BANDWIDTH_SLIDER = "plot3d-cone-gaussian-bandwidth-slider",
  GAUSSIAN_WEIGHTING_TOGGLE = "plot3d-cone-gaussian-weighting-toggle",
}

// TODO: Move properties into global state instead of passing via props.
export default function Plot3dDataControls(props: Plot3dLineControlsProps): ReactElement {
  const useGaussian = useViewerStateStore((state) => state.plot3dUseGaussian);
  const setUseGaussian = useViewerStateStore((state) => state.setPlot3dUseGaussian);
  const gaussianBandwidthPct = useViewerStateStore((state) => state.plot3dGaussianBandwidthPct);
  const setGaussianBandwidthPct = useViewerStateStore((state) => state.setPlot3dGaussianBandwidthPct);

  const gaussianHint = (
    <InlineHint
      title="Applies Gaussian weighting across vector bins."
      subtitleList={[
        "A bin's value is the sum of the Gaussian-weighted value of it and its neighbors divided by the weighted delta count, where each bin contains a sum of feature deltas.",
      ]}
    />
  );
  const gaussianLabel = <FlexRowAlignCenter $gap={4}>Gaussian weighting {gaussianHint}</FlexRowAlignCenter>;

  const configMenuContents = (
    <SettingsContainer labelWidth="140px">
      <SettingsItem label={gaussianLabel} htmlFor={Plot3dDataControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}>
        <Checkbox
          id={Plot3dDataControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}
          checked={useGaussian}
          onChange={(e) => setUseGaussian(e.target.checked)}
          disabled={props.disabled}
        />
      </SettingsItem>
      <SettingsItem label="Gaussian bandwidth" htmlFor={Plot3dDataControlsHtmlIds.GAUSSIAN_BANDWIDTH_SLIDER}>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            id={Plot3dDataControlsHtmlIds.GAUSSIAN_BANDWIDTH_SLIDER}
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
    </SettingsContainer>
  );

  return <ButtonWithPopover label={"Data"} popoverContent={configMenuContents} buttonProps={{ type: "default" }} />;
}
