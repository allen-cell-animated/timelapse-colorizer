import { BarChartOutlined } from "@ant-design/icons";
import React, { type ReactElement } from "react";

import { BarChartSlashIconSVG } from "src/assets";
import { isPositiveInteger } from "src/colorizer/utils/data_utils";
import { ToggleButtonWithConfig } from "src/components/Buttons/ToggleButtonWithConfig";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import { SettingsContainer, SettingsItem } from "src/components/SettingsContainer";
import { useViewerStateStore } from "src/state/ViewerState";

type ToggleHistogramButtonProps = {
  popupContainer?: HTMLElement;
};

const BIN_COUNTS = [20, 50, 100, 200];

const enum ToggleHistogramButtonHtmlIds {
  BIN_COUNT_DROPDOWN = "toggle-histogram-bin-count-dropdown",
}

export default function ToggleHistogramButton(props: ToggleHistogramButtonProps): ReactElement {
  const scatterHistogramBins = useViewerStateStore((state) => state.scatterHistogramBins);
  const setScatterHistogramBins = useViewerStateStore((state) => state.setScatterHistogramBins);
  const showHistograms = useViewerStateStore((state) => state.scatterShowHistograms);
  const setShowHistograms = useViewerStateStore((state) => state.setScatterShowHistograms);

  const configMenuContents = (
    <SettingsContainer>
      <SettingsItem label="Histogram bins" htmlFor={ToggleHistogramButtonHtmlIds.BIN_COUNT_DROPDOWN}>
        <SelectionDropdown
          id={ToggleHistogramButtonHtmlIds.BIN_COUNT_DROPDOWN}
          selected={scatterHistogramBins.toString()}
          items={BIN_COUNTS.map((value) => ({ value: value.toString(), label: value.toString() }))}
          isCreatable={true}
          isValidNewOption={(value: string) => {
            const bins = parseInt(value, 10);
            return isPositiveInteger(value) && BIN_COUNTS.indexOf(bins) === -1;
          }}
          onChange={function (value: string): void {
            const bins = parseInt(value, 10);
            if (isPositiveInteger(value)) {
              setScatterHistogramBins(bins);
            }
          }}
          controlWidth="80px"
        ></SelectionDropdown>
      </SettingsItem>
    </SettingsContainer>
  );

  return (
    <ToggleButtonWithConfig
      name="histogram"
      visible={showHistograms}
      visibleIcon={<BarChartOutlined />}
      hiddenIcon={<BarChartSlashIconSVG />}
      setVisible={setShowHistograms}
      configMenuContents={configMenuContents}
      configMenuPlacement="vertical"
      popupContainer={props.popupContainer}
      outlined={true}
    />
  );
}
