import { Button } from "antd";
import React, { ReactElement, useContext, useMemo } from "react";
import { Color } from "three";

import { Dataset } from "../../../colorizer";
import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRow } from "../../../styles/utils";
import { download } from "../../../utils/file_io";

import { LabelData } from "../../../colorizer/AnnotationData";
import { AppThemeContext } from "../../AppStyle";
import SelectionDropdown, { SelectItem } from "../../Dropdowns/SelectionDropdown";
import AnnotationTable, { TableDataType } from "./AnnotationDisplayTable";
import AnnotationModeButton from "./AnnotationModeButton";
import LabelEditControls from "./LabelEditControls";

type AnnotationTabProps = {
  annotationState: AnnotationState;
  setTrackAndFrame: (track: number, frame: number) => void;
  dataset: Dataset | null;
};

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

  const labels = annotationData.getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];

  const onSelectLabelIdx = (idx: string): void => {
    props.annotationState.setCurrentLabelIdx(parseInt(idx, 10));
  };

  const onCreateNewLabel = (): void => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = (): void => {
    if (currentLabelIdx !== null) {
      deleteLabel(currentLabelIdx);
    }
  };

  const onClickObjectRow = (record: TableDataType): void => {
    props.setTrackAndFrame(record.track, record.time);
  };

  const onClickDeleteObject = (record: TableDataType): void => {
    if (currentLabelIdx) {
      setLabelOnId(record.id, currentLabelIdx, false);
    }
  };

  // Options for the selection dropdown
  const selectLabelOptions: SelectItem[] = labels.map((label, index) => {
    return {
      value: index.toString(),
      label: label.ids.size ? `${label.name} (${label.ids.size})` : label.name,
      color: label.color,
    };
  });

  const tableIds = useMemo(() => {
    return currentLabelIdx !== null ? annotationData.getLabeledIds(currentLabelIdx) : [];
  }, [annotationData]);

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRow style={{ width: "100%", justifyContent: "space-between" }}>
        <AnnotationModeButton
          active={isAnnotationModeEnabled}
          onClick={() => setIsAnnotationModeEnabled(!isAnnotationModeEnabled)}
        />
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
        <SelectionDropdown
          selected={(currentLabelIdx ?? -1).toString()}
          items={selectLabelOptions}
          onChange={onSelectLabelIdx}
          disabled={currentLabelIdx === null}
          showSelectedItemTooltip={false}
        ></SelectionDropdown>

        {/*
         * Hide edit-related buttons until edit mode is enabled.
         * Note that currentLabelIdx will never be null when edit mode is enabled.
         */}
        {isAnnotationModeEnabled && currentLabelIdx !== null && (
          <LabelEditControls
            onCreateNewLabel={onCreateNewLabel}
            onDeleteLabel={onDeleteLabel}
            setLabelColor={(color: Color) => setLabelColor(currentLabelIdx, color)}
            setLabelName={(name: string) => setLabelName(currentLabelIdx, name)}
            selectedLabel={selectedLabel}
            selectedLabelIdx={currentLabelIdx}
          />
        )}
      </FlexRow>

      {/* Table */}
      <div style={{ width: "100%", marginTop: "10px" }}>
        <AnnotationTable
          onClickObjectRow={onClickObjectRow}
          onClickDeleteObject={onClickDeleteObject}
          dataset={props.dataset}
          ids={tableIds}
          height={395}
        />
      </div>
      {tableIds.length > 0 && <p style={{ color: theme.color.text.hint }}>Click a row to jump to that object.</p>}
    </FlexColumnAlignCenter>
  );
}
