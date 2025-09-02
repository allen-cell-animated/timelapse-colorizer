import { Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";

import { ColorRampType, isThresholdNumeric } from "../../../colorizer";
import { thresholdMatchFinder } from "../../../colorizer/utils/data_utils";
import { useViewerStateStore } from "../../../state";

import LabeledSlider from "../../Inputs/LabeledSlider";

type ColorRampRangeSliderProps = {
  disabled: boolean;
};

export default function ColorRampRangeSlider(props: ColorRampRangeSliderProps): ReactElement {
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const colorRamp = useViewerStateStore((state) => state.colorRamp);
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);

  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);

  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const marks = useMemo((): undefined | number[] => {
    if (dataset === null || featureKey === null || featureThresholds.length === 0) {
      return undefined;
    }
    const featureData = dataset.getFeatureData(featureKey);
    if (!featureData) {
      return undefined;
    }
    const threshold = featureThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
    if (!threshold || !isThresholdNumeric(threshold)) {
      return undefined;
    }
    return [threshold.min, threshold.max];
  }, [dataset, featureKey, featureThresholds]);

  const isUsingGlasbeyRamp = colorRamp.type === ColorRampType.CATEGORICAL;

  return (
    <Tooltip
      trigger={["hover", "focus"]}
      title={isUsingGlasbeyRamp ? "Color ramp adjustment is disabled when a Glasbey color map is selected." : undefined}
    >
      <div style={{ width: "100%" }}>
        <LabeledSlider
          type="range"
          min={colorRampMin}
          max={colorRampMax}
          minSliderBound={featureKey !== null ? dataset?.getFeatureData(featureKey)?.min : undefined}
          maxSliderBound={featureKey !== null ? dataset?.getFeatureData(featureKey)?.max : undefined}
          onChange={function (min: number, max: number): void {
            setColorRampRange([min, max]);
          }}
          marks={marks}
          disabled={props.disabled || isUsingGlasbeyRamp}
        />
      </div>
    </Tooltip>
  );
}
