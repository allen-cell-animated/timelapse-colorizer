import React, { ReactElement } from "react";

import {
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_KEYS,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
} from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { FlexRowAlignCenter } from "../../styles/utils";

import CategoricalColorPicker from "../CategoricalColorPicker";
import ColorRampDropdown from "../Dropdowns/ColorRampDropdown";
import ColorRampRangeSlider from "./ColorizeControl/ColorRampRangeSlider";

type ColorizationControlsProps = {
  disabled: boolean;
};

export default function ColorizationControls(props: ColorizationControlsProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);

  const categoricalPalette = useViewerStateStore((state) => state.categoricalPalette);
  const colorRampKey = useViewerStateStore((state) => state.colorRampKey);
  const colorRampReversed = useViewerStateStore((state) => state.isColorRampReversed);
  const selectedPaletteKey = useViewerStateStore((state) => state.categoricalPaletteKey);
  const setCategoricalPalette = useViewerStateStore((state) => state.setCategoricalPalette);
  const setColorRampKey = useViewerStateStore((state) => state.setColorRampKey);
  const setColorRampReversed = useViewerStateStore((state) => state.setColorRampReversed);

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey);
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];

  return (
    <>
      {/* TODO: Once the color ramp dropdown is refactored, change gap to 22px */}
      <FlexRowAlignCenter $gap={12}>
        <ColorRampDropdown
          label="Colormap"
          knownColorRamps={KNOWN_COLOR_RAMPS}
          colorRampsToDisplay={DISPLAY_COLOR_RAMP_KEYS}
          selectedRamp={colorRampKey}
          reversed={colorRampReversed}
          onChangeRamp={(name, reversed) => {
            setColorRampKey(name);
            setColorRampReversed(reversed);
          }}
          disabled={props.disabled}
          knownCategoricalPalettes={KNOWN_CATEGORICAL_PALETTES}
          categoricalPalettesToDisplay={DISPLAY_CATEGORICAL_PALETTE_KEYS}
          useCategoricalPalettes={isFeatureCategorical}
          numCategories={Math.max(featureCategories.length, 1)}
          selectedPalette={categoricalPalette}
          selectedPaletteKey={selectedPaletteKey}
          onChangePalette={setCategoricalPalette}
          id="feature-color-ramp-dropdown"
        />

        {isFeatureCategorical ? (
          <CategoricalColorPicker categories={featureCategories} disabled={props.disabled} />
        ) : (
          <ColorRampRangeSlider disabled={props.disabled} />
        )}
      </FlexRowAlignCenter>
    </>
  );
}
