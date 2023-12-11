import React, { ReactElement } from "react";
import { Checkbox, Divider, Slider } from "antd";
import { Color } from "three";
import styled from "styled-components";

import { DrawSettings } from "../CanvasWrapper";
import DrawModeDropdown from "../DrawModeDropdown";
import { DrawMode } from "../../colorizer/ColorizeCanvas";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "../../styles/utils";
import LabeledDropdown from "../LabeledDropdown";
import { Dataset } from "../../colorizer";

type SettingsTabProps = {
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  showScaleBar: boolean;
  showTimestamp: boolean;
  dataset: Dataset | null;
  overlayOpacity: number;
  overlayName: string;
  setOutOfRangeDrawSettings: (drawSettings: DrawSettings) => void;
  setOutlierDrawSettings: (drawSettings: DrawSettings) => void;
  setShowScaleBar: (show: boolean) => void;
  setShowTimestamp: (show: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
  setOverlayName: (name: string) => void;
};

const SectionHeaderText = styled.h2`
  margin: 10px 0 0 0;
  padding: 0;
`;

export default function SettingsTab(props: SettingsTabProps): ReactElement {
  return (
    <FlexColumn $gap={5}>
      <SectionHeaderText>Overlay</SectionHeaderText>
      <LabeledDropdown
        // TODO: Add a None option? Or an option to clear?
        label={"Overlay images"}
        selected={props.overlayName}
        items={props.dataset?.getOverlayNames() ?? []}
        onChange={props.setOverlayName}
      />
      <FlexRowAlignCenter $gap={6}>
        <h3>Opacity</h3>
        <Slider
          style={{ maxWidth: "200px", width: "100%" }}
          min={0}
          max={100}
          value={props.overlayOpacity}
          onChange={props.setOverlayOpacity}
        />
      </FlexRowAlignCenter>
      <LabeledDropdown
        label={"Ordering"}
        selected={"Behind"}
        items={["Front", "Behind"]}
        onChange={function (key: string): void {
          throw new Error("Function not implemented.");
        }}
      />

      <Divider />

      <SectionHeaderText>Viewport</SectionHeaderText>
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
      <Checkbox
        type="checkbox"
        checked={props.showTimestamp}
        onChange={() => {
          props.setShowTimestamp(!props.showTimestamp);
        }}
      >
        Show timestamp
      </Checkbox>
    </FlexColumn>
  );
}
