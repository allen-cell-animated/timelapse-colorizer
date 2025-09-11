import { Checkbox, Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";

import { ColorRampType, isThresholdNumeric } from "../../colorizer";
import { thresholdMatchFinder } from "../../colorizer/utils/data_utils";
import { useViewerStateStore } from "../../state";
import { FlexRowAlignCenter } from "../../styles/utils";

import CategoricalColorPicker from "../CategoricalColorPicker";
import LabeledSlider from "../Inputs/LabeledSlider";

type FeatureControlsProps = {
  disabled: boolean;
};

export default function FeatureControls(props: FeatureControlsProps): ReactElement {
  const [colorRampMin, colorRampMax] = useViewerStateStore((state) => state.colorRampRange);
  const colorRamp = useViewerStateStore((state) => state.colorRamp);
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureThresholds = useViewerStateStore((state) => state.thresholds);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const keepColorRampRange = useViewerStateStore((state) => state.keepColorRampRange);
  const setKeepColorRampRange = useViewerStateStore((state) => state.setKeepColorRampRange);
  const setColorRampRange = useViewerStateStore((state) => state.setColorRampRange);

  // Show min + max marks on the color ramp slider if a feature is selected and
  // is currently being thresholded/filtered on.
  const sliderMarks = useMemo((): undefined | number[] => {
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

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey);
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];
  // Disable color ramp controls when the feature is numeric but we've selected
  // a categorical color ramp (e.g. glasbey)
  const isGlasbeyRamp = !isFeatureCategorical && colorRamp.type === ColorRampType.CATEGORICAL;
  const featureNameWithUnits = isFeatureSelected ? dataset.getFeatureNameWithUnits(featureKey) : undefined;

  return (
    <>
      <h3 style={{ margin: "0" }}>{featureNameWithUnits ?? "Feature value range"}</h3>
      <FlexRowAlignCenter $gap={12} style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ flexBasis: 250, flexShrink: 2, flexGrow: 2, minWidth: "75px" }}>
          {
            // Render either a categorical color picker or a range slider depending on the feature type
            isFeatureCategorical ? (
              <CategoricalColorPicker categories={featureCategories} disabled={props.disabled} />
            ) : (
              <Tooltip
                trigger={["hover", "focus"]}
                title={
                  isGlasbeyRamp ? "Color ramp adjustment is disabled when a Glasbey color map is selected." : undefined
                }
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
                    marks={sliderMarks}
                    disabled={props.disabled || isGlasbeyRamp}
                  />
                </div>
              </Tooltip>
            )
          }
        </div>
        <div style={{ flexBasis: 100, flexShrink: 1, flexGrow: 1, width: "fit-content" }}>
          <Checkbox
            checked={keepColorRampRange}
            onChange={() => {
              // Invert lock on range
              setKeepColorRampRange(!keepColorRampRange);
            }}
          >
            Keep range when switching datasets and features
          </Checkbox>
        </div>
      </FlexRowAlignCenter>
    </>
  );
}
