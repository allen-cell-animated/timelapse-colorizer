import { ExclamationCircleFilled } from "@ant-design/icons";
import { Button, Popover } from "antd";
import React, { type ReactElement, useContext, useMemo, useRef, useState } from "react";

import type { Dataset } from "src/colorizer";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import GlossaryPanel from "src/components/GlossaryPanel";
import { AnnotationState } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexRow } from "src/styles/utils";
import { downloadCsv } from "src/utils/file_io";

type DatasetFeatureControlsProps = {
  onSelectDataset: (datasetKey: string) => Promise<void>;
  onSelectFeature: (dataset: Dataset, featureKey: string) => void;
  disabled: boolean;
  annotationState: AnnotationState;
};

export default function DatasetFeatureControls(props: DatasetFeatureControlsProps): ReactElement {
  const theme = useContext(AppThemeContext);
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

  const downloadAndClearAnnotations = async (): Promise<void> => {
    const csvData = props.annotationState.data.toCsv(dataset!);
    const name = datasetKey ? `${datasetKey}-annotations.csv` : "annotations.csv";
    downloadCsv(name, csvData);
    props.annotationState.clear();
  };

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

  const annotationPopupContents = (
    <FlexColumn style={{ maxWidth: 350 }} $gap={12}>
      <FlexRow $gap={10}>
        <ExclamationCircleFilled style={{ color: theme.color.text.warning, margin: "6px 0 auto 0" }} />
        <FlexColumn>
          <p style={{ margin: "2px 0" }}>Clear annotations before changing datasets?</p>
          <span style={{ color: theme.color.text.secondary, margin: "2px 0" }}>
            Datasets with different tracks will cause existing annotations to be applied to the wrong objects.
          </span>
        </FlexColumn>
      </FlexRow>
      <FlexRow $gap={6}>
        <Button onClick={() => onConfirm(false)}>Keep Annotations</Button>
        <Button type="primary" danger onClick={() => onConfirm(true)}>
          Save and Clear Annotations
        </Button>
      </FlexRow>
    </FlexColumn>
  );

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
        <Popover
          trigger={["click", "focus"]}
          content={annotationPopupContents}
          open={showAnnotationDataWarning}
          onOpenChange={onCancel}
          style={{ width: "300px" }}
        >
          <div></div>
        </Popover>
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
