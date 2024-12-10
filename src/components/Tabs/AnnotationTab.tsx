import { CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Table, TableProps } from "antd";
import React, { ReactElement, useMemo } from "react";
import styled from "styled-components";

import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter, VisuallyHidden } from "../../styles/utils";

import { LabelData } from "../../colorizer/AnnotationData";
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
    getIdsByLabelIdx,
    setLabelName,
    removeLabelFromId,
  } = props.annotationState;

  const labels = getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number) => {};

  function makeLabelButtonRenderer(key: keyof TableDataType): (_text: string, record: TableDataType) => ReactElement {
    return (_text: string, record: TableDataType) => (
      <Button
        type="text"
        onClick={() => {
          props.setTrackAndFrame(record.track, record.time);
        }}
      >
        {record[key]}
      </Button>
    );
  }

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
      const ids = getIdsByLabelIdx(currentLabelIdx);
      return ids.map((id) => {
        const track = dataset.getTrackId(id);
        const time = dataset.getTime(id);
        return { key: id.toString(), id, track, time };
      });
    }
    return [];
  }, [annotationDataVersion, currentLabelIdx, props.dataset]);

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRowAlignCenter $gap={10}>
        <Input
          onChange={(event) => {
            currentLabelIdx !== null && setLabelName(currentLabelIdx, event.target.value || "");
          }}
          value={selectedLabel?.name}
        ></Input>
        <p>label idx: {currentLabelIdx}</p>
        <p>version: {annotationDataVersion}</p>
        <IconButton onClick={onCreateNewLabel}>
          <PlusOutlined />
        </IconButton>
        <IconButton onClick={onDeleteLabel}>
          <DeleteOutlined />
        </IconButton>
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
