import React, { ReactElement } from "react";
import { Color } from "three";

import { DrawSettings } from "../CanvasWrapper";
import DrawModeDropdown from "../DrawModeDropdown";
import { DrawMode } from "../../colorizer/ColorizeCanvas";

type SettingsTabProps = {
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  setOutOfRangeDrawSettings: (drawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (drawSettings: DrawSettings) => void;
};
const defaultProps: Partial<SettingsTabProps> = {};

export default function SettingsTab(inputProps: SettingsTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<SettingsTabProps>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
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
    </div>
  );
}
