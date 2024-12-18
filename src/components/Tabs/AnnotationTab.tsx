import { CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Color as AntdColor } from "@rc-component/color-picker";
import { Button, ColorPicker, Input, Popover, Table, TableProps, Tooltip } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import React, { ReactElement, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color, HexColorString } from "three";

import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../../styles/utils";

import { LabelData } from "../../colorizer/AnnotationData";
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
`;

export default function AnnotationTab(props: AnnotationTabProps): ReactElement {
  const {
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

  const labels = getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number) => {
    props.annotationState.setCurrentLabelIdx(labelIdx);
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

  const onCreateNewLabel = () => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = () => {
    if (currentLabelIdx !== null) {
      deleteLabel(currentLabelIdx);
    }
  };

  const onClickObjectRow = (_event: React.MouseEvent<any, MouseEvent>, record: TableDataType) => {
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
      label: label.name,
      icon: <span style={{ color: "#" + label.color.getHexString() }}>⬤</span>,
    };
  });

  const onClickEditButton = () => {
    setShowEditPopover(true);
    setEditPopoverNameInput(selectedLabel?.name || "");
  };

  const onClickEditCancel = () => {
    setShowEditPopover(false);
  };

  const onClickEditSave = () => {
    if (currentLabelIdx !== null) {
      setLabelName(currentLabelIdx, editPopoverNameInput);
    }
    setShowEditPopover(false);
  };

  const editPopoverContents = (
    <FlexColumn style={{ width: "250px" }} $gap={10}>
      <label style={{ gap: "10px", display: "flex", flexDirection: "row" }}>
        <span>Name</span>
        <Input value={editPopoverNameInput} onChange={(e) => setEditPopoverNameInput(e.target.value)}></Input>
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
      <FlexRowAlignCenter $gap={10}>
        <div>
          <ColorPicker
            size="small"
            value={new AntdColor(selectedLabel?.color.getHexString() || "ffffff")}
            onChange={(_, hex) => {
              currentLabelIdx !== null && setLabelColor(currentLabelIdx, new Color(hex as HexColorString));
            }}
            disabledAlpha={true}
          />
        </div>
        <SelectionDropdown
          selected={(currentLabelIdx ?? -1).toString()}
          items={selectLabelOptions}
          onChange={function (key: string): void {
            const index = parseInt(key, 10);
            onSelectLabel(index);
          }}
        ></SelectionDropdown>
        <Tooltip title="Create new label" placement="bottom">
          <IconButton onClick={onCreateNewLabel}>
            <PlusOutlined />
          </IconButton>
        </Tooltip>
        {/* TODO: Show confirmation popup before deleting. */}
        <Tooltip title="Delete label" placement="bottom">
          <IconButton onClick={onDeleteLabel} disabled={currentLabelIdx === null}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
        <Popover
          placement="bottom"
          content={editPopoverContents}
          open={showEditPopover}
          getPopupContainer={() => editPopoverContainerRef.current!}
          style={{ zIndex: "1000" }}
        >
          <div ref={editPopoverContainerRef}>
            <Tooltip title="Edit label" placement="bottom">
              <IconButton disabled={currentLabelIdx === null} onClick={onClickEditButton}>
                <EditOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </Popover>
      </FlexRowAlignCenter>
      <div style={{ width: "100%" }}>
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
        ></StyledAntTable>
      </div>
    </FlexColumnAlignCenter>
  );
}
