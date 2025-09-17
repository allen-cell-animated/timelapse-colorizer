import React, { ReactElement, useMemo } from "react";

import { Dataset } from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { FlexRow } from "../../styles/utils";
import { SelectItem } from "../Dropdowns/types";

import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import GlossaryPanel from "../GlossaryPanel";

type DatasetFeatureControlsProps = {
  onSelectDataset: (datasetKey: string) => Promise<void>;
  onSelectFeature: (dataset: Dataset, featureKey: string) => void;
  disabled: boolean;
};

export default function DatasetFeatureControls(props: DatasetFeatureControlsProps): ReactElement {
  const datasetKey = useViewerStateStore((state) => state.datasetKey);
  const setFeatureKey = useViewerStateStore((state) => state.setFeatureKey);

  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const collection = useViewerStateStore((state) => state.collection);

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
          onChange={props.onSelectDataset}
          // TODO: Refactor how width is set on dropdowns.
          containerStyle={{ width: "100%" }}
          controlStyle={{ width: "100%" }}
          width={"100%"}
        />
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
        >
          <GlossaryPanel dataset={dataset} />
        </SelectionDropdown>
      </FlexRow>
    </FlexRow>
  );
}
