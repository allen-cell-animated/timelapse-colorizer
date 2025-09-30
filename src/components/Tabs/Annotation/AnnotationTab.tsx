import { ExportOutlined, MenuOutlined, TableOutlined } from "@ant-design/icons";
import { Modal, Radio, Tooltip } from "antd";
import React, { ReactElement, useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useShallow } from "zustand/shallow";

import { AnnotationSelectionMode } from "@/colorizer";
import { LabelData, LabelOptions, LabelType } from "@/colorizer/AnnotationData";
import TextButton from "@/components/Buttons/TextButton";
import SelectionDropdown from "@/components/Dropdowns/SelectionDropdown";
import { SelectItem } from "@/components/Dropdowns/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AnnotationState } from "@/hooks";
import { useViewerStateStore } from "@/state";
import { Z_INDEX_MODAL } from "@/styles/AppStyle";
import { StyledRadioGroup } from "@/styles/components";
import { FlexColumnAlignCenter, FlexRow, VisuallyHidden } from "@/styles/utils";
import { download } from "@/utils/file_io";

import AnnotationDisplayList from "./AnnotationDisplay/AnnotationDisplayList";
import AnnotationDisplayTable, { TableDataType } from "./AnnotationDisplay/AnnotationDisplayTable";
import AnnotationImportButton from "./AnnotationImportButton";
import AnnotationModeButton from "./AnnotationModeButton";
import CreateLabelForm from "./CreateLabelForm";
import LabelEditControls from "./LabelEditControls";

const ANNOTATION_KEY_SELECT_ID = "annotation-key-select";

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
  const datasetKey = useViewerStateStore((state) => state.datasetKey);

  const [isPending, startTransition] = useTransition();
  const [viewType, setViewType] = useState<AnnotationViewType>(AnnotationViewType.LIST);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);

  const modalContainerRef = useRef<HTMLDivElement>(null);

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

  const hasAnnotations = labels.length > 0;

  const tableIds = useMemo(() => {
    return currentLabelIdx !== null ? annotationData.getLabeledIds(currentLabelIdx) : [];
  }, [currentLabelIdx, annotationData]);
  const isMultiValueLabel = selectedLabel && selectedLabel?.options.type !== LabelType.BOOLEAN;
  const idToValue = isMultiValueLabel ? selectedLabel.idToValue : undefined;
  const valueToIds = isMultiValueLabel ? selectedLabel.valueToIds : undefined;

  const labelSelectionDropdown = (
    <FlexRow>
      <label htmlFor={ANNOTATION_KEY_SELECT_ID}>
        <VisuallyHidden>Current label</VisuallyHidden>
      </label>
      <SelectionDropdown
        id={ANNOTATION_KEY_SELECT_ID}
        selected={(currentLabelIdx ?? -1).toString()}
        items={selectLabelOptions}
        onChange={onSelectLabelIdx}
        disabled={currentLabelIdx === null}
        showSelectedItemTooltip={false}
      ></SelectionDropdown>
    </FlexRow>
  );

  return (
    <FlexColumnAlignCenter $gap={10}>
      <FlexRow style={{ width: "100%", justifyContent: "space-between" }} ref={modalContainerRef}>
        <AnnotationModeButton
          active={isAnnotationModeEnabled}
          onClick={onClickEnableAnnotationMode}
          hasAnnotations={hasAnnotations}
        />

        {/* Appears when the user activates annotations for the first time and should define a label. */}
        <Modal
          open={showCreateLabelModal}
          footer={null}
          closable={true}
          width={360}
          title="Create new annotation"
          onCancel={() => {
            // Close the color picker first if it's open before allowing the
            // modal to be closed.
            if (isColorPickerOpen) {
              setIsColorPickerOpen(false);
            } else {
              setShowCreateLabelModal(false);
              setIsColorPickerOpen(false);
            }
          }}
          destroyOnHidden={true}
          getContainer={() => modalContainerRef.current ?? document.body}
        >
          <div style={{ marginTop: "15px" }}>
            <CreateLabelForm
              baseId="annotation-create-label-modal"
              initialLabelOptions={annotationData.getNextDefaultLabelSettings()}
              onConfirm={(options: Partial<LabelOptions>) => {
                onCreateNewLabel(options);
                setShowCreateLabelModal(false);
                setIsColorPickerOpen(false);
                setIsAnnotationModeEnabled(true);
              }}
              onCancel={() => {
                setShowCreateLabelModal(false);
                setIsColorPickerOpen(false);
              }}
              // Requires a delay, otherwise the modal will immediately close
              onColorPickerOpenChange={(open) => setTimeout(() => setIsColorPickerOpen(open), 1)}
              colorPickerOpen={isColorPickerOpen}
              zIndex={Z_INDEX_MODAL + 50}
              focusNameInput={true}
            />
          </div>
        </Modal>

        <FlexRow $gap={2}>
          <AnnotationImportButton annotationState={props.annotationState} />
          <Tooltip
            title={"Create an annotation first to enable exporting"}
            placement="top"
            open={hasAnnotations ? false : undefined}
          >
            <TextButton
              onClick={() => {
                const csvData = props.annotationState.data.toCsv(store.dataset!);
                const name = datasetKey ?? "annotations";
                download(`${name}-annotations.csv`, "data:text/csv;charset=utf-8," + encodeURIComponent(csvData));
              }}
              disabled={!hasAnnotations}
            >
              <ExportOutlined style={{ marginRight: "2px" }} />
              Export CSV
            </TextButton>
          </Tooltip>
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
              setSelectionMode={props.annotationState.setBaseSelectionMode}
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
          <AnnotationDisplayTable
            onClickObjectRow={onClickObjectRow}
            onClickDeleteObject={onClickDeleteObject}
            dataset={store.dataset}
            ids={tableIds}
            idToValue={idToValue}
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
            idToValue={idToValue}
            valueToIds={valueToIds}
            highlightRange={highlightedIds}
            rangeStartId={props.annotationState.rangeStartId}
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
