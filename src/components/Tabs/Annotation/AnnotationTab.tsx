import { MenuOutlined, TableOutlined } from "@ant-design/icons";
import { Modal, Radio, Tooltip } from "antd";
import React, { ReactElement, useCallback, useMemo, useState, useTransition } from "react";
import { useShallow } from "zustand/shallow";

import { AnnotationSelectionMode } from "../../../colorizer";
import { AnnotationState } from "../../../colorizer/utils/react_utils";
import { useViewerStateStore } from "../../../state";
import { StyledRadioGroup } from "../../../styles/components";
import { FlexColumnAlignCenter, FlexRow, VisuallyHidden } from "../../../styles/utils";
import { download } from "../../../utils/file_io";
import { SelectItem } from "../../Dropdowns/types";

import { LabelData, LabelOptions, LabelType } from "../../../colorizer/AnnotationData";
import { Z_INDEX_MODAL } from "../../AppStyle";
import TextButton from "../../Buttons/TextButton";
import SelectionDropdown from "../../Dropdowns/SelectionDropdown";
import LoadingSpinner from "../../LoadingSpinner";
import AnnotationDisplayList from "./AnnotationDisplayList";
import AnnotationTable, { TableDataType } from "./AnnotationDisplayTable";
import AnnotationImportButton from "./AnnotationImportButton";
import AnnotationModeButton from "./AnnotationModeButton";
import CreateLabelForm from "./CreateLabelForm";
import LabelEditControls from "./LabelEditControls";

const LABEL_DROPDOWN_LABEL_ID = "label-dropdown-label";
const enum AnnotationViewType {
  TABLE,
  LIST,
}

type AnnotationTabProps = {
  annotationState: AnnotationState;
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
    setLabelOptions,
    removeLabelOnIds,
  } = props.annotationState;

  const [isPending, startTransition] = useTransition();
  const [viewType, setViewType] = useState<AnnotationViewType>(AnnotationViewType.LIST);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  const store = useViewerStateStore(
    useShallow((state) => ({
      frame: state.currentFrame,
      dataset: state.dataset,
      setTrack: state.setTrack,
      setFrame: state.setFrame,
      selectedTrack: state.track,
    }))
  );

  const labels = annotationData.getLabels();
  const selectedLabel: LabelData | undefined = labels[currentLabelIdx ?? -1];
  const selectedId = useMemo(() => {
    return store.selectedTrack?.getIdAtTime(store.frame) ?? -1;
  }, [store.frame, store.selectedTrack]);

  // If range mode is enabled, highlight the range of IDs that would be selected
  // if the user clicks on the currently hovered ID.
  const highlightedIds = useMemo(() => {
    if (
      props.annotationState.selectionMode === AnnotationSelectionMode.RANGE &&
      props.hoveredId !== null &&
      store.dataset
    ) {
      return props.annotationState.getSelectRangeFromId(store.dataset, props.hoveredId);
    }
    return null;
  }, [props.hoveredId, store.dataset, props.annotationState.selectionMode, props.annotationState.getSelectRangeFromId]);

  const onClickEnableAnnotationMode = useCallback(() => {
    // If no labels are defined, prompt the user to create a new label
    // before enabling annotation mode.
    if (annotationData.getLabels().length === 0) {
      setShowCreateLabelModal(true);
    } else {
      setIsAnnotationModeEnabled(!isAnnotationModeEnabled);
    }
  }, [isAnnotationModeEnabled, annotationData]);

  const onSelectLabelIdx = (idx: string): void => {
    startTransition(() => {
      props.annotationState.setCurrentLabelIdx(parseInt(idx, 10));
    });
  };

  const onCreateNewLabel = (options: Partial<LabelOptions>): void => {
    const index = createNewLabel(options);
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
      const trackId = record.track;
      const track = store.dataset?.getTrack(trackId);
      if (track) {
        store.setTrack(track);
        store.setFrame(record.time);
      }
    },
    [store.dataset, store.setTrack, store.setFrame]
  );

  const onClickDeleteObject = useCallback(
    (record: TableDataType): void => {
      if (currentLabelIdx !== null) {
        removeLabelOnIds(currentLabelIdx, [record.id]);
      }
    },
    [currentLabelIdx, removeLabelOnIds]
  );

  // Options for the selection dropdown
  const labelTypeToLabel: Record<LabelType, string> = {
    [LabelType.BOOLEAN]: "",
    [LabelType.INTEGER]: "I",
    [LabelType.CUSTOM]: "C",
  };

  const selectLabelOptions: SelectItem[] = useMemo(
    () =>
      labels.map((label, index) => ({
        value: index.toString(),
        label: label.ids.size ? `${label.options.name} (${label.ids.size})` : label.options.name,
        color: label.options.color,
        colorLabel: labelTypeToLabel[label.options.type],
      })),
    [annotationData]
  );

  const tableIds = useMemo(() => {
    return currentLabelIdx !== null ? annotationData.getLabeledIds(currentLabelIdx) : [];
  }, [currentLabelIdx, annotationData]);

  const labelSelectionDropdown = (
    <>
      <VisuallyHidden id={LABEL_DROPDOWN_LABEL_ID}>Current label</VisuallyHidden>
      <SelectionDropdown
        selected={(currentLabelIdx ?? -1).toString()}
        items={selectLabelOptions}
        onChange={onSelectLabelIdx}
        disabled={currentLabelIdx === null}
        showSelectedItemTooltip={false}
        htmlLabelId={LABEL_DROPDOWN_LABEL_ID}
      ></SelectionDropdown>
    </>
  );

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRow style={{ width: "100%", justifyContent: "space-between" }} ref={modalContainerRef}>
        <AnnotationModeButton active={isAnnotationModeEnabled} onClick={onClickEnableAnnotationMode} />

        {/* Appears when the user activates annotations for the first time and should define a label. */}
        <Modal
          open={showCreateLabelModal}
          footer={null}
          closable={true}
          width={360}
          title="Create new label"
          onCancel={() => setShowCreateLabelModal(false)}
          destroyOnClose={true}
          getContainer={() => modalContainerRef.current ?? document.body}
        >
          <div style={{ marginTop: "15px" }}>
            <CreateLabelForm
              initialLabelOptions={annotationData.getNextDefaultLabelSettings()}
              onConfirm={(options: Partial<LabelOptions>) => {
                onCreateNewLabel(options);
                setShowCreateLabelModal(false);
                setIsAnnotationModeEnabled(true);
              }}
              onCancel={() => setShowCreateLabelModal(false)}
              zIndex={Z_INDEX_MODAL + 50}
              focusNameInput={true}
            />
          </div>
        </Modal>

        <FlexRow $gap={2}>
          <AnnotationImportButton annotationState={props.annotationState} />
          <TextButton
            onClick={() => {
              const csvData = props.annotationState.data.toCsv(store.dataset!);
              download("annotations.csv", "data:text/csv;charset=utf-8," + encodeURIComponent(csvData));
            }}
          >
            Export CSV
          </TextButton>
        </FlexRow>
      </FlexRow>

      {/* Label selection and edit/create/delete buttons */}
      <FlexRow $gap={6} style={{ width: "100%", flexWrap: "wrap" }}>
        <FlexRow $gap={6} style={{ flexWrap: "wrap" }}>
          {/*
           * Hide edit-related buttons until edit mode is enabled.
           * Note that currentLabelIdx will never be null when edit mode is enabled.
           */}
          {isAnnotationModeEnabled && currentLabelIdx !== null ? (
            <LabelEditControls
              onCreateNewLabel={onCreateNewLabel}
              onDeleteLabel={onDeleteLabel}
              setLabelOptions={(options) => setLabelOptions(currentLabelIdx, options)}
              selectedLabel={selectedLabel}
              selectedLabelIdx={currentLabelIdx}
              selectionMode={props.annotationState.selectionMode}
              setSelectionMode={props.annotationState.setSelectionMode}
              defaultLabelOptions={props.annotationState.data.getNextDefaultLabelSettings()}
            >
              {labelSelectionDropdown}
            </LabelEditControls>
          ) : (
            labelSelectionDropdown
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
            dataset={store.dataset}
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
            onClickTrack={(trackId) => {
              const track = store.dataset?.getTrack(trackId);
              if (track) {
                store.setTrack(track);
              }
            }}
            setFrame={store.setFrame}
            dataset={store.dataset}
            ids={tableIds}
            highlightRange={highlightedIds}
            lastClickedId={props.annotationState.lastClickedId}
            selectedTrack={store.selectedTrack}
            selectedId={selectedId}
            frame={store.frame}
            labelColor={selectedLabel?.options.color}
          ></AnnotationDisplayList>
        </div>
      </LoadingSpinner>
    </FlexColumnAlignCenter>
  );
}
