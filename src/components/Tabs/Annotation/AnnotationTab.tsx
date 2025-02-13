import { MenuOutlined, TableOutlined } from "@ant-design/icons";
import { Radio, Tooltip } from "antd";
import React, { ReactElement, useCallback, useMemo, useState, useTransition } from "react";
import { Color } from "three";

import { AnnotationSelectionMode, Dataset, Track } from "../../../colorizer";
import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { StyledRadioGroup } from "../../../styles/components";
import { FlexColumnAlignCenter, FlexRow, VisuallyHidden } from "../../../styles/utils";
import { download } from "../../../utils/file_io";
import { SelectItem } from "../../Dropdowns/types";

import { LabelData } from "../../../colorizer/AnnotationData";
import TextButton from "../../Buttons/TextButton";
import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LoadingSpinner from "../../LoadingSpinner";
import AnnotationDisplayList from "./AnnotationDisplayList";
import AnnotationTable, { TableDataType } from "./AnnotationDisplayTable";
import AnnotationModeButton from "./AnnotationModeButton";
import LabelEditControls from "./LabelEditControls";

const LABEL_DROPDOWN_LABEL_ID = "label-dropdown-label";
const enum AnnotationViewType {
  TABLE,
  LIST,
}

type AnnotationTabProps = {
  annotationState: AnnotationState;
  setFrame: (frame: number) => Promise<void>;
  setTrack: (track: number) => void;
  selectedTrack: Track | null;
  dataset: Dataset | null;
  frame: number;
  hoveredId: number | null;
};

export default function AnnotationTab(props: AnnotationTabProps): ReactElement {
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
    setLabelOnIds,
  } = props.annotationState;

  const [isPending, startTransition] = useTransition();
  const [viewType, setViewType] = useState<AnnotationViewType>(AnnotationViewType.LIST);

  const labels = annotationData.getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];
  const selectedId = useMemo(() => {
    return props.selectedTrack?.getIdAtTime(props.frame) ?? -1;
  }, [props.frame, props.selectedTrack]);

  // Highlight the range of IDs that will be selected in range mode.
  const highlightedIds = useMemo(() => {
    if (
      props.annotationState.selectionMode === AnnotationSelectionMode.RANGE &&
      props.hoveredId !== null &&
      props.dataset
    ) {
      return props.annotationState.getSelectRangeFromId(props.dataset, props.hoveredId);
    }
    return null;
  }, [props.hoveredId, props.dataset, props.annotationState.selectionMode, props.annotationState.getSelectRangeFromId]);

  const onSelectLabelIdx = (idx: string): void => {
    startTransition(() => {
      props.annotationState.setCurrentLabelIdx(parseInt(idx, 10));
    });
  };

  const onCreateNewLabel = (): void => {
    const index = createNewLabel();
    setCurrentLabelIdx(index);
  };

  const onDeleteLabel = useCallback(() => {
    if (currentLabelIdx !== null) {
      startTransition(() => {
        deleteLabel(currentLabelIdx);
      });
    }
  }, [currentLabelIdx]);

  const onClickObjectRow = useCallback(
    (record: TableDataType): void => {
      props.setTrack(record.track);
      props.setFrame(record.time);
    },
    [props.setTrack, props.setFrame]
  );

  const onClickDeleteObject = useCallback(
    (record: TableDataType): void => {
      if (currentLabelIdx !== null) {
        setLabelOnIds(currentLabelIdx, [record.id], false);
      }
    },
    [currentLabelIdx, setLabelOnIds]
  );

  // Options for the selection dropdown
  const selectLabelOptions: SelectItem[] = useMemo(
    () =>
      labels.map((label, index) => ({
        value: index.toString(),
        label: label.ids.size ? `${label.name} (${label.ids.size})` : label.name,
        color: label.color,
      })),
    [annotationData]
  );

  const tableIds = useMemo(() => {
    return currentLabelIdx !== null ? annotationData.getLabeledIds(currentLabelIdx) : [];
  }, [currentLabelIdx, annotationData]);

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRow style={{ width: "100%", justifyContent: "space-between" }}>
        <AnnotationModeButton
          active={isAnnotationModeEnabled}
          onClick={() => setIsAnnotationModeEnabled(!isAnnotationModeEnabled)}
        />

        <TextButton
          onClick={() => {
            const csvData = props.annotationState.data.toCsv(props.dataset!);
            download("annotations.csv", "data:text/csv;charset=utf-8," + encodeURIComponent(csvData));
            console.log(csvData);
          }}
        >
          Export CSV
        </TextButton>
      </FlexRow>

      {/* Label selection and edit/create/delete buttons */}
      <FlexRow $gap={6} style={{ width: "100%" }}>
        <FlexRow $gap={6}>
          <VisuallyHidden id={LABEL_DROPDOWN_LABEL_ID}>Current label</VisuallyHidden>
          <SelectionDropdown
            selected={(currentLabelIdx ?? -1).toString()}
            items={selectLabelOptions}
            onChange={onSelectLabelIdx}
            disabled={currentLabelIdx === null}
            showSelectedItemTooltip={false}
            htmlLabelId={LABEL_DROPDOWN_LABEL_ID}
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
              selectionMode={props.annotationState.selectionMode}
              setSelectionMode={props.annotationState.setSelectionMode}
            />
          )}
        </FlexRow>

        {/* View mode selection */}
        <label>
          <VisuallyHidden>View mode</VisuallyHidden>
          <StyledRadioGroup
            style={{ display: "flex", flexDirection: "row" }}
            value={viewType}
            onChange={(e) => startTransition(() => setViewType(e.target.value))}
          >
            <Tooltip trigger={["hover", "focus"]} title="Table view" placement="top">
              <Radio.Button value={AnnotationViewType.TABLE} style={{ padding: "2px 6px 2px 7px" }}>
                <TableOutlined style={{ fontSize: 18 }} />
                <VisuallyHidden>Table view {viewType === AnnotationViewType.TABLE ? "(selected)" : ""}</VisuallyHidden>
              </Radio.Button>
            </Tooltip>
            <Tooltip trigger={["hover", "focus"]} title="List view" placement="top">
              <Radio.Button value={AnnotationViewType.LIST} style={{ padding: "2px 7px 2px 6px" }}>
                <MenuOutlined style={{ fontSize: 18 }} />
                <VisuallyHidden>List view {viewType === AnnotationViewType.LIST ? "(selected)" : ""}</VisuallyHidden>
              </Radio.Button>
            </Tooltip>
          </StyledRadioGroup>
        </label>
      </FlexRow>

      {/* Table or list view */}
      <LoadingSpinner loading={isPending}>
        <div
          style={{
            width: "100%",
            marginTop: "10px",
            visibility: viewType === AnnotationViewType.TABLE ? "visible" : "collapse",
            display: viewType === AnnotationViewType.TABLE ? "block" : "none",
          }}
        >
          <AnnotationTable
            onClickObjectRow={onClickObjectRow}
            onClickDeleteObject={onClickDeleteObject}
            dataset={props.dataset}
            ids={tableIds}
            height={480}
            selectedId={selectedId}
          />
        </div>
        {/*
         * AnnotationDisplayList has some internal optimizations for fetching track data.
         * Changing visibility/display instead of removing it from the DOM keeps
         * its internal state.
         */}
        <div
          style={{
            width: "100%",
            marginTop: "10px",
            visibility: viewType === AnnotationViewType.LIST ? "visible" : "collapse",
            display: viewType === AnnotationViewType.LIST ? "block" : "none",
          }}
        >
          <AnnotationDisplayList
            onClickObjectRow={onClickObjectRow}
            onClickDeleteObject={onClickDeleteObject}
            onClickTrack={props.setTrack}
            setFrame={props.setFrame}
            dataset={props.dataset}
            ids={tableIds}
            highlightRange={highlightedIds}
            lastClickedId={props.annotationState.lastClickedId}
            selectedTrack={props.selectedTrack}
            selectedId={selectedId}
            frame={props.frame}
            labelColor={selectedLabel?.color}
          ></AnnotationDisplayList>
        </div>
      </LoadingSpinner>
    </FlexColumnAlignCenter>
  );
}
