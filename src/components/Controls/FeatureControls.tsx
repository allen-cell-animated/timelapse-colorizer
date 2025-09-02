import { Checkbox } from "antd";
import React, { ReactElement, useMemo } from "react";

import {
  Dataset,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_KEYS,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
} from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { FlexRow, FlexRowAlignCenter } from "../../styles/utils";
import { SelectItem } from "../Dropdowns/types";

import CategoricalColorPicker from "../CategoricalColorPicker";
import ColorRampDropdown from "../Dropdowns/ColorRampDropdown";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import GlossaryPanel from "../GlossaryPanel";
import ColorRampRangeSlider from "./ColorizeControl/ColorRampRangeSlider";

type FeatureControlsProps = {
  disabled: boolean;
  onFeatureSelected: (dataset: Dataset, feature: string) => void;
};

export default function FeatureControls(props: FeatureControlsProps): ReactElement {
  const dataset = useViewerStateStore((state) => state.dataset);
  const featureKey = useViewerStateStore((state) => state.featureKey);
  const keepColorRampRange = useViewerStateStore((state) => state.keepColorRampRange);
  const setFeatureKey = useViewerStateStore((state) => state.setFeatureKey);
  const setKeepColorRampRange = useViewerStateStore((state) => state.setKeepColorRampRange);
  const categoricalPalette = useViewerStateStore((state) => state.categoricalPalette);
  const colorRampKey = useViewerStateStore((state) => state.colorRampKey);
  const colorRampReversed = useViewerStateStore((state) => state.isColorRampReversed);
  const selectedPaletteKey = useViewerStateStore((state) => state.categoricalPaletteKey);
  const setCategoricalPalette = useViewerStateStore((state) => state.setCategoricalPalette);
  const setColorRampKey = useViewerStateStore((state) => state.setColorRampKey);
  const setColorRampReversed = useViewerStateStore((state) => state.setColorRampReversed);

  const isFeatureSelected = dataset !== null && featureKey !== null;
  const isFeatureCategorical = isFeatureSelected && dataset.isFeatureCategorical(featureKey); // Disable color ramp controls when the feature is numeric but we've selected
  // a categorical color ramp (e.g. glasbey)
  const featureCategories = isFeatureCategorical ? dataset.getFeatureCategories(featureKey) || [] : [];

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
    <>
      {/* <h3 style={{ margin: "0" }}>{featureNameWithUnits ?? "Feature value range"}</h3> */}
      <FlexRowAlignCenter $gap={20}>
        <FlexRow $gap={6}>
          <SelectionDropdown
            disabled={props.disabled}
            label=""
            // TODO: Show feature description here?
            selected={featureKey ?? undefined}
            items={featureDropdownData}
            onChange={(value) => {
              if (value !== featureKey && dataset) {
                setFeatureKey(value);
                props.onFeatureSelected(dataset, value);
              }
            }}
          />
          <GlossaryPanel dataset={dataset} />
        </FlexRow>
        <ColorRampDropdown
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
        />
      </FlexRowAlignCenter>
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
