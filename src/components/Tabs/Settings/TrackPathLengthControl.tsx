import { Tooltip } from "antd";
import Checkbox from "antd/es/checkbox/Checkbox";
import React, { type ReactElement } from "react";

import SpinBox from "src/components/SpinBox";
import { FlexRowAlignCenter } from "src/styles/utils";

type TrackPathLengthControlProps = {
  id: string;
  value: number;
  onValueChanged: (value: number) => void;
  showAllChecked: boolean;
  onShowAllChanged: (checked: boolean) => void;
  showAllValue: number;
};

/**
 * Control for adjusting the length of track paths shown in the viewer, and a
 * toggle to show all steps.
 */
export default function TrackPathLengthControl(props: TrackPathLengthControlProps): ReactElement {
  const divRef = React.useRef<HTMLDivElement>(null);
  return (
    <FlexRowAlignCenter $gap={8} ref={divRef}>
      <Tooltip
        title="Max track length across the entire dataset."
        trigger={["focus", "hover"]}
        getPopupContainer={() => divRef.current || document.body}
        open={props.showAllChecked ? undefined : false}
      >
        <div>
          <SpinBox
            value={props.showAllChecked ? props.showAllValue : props.value}
            onChange={props.onValueChanged}
            id={props.id}
            disabled={props.showAllChecked}
            min={0}
          ></SpinBox>
        </div>
      </Tooltip>
      <FlexRowAlignCenter style={{ height: "100%" }}>
        <Checkbox checked={props.showAllChecked} onChange={(e) => props.onShowAllChanged(e.target.checked)}>
          Show all
        </Checkbox>
      </FlexRowAlignCenter>
    </FlexRowAlignCenter>
  );
}
