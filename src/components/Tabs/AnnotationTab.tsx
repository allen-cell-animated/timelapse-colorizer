import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Table } from "antd";
import React, { ReactElement } from "react";

import { Dataset } from "../../colorizer";
import { AnnotationState } from "../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../styles/utils";

import IconButton from "../IconButton";

type AnnotationTabProps = {
  annotationState: AnnotationState;
  setTrackAndFrame: (track: number, frame: number) => void;
  dataset: Dataset | null;
};

type TableDataType = {
  key: string;
};

export default function AnnotationTab(props: AnnotationTabProps): ReactElement {
  const {
    currentLabelIdx,
    setCurrentLabelIdx,
    getLabels,
    createNewLabel,
    deleteLabel,
    getIdsByLabelIdx,
    setLabelName,
  } = props.annotationState;

  const labels = getLabels();
  const selectedLabel = labels[currentLabelIdx ?? -1];

  const onSelectLabel = (labelIdx: number) => {};

  const onCreateNewLabel = () => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = () => {};

  const onClickObjectRow = (id: number) => {};

  const onClickDeleteObjectRow = (id: number) => {};

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRowAlignCenter $gap={10}>
        <IconButton onClick={onCreateNewLabel}>
          <PlusOutlined />
        </IconButton>
        <IconButton>
          <DeleteOutlined />
        </IconButton>
      </FlexRowAlignCenter>
      <div style={{ width: "100%" }}>
        <Table></Table>
      </div>
    </FlexColumnAlignCenter>
  );
}
