import Checkbox from "antd/es/checkbox/Checkbox";
import React, { ReactElement } from "react";

import SpinBox from "src/components/SpinBox";
import { FlexRowAlignCenter } from "src/styles/utils";

type TrackPathLengthControlProps = {
  id: string;
  value: number;
  onValueChanged: (value: number) => void;
  showAllChecked: boolean;
  onShowAllChanged: (checked: boolean) => void;
};

/**
 * Control for adjusting the length of track paths shown in the viewer, and a
 * toggle to show all steps.
 */
export default function TrackPathLengthControl(props: TrackPathLengthControlProps): ReactElement {
  return (
    <FlexRowAlignCenter $gap={8}>
      <SpinBox
        value={props.value}
        onChange={props.onValueChanged}
        id={props.id}
        disabled={props.showAllChecked}
        min={0}
      ></SpinBox>
      <FlexRowAlignCenter style={{ height: "100%" }}>
        <Checkbox checked={props.showAllChecked} onChange={(e) => props.onShowAllChanged(e.target.checked)}>
          Show all
        </Checkbox>
      </FlexRowAlignCenter>
    </FlexRowAlignCenter>
  );
}
