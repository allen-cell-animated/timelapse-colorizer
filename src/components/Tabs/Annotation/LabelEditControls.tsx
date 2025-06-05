import { CloseCircleFilled, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Popconfirm, Popover, Radio, Tooltip } from "antd";
import React, { PropsWithChildren, ReactElement, useContext, useEffect, useRef, useState } from "react";

import { TagAddIconSVG } from "../../../assets";
import { AnnotationSelectionMode } from "../../../colorizer";
import { StyledRadioGroup } from "../../../styles/components";

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
  onCreateNewLabel: (options: Partial<LabelOptions>) => void;
  onDeleteLabel: () => void;
  setLabelOptions: (options: Partial<LabelOptions>) => void;
  defaultLabelOptions: LabelOptions;
  selectedLabel: LabelData;
  selectedLabelIdx: number;
  selectionMode: AnnotationSelectionMode;
  setSelectionMode: (mode: AnnotationSelectionMode) => void;
};

export default function LabelEditControls(props: PropsWithChildren<LabelEditControlsProps>): ReactElement {
  const theme = useContext(AppThemeContext);

  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const createPopoverContainerRef = useRef<HTMLDivElement>(null);

  const [showEditPopover, setShowEditPopover] = useState(false);
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const savedLabelOptions = useRef<Partial<LabelOptions> | null>(null);

  // Edit button popover handlers

  const onClickEditButton = (): void => {
    setShowEditPopover(!showEditPopover);
    savedLabelOptions.current = {
      color: props.selectedLabel.options.color.clone(),
      name: props.selectedLabel.options.name,
    };
  };

  const onClickEditCancel = (): void => {
    setShowEditPopover(false);
    // Restore saved label options
    if (savedLabelOptions.current) {
      props.setLabelOptions(savedLabelOptions.current);
    }
  };

  const onClickEditSave = (options: Partial<LabelOptions>): void => {
    props.setLabelOptions(options);
    setShowEditPopover(false);
  };

  // Create button popover handlers

  const onClickCreateButton = (): void => {
    setShowCreatePopover(!showCreatePopover);
    setShowEditPopover(false);
    setShowDeletePopup(false);
  };

  // Delete button popover handlers

  const deleteLabel = (): void => {
    props.onDeleteLabel();
    setShowDeletePopup(false);
  };

  const onClickDeleteButton = (): void => {
    if (props.selectedLabel.ids.size > 0) {
      // Ask for confirmation only if there are selected objects.
      setShowDeletePopup(!showDeletePopup);
      setShowCreatePopover(false);
      setShowEditPopover(false);
    } else {
      deleteLabel();
    }
  };

  /**
   * Popovers can report when a user has clicked off of them.
   * This creates a handler that will close the popover when the user clicks outside of it.
   */
  const createOpenChangeHandler = (setOpen: (open: boolean) => void) => {
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
    <>
      <label style={{ display: "flex", flexDirection: "row", gap: "6px", marginLeft: "8px" }}>
        <span style={{ fontSize: theme.font.size.label, width: "max-content" }}>Select by </span>
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
          <TooltipWithSubtitle
            trigger={["hover", "focus"]}
            title="Selects entire track"
            subtitle="(Hold Shift to select a range)"
            placement="top"
          >
            <Radio.Button value={AnnotationSelectionMode.TRACK}>Track</Radio.Button>
          </TooltipWithSubtitle>
        </StyledRadioGroup>
      </label>
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
        onOpenChange={createOpenChangeHandler(setShowCreatePopover)}
        getPopupContainer={() => createPopoverContainerRef.current!}
        destroyTooltipOnHide={true}
      >
        <div ref={createPopoverContainerRef}>
          <Tooltip title="Create new annotation" placement="top">
            <IconButton onClick={onClickCreateButton} type={showCreatePopover ? "primary" : "outlined"}>
              <TagAddIconSVG />
            </IconButton>
          </Tooltip>
        </div>
      </Popover>
      {props.children}
      <Popover
        title={<p style={{ fontSize: theme.font.size.label }}>Edit annotation</p>}
        trigger={["click"]}
        placement="bottom"
        content={
          <CreateLabelForm
            initialLabelOptions={props.selectedLabel.options}
            onConfirm={onClickEditSave}
            onCancel={onClickEditCancel}
            // Sync label color with color picker. If operation is cancelled,
            // the color will be reset to the original label color.
            onColorChanged={(color) => {
              props.setLabelOptions({ color });
            }}
            confirmText="Save"
            allowTypeSelection={false}
          />
        }
        open={showEditPopover}
        onOpenChange={createOpenChangeHandler(setShowEditPopover)}
        getPopupContainer={() => editPopoverContainerRef.current!}
        destroyTooltipOnHide={true}
      >
        <div ref={editPopoverContainerRef}>
          <Tooltip title="Edit annotation" placement="top">
            <IconButton onClick={onClickEditButton} type={showEditPopover ? "primary" : "outlined"}>
              <EditOutlined />
            </IconButton>
          </Tooltip>
        </div>
      </Popover>
      <Popconfirm
        title={`Delete annotation with ${props.selectedLabel.ids.size} object(s)?`}
        description={"This cannot be undone."}
        open={showDeletePopup}
        onOpenChange={createOpenChangeHandler(setShowDeletePopup)}
        okButtonProps={{ danger: true }}
        okText="Delete"
        icon={<CloseCircleFilled style={{ color: theme.color.text.error }} />}
        onConfirm={deleteLabel}
        onCancel={() => setShowDeletePopup(false)}
        placement="bottom"
        getPopupContainer={() => editPopoverContainerRef.current!}
      >
        <Tooltip title="Delete annotation" placement="top">
          <IconButton type="outlined" onClick={onClickDeleteButton}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </Popconfirm>
    </>
  );
}
