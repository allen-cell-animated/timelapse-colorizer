import { Tooltip } from "antd";
import Checkbox from "antd/es/checkbox/Checkbox";
import React, { type ReactElement, useRef } from "react";

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
 * Paired numeric input box and checkbox for adjusting the length of track paths
 * shown in the viewer, with some built-in UI logic for "show all".
 */
export default function TrackPathLengthControl(props: TrackPathLengthControlProps): ReactElement {
  const divRef = useRef<HTMLDivElement>(null);
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
