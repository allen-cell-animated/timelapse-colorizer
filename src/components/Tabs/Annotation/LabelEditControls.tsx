import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, InputRef, Popconfirm, Popover, Radio, Tooltip } from "antd";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Color, ColorRepresentation } from "three";

import { TagAddIconSVG } from "../../../assets";
import { AnnotationSelectionMode } from "../../../colorizer";
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
  selectionMode: AnnotationSelectionMode;
  setSelectionMode: (mode: AnnotationSelectionMode) => void;
};

export default function LabelEditControls(props: LabelEditControlsProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const [showEditPopover, setShowEditPopover] = useState(false);
  const [editPopoverNameInput, setEditPopoverNameInput] = useState("");
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);
  const editPopoverInputRef = useRef<InputRef>(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const onClickEditButton = (): void => {
    setEditPopoverNameInput(props.selectedLabel.name);
    setShowEditPopover(!showEditPopover);
  };

  const onClickEditCancel = (): void => {
    setShowEditPopover(false);
  };

  const onClickEditSave = (): void => {
    props.setLabelName(editPopoverNameInput.trim());
    setShowEditPopover(false);
  };

  const onClickCreateNewLabel = (): void => {
    props.onCreateNewLabel();
    setShowEditPopover(false);
  };

  const deleteLabel = (): void => {
    props.onDeleteLabel();
    setShowEditPopover(false);
    setShowDeletePopup(false);
  };

  const onDeletePopupOpenChange = (open: boolean): void => {
    if (!open) {
      setShowDeletePopup(false);
      return;
    }
    if (props.selectedLabel.ids.size > 0) {
      setShowDeletePopup(true);
      setShowEditPopover(false);
    } else {
      deleteLabel();
    }
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
    // If the selection changes, close the edit/delete popovers.
    setShowEditPopover(false);
    setShowDeletePopup(false);
  }, [props.selectedLabelIdx]);

  // A small popup that appears when you press the edit button.
  const editPopoverContents = (
    <FlexColumn style={{ width: "250px" }} $gap={10}>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Name</span>
        <Input
          value={editPopoverNameInput}
          onChange={(e) => setEditPopoverNameInput(e.target.value)}
          onPressEnter={onClickEditSave}
          ref={editPopoverInputRef}
        ></Input>
      </label>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Color</span>
        <div>
          <ColorPicker
            size="small"
            value={new AntdColor(props.selectedLabel.color.getHexString())}
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
    <FlexRow $gap={6}>
      <Tooltip title="Create new label" placement="top">
        <IconButton onClick={onClickCreateNewLabel} type="outlined">
          <TagAddIconSVG />
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
          <Tooltip title="Edit label" placement="top">
            <IconButton onClick={onClickEditButton} type={showEditPopover ? "primary" : "outlined"}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
        </div>
      </Popover>
      <Popconfirm
        title={`Delete label with ${props.selectedLabel.ids.size} object(s)?`}
        description={"This cannot be undone."}
        onOpenChange={onDeletePopupOpenChange}
        open={showDeletePopup}
        onConfirm={deleteLabel}
        onCancel={() => setShowDeletePopup(false)}
        placement="bottom"
        getPopupContainer={() => editPopoverContainerRef.current!}
      >
        <Tooltip title="Delete label" placement="top">
          <IconButton type="outlined">
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </Popconfirm>

      <label style={{ display: "flex", flexDirection: "row", gap: "6px", marginLeft: "8px" }}>
        <span style={{ fontSize: theme.font.size.label }}>Apply to </span>
        <Radio.Group
          style={{ display: "flex", flexDirection: "row" }}
          value={props.selectionMode}
          onChange={(e) => props.setSelectionMode(e.target.value)}
        >
          <Tooltip trigger={["hover", "focus"]} title="Apply only at the current time" placement="top">
            <Radio.Button value={AnnotationSelectionMode.TIME}>Time</Radio.Button>
          </Tooltip>
          <Tooltip trigger={["hover", "focus"]} title="Apply to entire track" placement="top">
            <Radio.Button value={AnnotationSelectionMode.TRACK}>Track</Radio.Button>
          </Tooltip>
        </Radio.Group>
      </label>
    </FlexRow>
  );
}
