import { CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined, TagOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, InputRef, Popover, Switch, Table, TableProps, Tooltip } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import React, { ReactElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color, HexColorString } from "three";

import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, VisuallyHidden } from "../../styles/utils";

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
    getLabels,
    createNewLabel,
    deleteLabel,
    annotationDataVersion,
    getLabeledIds,
    setLabelName,
    setLabelColor,
    removeLabelFromId,
  } = props.annotationState;

  const [showEditPopover, setShowEditPopover] = useState(false);
  const [editPopoverNameInput, setEditPopoverNameInput] = useState("");
  const editPopoverContainerRef = useRef<HTMLDivElement>(null);
  const editPopoverInputRef = useRef<InputRef>(null);

  const labels = getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number): void => {
    props.annotationState.setCurrentLabelIdx(labelIdx);
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
    {
      title: "",
      key: "action",
      render: (_, record) => (
        <IconButton
          type="text"
          onClick={(event) => {
            event.stopPropagation();
            removeLabelFromId(currentLabelIdx!, record.id);
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

  const onCreateNewLabel = (): void => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = (): void => {
    if (currentLabelIdx !== null) {
      deleteLabel(currentLabelIdx);
    }
  };

  const onClickObjectRow = (_event: React.MouseEvent<any, MouseEvent>, record: TableDataType): void => {
    props.setTrackAndFrame(record.track, record.time);
  };

  const tableData: TableDataType[] = useMemo(() => {
    const dataset = props.dataset;
    if (currentLabelIdx !== null && dataset) {
      const ids = getLabeledIds(currentLabelIdx);
      return ids.map((id) => {
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        return { key: id.toString(), id, track, time };
      });
    }
    return [];
  }, [annotationDataVersion, currentLabelIdx, props.dataset]);

  const selectLabelOptions: ItemType[] = labels.map((label, index) => {
    return {
      key: index.toString(),
      label: label.ids.size ? `${label.name} (${label.ids.size})` : label.name,
      icon: <span style={{ color: "#" + label.color.getHexString() }}>⬤</span>,
    };
  });

  const onClickEditButton = (): void => {
    setShowEditPopover(true);
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
      setLabelName(currentLabelIdx, editPopoverNameInput);
    }
    setShowEditPopover(false);
  };

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
      <div style={{ width: "100%" }}>
        <label style={{ gap: "5px" }}>
          <span style={{ fontSize: theme.font.size.label }}>Edit annotations</span>
          <Switch checked={isAnnotationModeEnabled} onChange={setIsAnnotationModeEnabled} />
        </label>
      </div>
      <FlexRow $gap={10} style={{ width: "100%" }}>
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

        <Tooltip title="Create new label" placement="bottom">
          <IconButton onClick={onCreateNewLabel} disabled={!isAnnotationModeEnabled}>
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
              <IconButton disabled={currentLabelIdx === null || !isAnnotationModeEnabled} onClick={onClickEditButton}>
                <EditOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </Popover>
        {/* TODO: Show confirmation popup before deleting. */}
        <Tooltip title="Delete label" placement="bottom">
          <IconButton onClick={onDeleteLabel} disabled={currentLabelIdx === null || !isAnnotationModeEnabled}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </FlexRow>
      <div style={{ width: "100%", marginTop: "10px" }}>
        <StyledAntTable
          dataSource={tableData}
          columns={tableColumns}
          size="small"
          pagination={false}
          onRow={(record) => {
            return {
              onClick: (event) => {
                onClickObjectRow(event, record);
              },
            };
          }}
          locale={{
            emptyText: (
              <FlexColumnAlignCenter>
                <span style={{ fontSize: "24px", marginBottom: 0 }}>
                  <TagOutlined />
                </span>
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
