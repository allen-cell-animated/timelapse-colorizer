import React, { type ReactElement, useMemo } from "react";

import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import { useViewerStateStore } from "src/state";
import { FlexRow } from "src/styles/utils";

type Plot3dFeatureControlsProps = {
  disabled?: boolean;
};

export default function Plot3dFeatureControls(props: Plot3dFeatureControlsProps): ReactElement {
  const xAxisFeatureKey = useViewerStateStore((state) => state.plot3dXAxis);
  const setXAxisFeatureKey = useViewerStateStore((state) => state.setPlot3dXAxis);
  const yAxisFeatureKey = useViewerStateStore((state) => state.plot3dYAxis);
  const setYAxisFeatureKey = useViewerStateStore((state) => state.setPlot3dYAxis);
  const zAxisFeatureKey = useViewerStateStore((state) => state.plot3dZAxis);
  const setZAxisFeatureKey = useViewerStateStore((state) => state.setPlot3dZAxis);

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
        selected={selectedKey ?? { label: "", value: "" }}
        items={featureDropdownData}
        onChange={onChangeKey}
        controlWidth="calc(max(100%, 120px))"
        containerStyle={{ flexGrow: 1, flexBasis: "140px", flexShrink: 1 }}
        disabled={props.disabled}
      ></SelectionDropdown>
    );
  };

  return (
    <FlexRow $gap={16} style={{ flexGrow: 1, flexWrap: "wrap" }}>
      {getFeatureAxisSelector("X", xAxisFeatureKey, setXAxisFeatureKey)}
      {getFeatureAxisSelector("Y", yAxisFeatureKey, setYAxisFeatureKey)}
      {getFeatureAxisSelector("Z", zAxisFeatureKey, setZAxisFeatureKey)}
    </FlexRow>
  );
}
