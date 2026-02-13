import React, { type ReactElement, useMemo } from "react";

import type { Dataset } from "src/colorizer";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import GlossaryPanel from "src/components/GlossaryPanel";
import { type AnnotationState, useAnnotationDatasetWarning } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexRow } from "src/styles/utils";

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

  const { popupEl, wrappedCallback: wrappedOnSelectDataset } = useAnnotationDatasetWarning(
    props.onSelectDataset,
    props.annotationState
  );

  // Wrap the returned callback one more time to skip if the selected dataset
  // is the same.
  const onSelectedDatasetValue = async (key: string): Promise<void> => {
    if (key === datasetKey) {
      return;
    }
    return await wrappedOnSelectDataset(key);
  };

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

  return (
    <FlexRow $gap={22} style={{ width: "100%" }}>
      <div style={{ width: "45%" }}>
        <SelectionDropdown
          disabled={props.disabled}
          label="Dataset"
          selected={datasetKey ?? ""}
          buttonType="primary"
          items={datasetDropdownData}
          onChange={onSelectedDatasetValue}
          controlWidth={"100%"}
        />
        {popupEl}
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
