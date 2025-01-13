import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, InputRef, Popover, Tooltip } from "antd";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Color, ColorRepresentation } from "three";

import { FlexColumn, FlexRow } from "../../../styles/utils";

import { LabelData } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import IconButton from "../../IconButton";

type LabelEditControlsProps = {
  onCreateNewLabel: () => void;
  onDeleteLabel: () => void;
  setLabelColor: (color: Color) => void;
  setLabelName: (name: string) => void;
  selectedLabel: LabelData;
  selectedLabelIdx: number;
};

export default function LabelEditControls(props: LabelEditControlsProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const [showEditPopover, setShowEditPopover] = useState(false);
  const [editPopoverNameInput, setEditPopoverNameInput] = useState("");
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);
  const editPopoverInputRef = useRef<InputRef>(null);

  const onClickEditButton = (): void => {
    setShowEditPopover(!showEditPopover);
    setEditPopoverNameInput(props.selectedLabel.name);
  };

  const onClickEditCancel = (): void => {
    setShowEditPopover(false);
  };

  const onClickEditSave = (): void => {
    props.setLabelName(editPopoverNameInput);
    setShowEditPopover(false);
  };

  const onClickCreateNewLabel = (): void => {
    setShowEditPopover(false);
    props.onCreateNewLabel();
  };

  const onClickDelete = (): void => {
    setShowEditPopover(false);
    props.onDeleteLabel();
  };

  const onColorPickerChange = (_color: any, hex: string): void => {
    props.setLabelColor(new Color(hex as ColorRepresentation));
  };

  useEffect(() => {
    // Focus input when popover is shown.
    if (showEditPopover) {
      editPopoverInputRef.current?.focus();
    }
  }, [showEditPopover]);

  useEffect(() => {
    // If the selection changes, close the edit popover.
    setShowEditPopover(false);
  }, [props.selectedLabelIdx]);

  // A small popup that appears when you press the edit button.
  const editPopoverContents = (
    <FlexColumn style={{ width: "250px" }} $gap={10}>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Name</span>
        <Input
          value={editPopoverNameInput}
          onChange={(e) => setEditPopoverNameInput(e.target.value)}
          ref={editPopoverInputRef}
        ></Input>
      </label>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Color</span>
        <div>
          <ColorPicker
            size="small"
            value={new AntdColor(props.selectedLabel.color.getHexString() || "ff00ff")}
            onChange={onColorPickerChange}
            disabledAlpha={true}
          />
        </div>
      </label>
      <FlexRow style={{ marginLeft: "auto" }} $gap={10}>
        <Button onClick={onClickEditCancel}>Cancel</Button>
        <Button onClick={onClickEditSave} type="primary">
          Save
        </Button>
      </FlexRow>
    </FlexColumn>
  );

  return (
    <FlexRow $gap={10}>
      <Tooltip title="Create new label" placement="bottom">
        <IconButton onClick={onClickCreateNewLabel} type="outlined">
          <PlusOutlined />
        </IconButton>
      </Tooltip>
      <Popover
        title={<p style={{ fontSize: theme.font.size.label }}>Edit label</p>}
        trigger={["click"]}
        placement="bottom"
        content={editPopoverContents}
        open={showEditPopover}
        getPopupContainer={() => editPopoverContainerRef.current!}
        style={{ zIndex: "1000" }}
      >
        <div ref={editPopoverContainerRef}>
          <Tooltip title="Edit label" placement="bottom">
            <IconButton onClick={onClickEditButton} type={showEditPopover ? "primary" : "outlined"}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
        </div>
      </Popover>
      {/* TODO: Show confirmation popup before deleting. */}
      <Tooltip title="Delete label" placement="bottom">
        <IconButton onClick={onClickDelete} type="outlined">
          <DeleteOutlined />
        </IconButton>
      </Tooltip>
    </FlexRow>
  );
}
