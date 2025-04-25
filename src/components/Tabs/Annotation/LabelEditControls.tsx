import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Popconfirm, Popover, Radio, Tooltip } from "antd";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Color } from "three";

import { TagAddIconSVG } from "../../../assets";
import { AnnotationSelectionMode } from "../../../colorizer";
import { StyledRadioGroup } from "../../../styles/components";
import { FlexRow } from "../../../styles/utils";

import { DEFAULT_ANNOTATION_LABEL_COLORS, LabelData, LabelOptions } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import IconButton from "../../IconButton";
import { TooltipWithSubtitle } from "../../Tooltips/TooltipWithSubtitle";
import CreateLabelForm from "./CreateLabelForm";

export const DEFAULT_LABEL_COLOR_PRESETS = [
  {
    label: "Presets",
    colors: DEFAULT_ANNOTATION_LABEL_COLORS,
  },
];

type LabelEditControlsProps = {
  onCreateNewLabel: (options: LabelOptions) => void;
  onDeleteLabel: () => void;
  setLabelColor: (color: Color) => void;
  setLabelName: (name: string) => void;
  defaultLabelOptions: LabelOptions;
  selectedLabel: LabelData;
  selectedLabelIdx: number;
  selectionMode: AnnotationSelectionMode;
  setSelectionMode: (mode: AnnotationSelectionMode) => void;
};

export default function LabelEditControls(props: LabelEditControlsProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const createPopoverContainerRef = useRef<HTMLDivElement>(null);
  const [showEditPopover, setShowEditPopover] = useState(false);
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const savedLabelOptions = useRef<LabelOptions | null>(null);

  // Edit button popover handlers

  const onClickEditButton = (): void => {
    setShowEditPopover(!showEditPopover);
    savedLabelOptions.current = {
      color: props.selectedLabel.color.clone(),
      name: props.selectedLabel.name,
    };
  };

  const onClickEditCancel = (): void => {
    setShowEditPopover(false);
    // Restore saved label options
    if (savedLabelOptions.current) {
      props.setLabelName(savedLabelOptions.current.name);
      props.setLabelColor(savedLabelOptions.current.color);
    }
  };

  const onClickEditSave = (options: LabelOptions): void => {
    props.setLabelName(options.name);
    setShowEditPopover(false);
  };

  // Create button popover handlers

  const onClickCreateButton = (): void => {
    setShowCreatePopover(!showCreatePopover);
  };

  // Delete button popover handlers

  const deleteLabel = (): void => {
    props.onDeleteLabel();
    setShowDeletePopup(false);
  };

  const onClickDeleteButton = (): void => {
    if (props.selectedLabel.ids.size > 0) {
      // Ask for confirmation only if there are selected objects.
      setShowDeletePopup(true);
    } else {
      deleteLabel();
    }
  };

  /**
   * Popovers can report when a user has clicked off of them.
   * This creates a handler that will close the popover when the user clicks outside of it.
   */
  const hideOnOpenChange = (setOpen: (open: boolean) => void) => {
    return (open: boolean) => {
      if (!open) setOpen(false);
    };
  };

  useEffect(() => {
    // If the selection changes, close the popovers.
    setShowCreatePopover(false);
    setShowEditPopover(false);
    setShowDeletePopup(false);
  }, [props.selectedLabelIdx]);

  return (
    <FlexRow $gap={6}>
      <Popover
        title={<p style={{ fontSize: theme.font.size.label }}>Create label</p>}
        trigger={["click"]}
        placement="bottom"
        content={
          <CreateLabelForm
            initialLabelOptions={props.defaultLabelOptions}
            onConfirm={props.onCreateNewLabel}
            onCancel={() => setShowCreatePopover(false)}
            confirmText="Create"
          />
        }
        open={showCreatePopover}
        onOpenChange={hideOnOpenChange(setShowCreatePopover)}
        getPopupContainer={() => createPopoverContainerRef.current!}
        style={{ zIndex: "1000" }}
      >
        <div ref={createPopoverContainerRef}>
          <Tooltip title="Create new label" placement="top">
            <IconButton onClick={onClickCreateButton} type="outlined">
              <TagAddIconSVG />
            </IconButton>
          </Tooltip>
        </div>
      </Popover>
      <Popover
        title={<p style={{ fontSize: theme.font.size.label }}>Edit label</p>}
        trigger={["click"]}
        placement="bottom"
        content={
          <CreateLabelForm
            initialLabelOptions={props.selectedLabel}
            onConfirm={onClickEditSave}
            onCancel={onClickEditCancel}
            // Sync label color with color picker. If operation is cancelled,
            // the color will be reset to the original label color.
            onColorChanged={props.setLabelColor}
            confirmText="Save"
          />
        }
        open={showEditPopover}
        onOpenChange={hideOnOpenChange(setShowEditPopover)}
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
        open={showDeletePopup}
        onOpenChange={hideOnOpenChange(setShowDeletePopup)}
        onConfirm={deleteLabel}
        onCancel={() => setShowDeletePopup(false)}
        placement="bottom"
        getPopupContainer={() => editPopoverContainerRef.current!}
      >
        <Tooltip title="Delete label" placement="top">
          <IconButton type="outlined" onClick={onClickDeleteButton}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </Popconfirm>

      <label style={{ display: "flex", flexDirection: "row", gap: "6px", marginLeft: "8px" }}>
        <span style={{ fontSize: theme.font.size.label }}>Select by </span>
        <StyledRadioGroup
          style={{ display: "flex", flexDirection: "row" }}
          value={props.selectionMode}
          onChange={(e) => props.setSelectionMode(e.target.value)}
        >
          <TooltipWithSubtitle
            trigger={["hover", "focus"]}
            title="Select a single timepoint"
            subtitle="(Hold Shift to select a range)"
            placement="top"
            autoAdjustOverflow={false}
          >
            <Radio.Button value={AnnotationSelectionMode.TIME}>Time</Radio.Button>
          </TooltipWithSubtitle>
          <Tooltip
            trigger={["hover", "focus"]}
            title="Selects range between two timepoints in a track"
            autoAdjustOverflow={false}
            placement="top"
          >
            <Radio.Button value={AnnotationSelectionMode.RANGE}>Range</Radio.Button>
          </Tooltip>
          <Tooltip trigger={["hover", "focus"]} title="Selects entire track" placement="top">
            <Radio.Button value={AnnotationSelectionMode.TRACK}>Track</Radio.Button>
          </Tooltip>
        </StyledRadioGroup>
      </label>
    </FlexRow>
  );
}
