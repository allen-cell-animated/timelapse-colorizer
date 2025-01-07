import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, InputRef, Popconfirm, Popover, Table, TableProps, Tooltip } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import React, { ReactElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { Color, HexColorString } from "three";

import { TagAddIconSVG, TagIconSVG } from "../../assets";
import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../../styles/utils";
import { download } from "../../utils/file_io";

import { LabelData } from "../../colorizer/AnnotationData";
import { AppThemeContext } from "../AppStyle";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import IconButton from "../IconButton";

type AnnotationTabProps = {
  annotationState: AnnotationState;
  setTrackAndFrame: (track: number, frame: number) => void;
  dataset: Dataset | null;
};

type TableDataType = {
  key: string;
  id: number;
  track: number;
  time: number;
};

/**
 * Overrides the default button color with a green 'success' color
 * when the color type changes.
 */
const AnnotationModeButton = styled(Button)<{ $color: "success" | "default" }>`
  ${(props) => {
    if (props.$color === "success") {
      return css`
        background-color: var(--color-button-success-bg);
        border: 1px solid var(--color-button-success-bg);

        &&&&:hover {
          border: 1px solid var(--color-button-success-hover);
          background-color: var(--color-button-success-hover);
        }

        &&&&:active {
          background-color: var(--color-button-success-hover);
          border: 1px solid var(--color-button-success-bg);
        }
      `;
    }
    return;
  }}
`;

const StyledAntTable = styled(Table)`
  .ant-table-row {
    cursor: pointer;
  }

  &&&& .ant-table-cell {
    padding: 4px 8px;
  }
`;

export default function AnnotationTab(props: AnnotationTabProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const {
    isAnnotationModeEnabled,
    setIsAnnotationModeEnabled,
    currentLabelIdx,
    setCurrentLabelIdx,
    data: annotationData,
    createNewLabel,
    deleteLabel,
    setLabelName,
    setLabelColor,
    setLabelOnId,
  } = props.annotationState;

  const [showEditPopover, setShowEditPopover] = useState(false);
  const [editPopoverNameInput, setEditPopoverNameInput] = useState("");
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);
  const editPopoverInputRef = useRef<InputRef>(null);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const labels = annotationData.getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number): void => {
    props.annotationState.setCurrentLabelIdx(labelIdx);
    setShowEditPopover(false);
  };

  const onCreateNewLabel = (): void => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
    setShowEditPopover(false);
  };

  const onDeleteLabel = (): void => {
    if (currentLabelIdx !== null) {
      deleteLabel(currentLabelIdx);
    }
    setShowEditPopover(false);
    setShowDeleteConfirmation(false);
  };

  const onClickDeleteButton = (opening: boolean) => {
    if (!opening) {
      setShowDeleteConfirmation(false);
      return;
    }
    if (currentLabelIdx !== null && selectedLabel.ids.size > 0) {
      setShowDeleteConfirmation(true);
    } else {
      onDeleteLabel();
    }
  };

  const onClickObjectRow = (_event: React.MouseEvent<any, MouseEvent>, record: TableDataType): void => {
    props.setTrackAndFrame(record.track, record.time);
  };

  const onClickEditButton = (): void => {
    setShowEditPopover(!showEditPopover);
    setEditPopoverNameInput(selectedLabel?.name || "");
  };

  useEffect(() => {
    if (showEditPopover) {
      editPopoverInputRef.current?.focus();
    }
  }, [showEditPopover]);

  const onClickEditCancel = (): void => {
    setShowEditPopover(false);
  };

  const onClickEditSave = (): void => {
    if (currentLabelIdx !== null) {
      setLabelName(currentLabelIdx, editPopoverNameInput.trim());
    }
    setShowEditPopover(false);
  };

  const tableColumns: TableProps<TableDataType>["columns"] = [
    {
      title: "Object ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Track ID",
      dataIndex: "track",
      key: "track",
      sorter: (a, b) => a.track - b.track,
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      sorter: (a, b) => a.time - b.time,
    },
    // Column that contains a remove button for the ID.
    {
      title: "",
      key: "action",
      render: (_, record) => (
        <IconButton
          type="text"
          onClick={(event) => {
            // Rows have their own behavior on click (jumping to a timestamp),
            // so we need to stop event propagation so that the row click event
            // doesn't fire.
            event.stopPropagation();
            setLabelOnId(currentLabelIdx!, record.id, false);
          }}
        >
          <CloseOutlined />
          <VisuallyHidden>
            Remove ID {record.id} (track {record.track})
          </VisuallyHidden>
        </IconButton>
      ),
    },
  ];

  const tableData: TableDataType[] = useMemo(() => {
    const dataset = props.dataset;
    if (currentLabelIdx !== null && dataset) {
      const ids = annotationData.getLabeledIds(currentLabelIdx);
      return ids.map((id) => {
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        return { key: id.toString(), id, track, time };
      });
    }
    return [];
  }, [annotationData, currentLabelIdx, props.dataset]);

  // Options for the selection dropdown
  const selectLabelOptions: ItemType[] = labels.map((label, index) => {
    return {
      key: index.toString(),
      label: label.ids.size ? `${label.name} (${label.ids.size})` : label.name,
    };
  });

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
            value={new AntdColor(selectedLabel?.color.getHexString() || "ff00ff")}
            onChange={(_, hex) => {
              currentLabelIdx !== null && setLabelColor(currentLabelIdx, new Color(hex as HexColorString));
            }}
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
    <FlexColumnAlignCenter $gap={10}>
      {/* Top-level annotation edit toggle */}
      <FlexRow style={{ width: "100%", justifyContent: "space-between" }}>
        <FlexRow $gap={6}>
          <AnnotationModeButton
            type="primary"
            $color={isAnnotationModeEnabled ? "success" : "default"}
            style={{ paddingLeft: "10px" }}
            onClick={() => setIsAnnotationModeEnabled(!isAnnotationModeEnabled)}
          >
            <FlexRowAlignCenter $gap={6}>
              {isAnnotationModeEnabled ? <CheckOutlined /> : <TagIconSVG />}
              {isAnnotationModeEnabled ? "Done editing" : "Edit and apply labels"}
            </FlexRowAlignCenter>
          </AnnotationModeButton>
          {isAnnotationModeEnabled && (
            <p style={{ color: theme.color.text.hint }}>
              <i>Editing in progress; click any object to apply</i>
            </p>
          )}
        </FlexRow>
        <Button
          onClick={() => {
            const csvData = props.annotationState.data.toCsv(props.dataset!);
            download("annotations.csv", "data:text/csv;charset=utf-8," + encodeURIComponent(csvData));
            console.log(csvData);
          }}
        >
          Export as CSV
        </Button>
      </FlexRow>

      {/* Label selection and edit/create/delete buttons */}
      <FlexRow $gap={10} style={{ width: "100%" }}>
        <label style={{ gap: "5px" }}>
          <SelectionDropdown
            selected={(currentLabelIdx ?? -1).toString()}
            items={selectLabelOptions}
            onChange={function (key: string): void {
              const index = parseInt(key, 10);
              onSelectLabel(index);
            }}
            disabled={currentLabelIdx === null}
            showTooltip={false}
          ></SelectionDropdown>
        </label>
        <div>
          {/* TODO: Remove color picker once color dots can be added to the dropdowns. */}
          <ColorPicker
            size="small"
            value={new AntdColor(selectedLabel?.color.getHexString() || "ffffff")}
            onChange={(_, hex) => {
              currentLabelIdx !== null && setLabelColor(currentLabelIdx, new Color(hex as HexColorString));
            }}
            disabledAlpha={true}
            disabled={!isAnnotationModeEnabled}
          />
        </div>

        {/* Hide edit-related buttons until edit mode is enabled */}
        {isAnnotationModeEnabled && (
          <>
            <Tooltip title="Create new label" placement="bottom">
              <IconButton onClick={onCreateNewLabel} disabled={!isAnnotationModeEnabled} type="outlined">
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
                <Tooltip title="Edit label" placement="bottom">
                  <IconButton
                    disabled={currentLabelIdx === null || !isAnnotationModeEnabled}
                    onClick={onClickEditButton}
                    type={showEditPopover ? "primary" : "outlined"}
                  >
                    <EditOutlined />
                  </IconButton>
                </Tooltip>
              </div>
            </Popover>
            <Popconfirm
              title={`Delete label with ${selectedLabel.ids.size} object(s)?`}
              description={"This cannot be undone."}
              onOpenChange={onClickDeleteButton}
              open={showDeleteConfirmation}
              onConfirm={onDeleteLabel}
              onCancel={() => setShowDeleteConfirmation(false)}
              placement="bottom"
              getPopupContainer={() => editPopoverContainerRef.current!}
            >
              <Tooltip title="Delete label" placement="bottom">
                <IconButton disabled={currentLabelIdx === null || !isAnnotationModeEnabled} type="outlined">
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            </Popconfirm>
          </>
        )}
      </FlexRow>

      {/* Table */}
      <div style={{ width: "100%", marginTop: "10px" }}>
        <StyledAntTable
          dataSource={tableData}
          columns={tableColumns}
          size="small"
          pagination={false}
          // TODO: Rows aren't actually buttons, which means that they are not
          // keyboard accessible. Either find a way to make them tab indexable
          // or add a button that is equivalent to click?
          onRow={(record) => {
            return {
              onClick: (event) => {
                onClickObjectRow(event, record);
              },
            };
          }}
          locale={{
            emptyText: (
              <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0" }}>
                <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
                <p>No annotated IDs</p>
              </FlexColumnAlignCenter>
            ),
          }}
        ></StyledAntTable>
      </div>
      <p style={{ color: theme.color.text.hint }}>Click a row to jump to that object.</p>
    </FlexColumnAlignCenter>
  );
}
