import React, { type ReactElement, useMemo } from "react";

import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import { useViewerStateStore } from "src/state";
import { FlexRow } from "src/styles/utils";

type Plot3dFeatureControlsProps = {
  xAxisFeatureKey: string | null;
  setXAxisFeatureKey: (value: string | null) => void;
  yAxisFeatureKey: string | null;
  setYAxisFeatureKey: (value: string | null) => void;
  zAxisFeatureKey: string | null;
  setZAxisFeatureKey: (value: string | null) => void;
  bins: number;
  setBins: (value: number) => void;
};

export default function Plot3dFeatureControls(props: Plot3dFeatureControlsProps): ReactElement {
  const {
    xAxisFeatureKey,
    setXAxisFeatureKey,
    yAxisFeatureKey,
    setYAxisFeatureKey,
    zAxisFeatureKey,
    setZAxisFeatureKey,
    bins: rawBins,
    setBins,
  } = props;

  const dataset = useViewerStateStore((state) => state.dataset);

  const featureDropdownData = useMemo((): SelectItem[] => {
    if (!dataset) {
      return [];
    }
    return dataset.featureKeys.map((key) => {
      return { value: key, label: dataset.getFeatureNameWithUnits(key) };
    });
  }, [dataset]);

  const getFeatureAxisSelector = (
    axisLabel: string,
    selectedKey: string | null,
    onChangeKey: (newKey: string) => void
  ): ReactElement => {
    return (
      <SelectionDropdown
        label={axisLabel}
        selected={selectedKey || ""}
        items={featureDropdownData}
        onChange={onChangeKey}
        controlWidth="100%"
        containerStyle={{ flexGrow: 1, flexBasis: "140px", flexShrink: 1 }}
      ></SelectionDropdown>
    );
  };

  return (
    <FlexRow $gap={12} style={{ flexGrow: 1 }}>
      {getFeatureAxisSelector("X", xAxisFeatureKey, setXAxisFeatureKey)}
      {getFeatureAxisSelector("Y", yAxisFeatureKey, setYAxisFeatureKey)}
      {getFeatureAxisSelector("Z", zAxisFeatureKey, setZAxisFeatureKey)}

      {/* TODO: Bins probably belongs with the cone controls once it is spun off into a submenu */}

      <SelectionDropdown
        label={"Bins"}
        selected={rawBins.toString()}
        items={[10, 25, 50, 100].map((num) => ({ value: num.toString(), label: num.toString() }))}
        onChange={(value: string) => {
          const parsedValue = parseInt(value, 10);
          if (!isNaN(parsedValue) && parsedValue > 0) {
            setBins(parsedValue);
          }
        }}
        width="100px"
        controlWidth="70px"
      ></SelectionDropdown>
    </FlexRow>
  );
}
