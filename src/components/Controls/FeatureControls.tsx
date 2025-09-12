import React, { ReactElement } from "react";

import { useViewerStateStore } from "../../state";
import { FlexRowAlignCenter } from "../../styles/utils";

import CategoricalColorPicker from "../CategoricalColorPicker";
import ColorRampRangeSlider from "./ColorizeControl/ColorRampRangeSlider";

type FeatureControlsProps = {
  disabled: boolean;
};

export default function FeatureControls(props: FeatureControlsProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey);
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];
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
              <ColorRampRangeSlider disabled={props.disabled} />
            )
          }
        </div>
      </FlexRowAlignCenter>
    </>
  );
}
