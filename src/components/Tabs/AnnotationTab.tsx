import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Table, TableProps } from "antd";
import React, { ReactElement, useMemo } from "react";

import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../styles/utils";

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

const tableColumns: TableProps<TableDataType>["columns"] = [
  { title: "Object ID", dataIndex: "id", key: "id", sorter: (a, b) => a.id - b.id },
  { title: "Track ID", dataIndex: "track", key: "track", sorter: (a, b) => a.track - b.track },
  { title: "Time", dataIndex: "time", key: "time", sorter: (a, b) => a.time - b.time },
  { title: "Action", key: "action", render: () => <a>Delete</a> },
];

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
  } = props.annotationState;

  const labels = getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number) => {};

  const onCreateNewLabel = () => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = () => {};

  const onClickObjectRow = (id: number) => {};

  const onClickDeleteObjectRow = (id: number) => {};

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
        <p>label name: {selectedLabel?.name}</p>
        <p>label idx: {currentLabelIdx}</p>
        <p>version: {annotationDataVersion}</p>
        <IconButton onClick={onCreateNewLabel}>
          <PlusOutlined />
        </IconButton>
        <IconButton>
          <DeleteOutlined />
        </IconButton>
      </FlexRowAlignCenter>
      <div style={{ width: "100%" }}>
        <Table dataSource={tableData} columns={tableColumns}></Table>
      </div>
    </FlexColumnAlignCenter>
  );
}
