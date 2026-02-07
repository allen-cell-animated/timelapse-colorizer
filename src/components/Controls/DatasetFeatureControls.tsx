import { Popconfirm } from "antd";
import React, { type ReactElement, useMemo, useRef, useState } from "react";

import type { Dataset } from "src/colorizer";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import GlossaryPanel from "src/components/GlossaryPanel";
import { AnnotationState } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow } from "src/styles/utils";

type DatasetFeatureControlsProps = {
  onSelectDataset: (datasetKey: string) => Promise<void>;
  onSelectFeature: (dataset: Dataset, featureKey: string) => void;
  disabled: boolean;
  annotationState: AnnotationState;
};

export default function DatasetFeatureControls(props: DatasetFeatureControlsProps): ReactElement {
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const setFeatureKey = useViewerStateStore((state) => state.setFeatureKey);

  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const collection = useViewerStateStore((state) => state.collection);

  const userConfirmationPromiseResolveRef = useRef<(() => void) | null>(null);
  const userConfirmationPromiseRejectRef = useRef<(() => void) | null>(null);
  const [showAnnotationDataWarning, setShowAnnotationDataWarning] = useState(false);
  const hasAnnotations = props.annotationState.data.getLabels().length > 0;

  const datasetDropdownData = useMemo(() => collection?.getDatasetKeys() || [], [collection]);
  const featureDropdownData = useMemo((): SelectItem[] => {
    if (!dataset) {
      return [];
    }
    // Add units to the dataset feature names if present
    return dataset.featureKeys.map((key) => {
      return { value: key, label: dataset.getFeatureNameWithUnits(key) };
    });
  }, [dataset]);

  // On selection, prompt the user for additional confirmation if there are
  // annotations that need to be handled.
  const onSelectDataset = async (key: string): Promise<void> => {
    if (key === datasetKey) {
      return;
    }
    if (hasAnnotations) {
      setShowAnnotationDataWarning(true);
      // Setup promise
      const userConfirmationPromise = new Promise<void>((resolve, reject) => {
        const resolveCallback = async (): Promise<void> => {
          await props.onSelectDataset(key);
          resolve();
        };
        userConfirmationPromiseResolveRef.current = resolveCallback;
        userConfirmationPromiseRejectRef.current = reject;
      });
      return userConfirmationPromise;
    } else {
      await props.onSelectDataset(key);
    }
  };

  const downloadAndClearAnnotations = async (): Promise<void> => {};

  const onConfirm = async (clearAnnotations: boolean): Promise<void> => {
    if (clearAnnotations) {
      await downloadAndClearAnnotations();
    }
    userConfirmationPromiseResolveRef.current?.();

    userConfirmationPromiseResolveRef.current = null;
    userConfirmationPromiseRejectRef.current = null;
    setShowAnnotationDataWarning(false);
  };

  const onCancel = (): void => {
    userConfirmationPromiseRejectRef.current?.();

    setShowAnnotationDataWarning(false);
    userConfirmationPromiseResolveRef.current = null;
    userConfirmationPromiseRejectRef.current = null;
  };

  return (
    <FlexRow $gap={22} style={{ width: "100%" }}>
      <div style={{ width: "45%" }}>
        <SelectionDropdown
          disabled={props.disabled}
          label="Dataset"
          selected={datasetKey ?? ""}
          buttonType="primary"
          items={datasetDropdownData}
          onChange={onSelectDataset}
          controlWidth={"100%"}
        />
        <Popconfirm
          title={"Clear annotations before changing datasets?"}
          description={
            <FlexColumn style={{ maxWidth: 300, marginBottom: 6 }} $gap={6}>
              Datasets with different tracks will cause existing annotations to be applied to the wrong objects.
            </FlexColumn>
          }
          open={showAnnotationDataWarning}
          onOpenChange={onCancel}
          onCancel={() => onConfirm(false)}
          onConfirm={() => onConfirm(true)}
          okButtonProps={{ danger: true }}
          okText="Save and Clear Annotations"
          cancelText="Keep Annotations"
          style={{ width: "300px" }}
        >
          <div></div>
        </Popconfirm>
      </div>

      <FlexRow $gap={6} style={{ width: "55%" }}>
        <SelectionDropdown
          disabled={props.disabled}
          label="Feature"
          selected={featureKey ?? undefined}
          items={featureDropdownData}
          onChange={(value) => {
            if (value !== featureKey && dataset) {
              setFeatureKey(value);
              props.onSelectFeature(dataset, value);
            }
          }}
          width={"100%"}
          controlWidth={"100%"}
        >
          <GlossaryPanel dataset={dataset} />
        </SelectionDropdown>
      </FlexRow>
    </FlexRow>
  );
}
