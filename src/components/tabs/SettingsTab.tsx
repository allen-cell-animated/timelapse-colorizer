import React, { ReactElement } from "react";
import { Color } from "three";

import { DrawSettings } from "../CanvasWrapper";
import DrawModeDropdown from "../DrawModeDropdown";
import { DrawMode } from "../../colorizer/ColorizeCanvas";
import { FlexColumn } from "../../styles/utils";
import { Checkbox } from "antd";

type SettingsTabProps = {
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  showScaleBar: boolean;
  setOutOfRangeDrawSettings: (drawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (drawSettings: DrawSettings) => void;
  setShowScaleBar: (show: boolean) => void;
};
const defaultProps: Partial<SettingsTabProps> = {};

export default function SettingsTab(inputProps: SettingsTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SettingsTabProps>;
  return (
    <FlexColumn $gap={5}>
      <DrawModeDropdown
        label="Filtered out values"
        selected={props.outOfRangeDrawSettings.mode}
        color={props.outOfRangeDrawSettings.color}
        onChange={(mode: DrawMode, color: Color) => {
          props.setOutOfRangeDrawSettings({ mode, color });
        }}
      />
      <DrawModeDropdown
        label="Outliers"
        selected={props.outlierDrawSettings.mode}
        color={props.outlierDrawSettings.color}
        onChange={(mode: DrawMode, color: Color) => {
          props.setOutlierDrawSettings({ mode, color });
        }}
      />
      <Checkbox
        type="checkbox"
        checked={props.showScaleBar}
        onChange={() => {
          props.setShowScaleBar(!props.showScaleBar);
        }}
      >
        Show scale bar
      </Checkbox>
    </FlexColumn>
  );
}
