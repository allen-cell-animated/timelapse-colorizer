import { Button, Checkbox } from "antd";
import React, { type ReactElement } from "react";

import ConfigWrapper from "src/components/Controls/ConfigMenuWrapper";
import InlineHint from "src/components/Display/InlineHint";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state";
import { FlexRowAlignCenter } from "src/styles/utils";

type Plot3dDataControlsProps = {
  disabled?: boolean;
};

const enum Plot3dDataControlsHtmlIds {
  VECTOR_BINS_DROPDOWN = "plot3d-data-vector-bins-dropdown",
  GAUSSIAN_BANDWIDTH_SLIDER = "plot3d-data-gaussian-bandwidth-slider",
  GAUSSIAN_WEIGHTING_TOGGLE = "plot3d-data-gaussian-weighting-toggle",
}

export default function Plot3dDataControls(props: Plot3dDataControlsProps): ReactElement {
  const bins = useViewerStateStore((state) => state.plot3dVectorBins);
  const setBins = useViewerStateStore((state) => state.setPlot3dVectorBins);
  const useGaussian = useViewerStateStore((state) => state.plot3dUseGaussian);
  const setUseGaussian = useViewerStateStore((state) => state.setPlot3dUseGaussian);
  const gaussianBandwidthPct = useViewerStateStore((state) => state.plot3dGaussianBandwidthPct);
  const setGaussianBandwidthPct = useViewerStateStore((state) => state.setPlot3dGaussianBandwidthPct);

  const gaussianHint = (
    <InlineHint title="Use density-normalized sum of Gaussian-weighted displacement vectors for each bin and its neighbors." />
  );
  const gaussianLabel = <FlexRowAlignCenter $gap={4}>Gaussian smoothing {gaussianHint}</FlexRowAlignCenter>;

  const gaussianBandwidthHint = (
    <InlineHint title="Standard deviation (or bandwidth), as a percentage of the number of bins." />
  );
  const gaussianBandwidthLabel = (
    <FlexRowAlignCenter $gap={4}>Gaussian std. dev {gaussianBandwidthHint}</FlexRowAlignCenter>
  );

  const configMenuContents = (
    <SettingsContainer labelWidth="145px" style={{ width: "325px" }}>
      <SettingsItem label="Vector bins" htmlFor={Plot3dDataControlsHtmlIds.VECTOR_BINS_DROPDOWN}>
        <SelectionDropdown
          id={Plot3dDataControlsHtmlIds.VECTOR_BINS_DROPDOWN}
          selected={bins.toString()}
          items={[10, 20, 30, 40, 50].map((num) => ({ value: num.toString(), label: num.toString() }))}
          onChange={(value: string) => {
            const parsedValue = parseInt(value, 10);
            if (!isNaN(parsedValue) && parsedValue > 0) {
              setBins(parsedValue);
            }
          }}
          width="100px"
          controlWidth="70px"
          disabled={props.disabled}
        ></SelectionDropdown>
      </SettingsItem>

      <SettingsItem label={gaussianLabel} htmlFor={Plot3dDataControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}>
        <div style={{ width: "fit-content" }}>
          <Checkbox
            id={Plot3dDataControlsHtmlIds.GAUSSIAN_WEIGHTING_TOGGLE}
            checked={useGaussian}
            onChange={(e) => setUseGaussian(e.target.checked)}
            disabled={props.disabled}
          />
        </div>
      </SettingsItem>
      {useGaussian && (
        <SettingsItem
          label={gaussianBandwidthLabel}
          htmlFor={Plot3dDataControlsHtmlIds.GAUSSIAN_BANDWIDTH_SLIDER}
          style={{ marginBottom: 6 }}
        >
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
              disabled={props.disabled || !useGaussian}
            ></LabeledSlider>
          </div>
        </SettingsItem>
      )}
    </SettingsContainer>
  );

  return (
    <ConfigWrapper popoverContent={configMenuContents}>
      <Button>Data</Button>
    </ConfigWrapper>
  );
}
