import { RetweetOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import { Color } from "three";

import {
  ColorRamp,
  ColorRampData,
  ColorRampType,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
  PaletteData,
} from "../../colorizer";
import { FlexRowAlignCenter } from "../../styles/utils";

import { AppThemeContext } from "../AppStyle";
import IconButton from "../IconButton";
import SelectionDropdown, { SelectItem } from "./SelectionDropdown";

const SELECTED_RAMP_ITEM_KEY = "__selected_ramp__";
const CUSTOM_PALETTE_ITEM_KEY = "__custom__";
const DROPDOWN_WIDTH_PX = 120;
const DROPDOWN_DEFAULT_BORDER_PX = 1;
const DROPDOWN_CATEGORICAL_BORDER_PX = 2;

const DropdownStyleContainer = styled.div<{ $categorical: boolean }>`
  --width: ${DROPDOWN_WIDTH_PX}px;
  --border-width: 1px;
  --radius: 6px;
  --button-radius: calc(var(--radius) - var(--border-width));
  --outline-width-selected: ${(props) =>
    props.$categorical ? DROPDOWN_CATEGORICAL_BORDER_PX : DROPDOWN_DEFAULT_BORDER_PX}px;
  --outline-width-unselected: calc(var(--outline-width-selected) - 1px);

  & img {
    /* Copied from
    * https://stackoverflow.com/questions/7615009/disable-interpolation-when-scaling-a-canvas.  
    * Prevents color ramps (especially hard-stop categorical ones) from being
    * pixelated when scaled.  
    */
    image-rendering: optimizeSpeed; /* Older versions of FF */
    image-rendering: -moz-crisp-edges; /* FF 6.0+ */
    image-rendering: -webkit-optimize-contrast; /* Safari */
    image-rendering: -o-crisp-edges; /* OS X & Windows Opera (12.02) */
    image-rendering: pixelated; /* Awesome future-browsers */
    -ms-interpolation-mode: nearest-neighbor; /* IE */
  }

  & .react-select__control > img {
    border-radius: 5px;
    outline: var(--outline-width-unselected) solid var(--color-text-button);
    outline-offset: calc(0px - var(--outline-width-unselected));
  }

  & .react-select__control--is-disabled > img {
    filter: grayscale(100%);
  }

  & .react-select__single-value {
    /* Hides the text label for the selected item under the gradient. */
    z-index: -1;
  }

  & .react-select__indicator {
    z-index: 100;
    color: var(--color-text-button);
  }

  & .react-select__menu {
    height: unset;
  }

  & .react-select__menu-list {
    background-color: var(--color-button);
    max-height: max-content;

    padding: 0;
    gap: 1px;
    overflow: hidden;

    padding: var(--border-width) var(--border-width);
    gap: var(--border-width);
    border-radius: var(--radius);

    & .react-select__option {
      padding: 0;
      height: 28px;
      border-radius: 0;
      overflow: clip;
      outline: var(--outline-width-unselected) solid var(--color-text-button);
      outline-offset: calc(0px - var(--outline-width-unselected));
    }

    & :first-child > .react-select__option {
      border-radius: var(--button-radius) var(--button-radius) 0 0;
    }

    & :last-child > .react-select__option {
      border-radius: 0 0 var(--button-radius) var(--button-radius);
    }

    & .react-select__option:hover,
    & .react-select__option--is-focused {
      outline: var(--outline-width-selected) solid var(--color-text-button);
      outline-offset: calc(0px - var(--outline-width-selected));
    }
  }
`;

type ColorRampSelectionProps = {
  selectedRamp: string;
  onChangeRamp: (colorRampKey: string, reversed: boolean) => void;
  /** The keys of the color ramps to display, in order. */
  colorRampsToDisplay: string[];
  /**
   * All known and displayable color ramps. This is a superset of
   * `colorRampsToDisplay` and may include additional ramps, such as deprecated
   * ramps that are hidden on the UI.
   */
  knownColorRamps?: Map<string, ColorRampData>;

  selectedPalette: Color[];
  onChangePalette: (newPalette: Color[]) => void;
  numCategories: number;
  categoricalPalettesToDisplay: string[];
  knownCategoricalPalettes?: Map<string, PaletteData>;

  /** If true, shows the categorical palettes and selected palette instead of
   * the color ramps. */
  useCategoricalPalettes?: boolean;
  disabled?: boolean;
  reversed?: boolean;
};

const defaultProps: Partial<ColorRampSelectionProps> = {
  knownColorRamps: KNOWN_COLOR_RAMPS,
  disabled: false,
  useCategoricalPalettes: false,
  knownCategoricalPalettes: KNOWN_CATEGORICAL_PALETTES,
};

/** Returns whether the two arrays are deeply equal, where arr1[i] === arr2[i] for all i. */
function arrayDeepEquals<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr2.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export default function ColorRampSelection(inputProps: ColorRampSelectionProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ColorRampSelectionProps>;
  const theme = useContext(AppThemeContext);

  const { colorRampsToDisplay, categoricalPalettesToDisplay } = props;

  ///////// Generate dropdown contents

  const rampItems: SelectItem[] = useMemo(() => {
    return colorRampsToDisplay.map((key) => {
      const rampData = props.knownColorRamps.get(key);
      if (!rampData) {
        throw new Error(`Invalid color ramp key '${key}'`);
      }
      return {
        value: key,
        label: rampData.name,
        image: rampData.colorRamp.createGradientCanvas(DROPDOWN_WIDTH_PX, theme.controls.height).toDataURL(),
        tooltip: rampData.name,
      };
    });
  }, [colorRampsToDisplay, props.knownColorRamps]);
  const paletteItems: SelectItem[] = useMemo(() => {
    return categoricalPalettesToDisplay.map((key) => {
      const paletteData = props.knownCategoricalPalettes?.get(key);
      if (!paletteData) {
        throw new Error(`Invalid categorical palette key '${key}'`);
      }
      const visibleColors = paletteData.colors.slice(0, Math.max(1, props.numCategories));
      const colorRamp = new ColorRamp(visibleColors, ColorRampType.HARD_STOP);
      return {
        value: key,
        label: paletteData.name,
        image: colorRamp.createGradientCanvas(DROPDOWN_WIDTH_PX, theme.controls.height).toDataURL(),
        tooltip: paletteData.name,
      };
    });
  }, [categoricalPalettesToDisplay, props.numCategories, props.knownCategoricalPalettes]);

  // Create a selected item for both the ramp and palette, since they might not
  // be an option in the dropdown list. This can happen for the ramp if it's a
  // deprecated ramp that's no longer shown on the UI or if it's been reversed,
  // or for the palette if it's a custom palette.
  const selectedRampData = props.knownColorRamps.get(props.selectedRamp);
  if (!selectedRampData || !selectedRampData.colorRamp) {
    throw new Error(`Selected color ramp name '${props.selectedRamp}' is invalid.`);
  }
  const rampImgSrc = useMemo(() => {
    let selectedRamp = selectedRampData.colorRamp;
    if (props.reversed) {
      selectedRamp = selectedRamp.reverse();
    }
    return selectedRamp.createGradientCanvas(DROPDOWN_WIDTH_PX, theme.controls.height).toDataURL();
  }, [props.selectedRamp, props.reversed]);

  const selectedRampItem = {
    value: SELECTED_RAMP_ITEM_KEY,
    label: selectedRampData.name + (props.reversed ? " (reversed)" : ""),
    image: rampImgSrc,
    tooltip: selectedRampData.name + (props.reversed ? " (reversed)" : ""),
  };

  const paletteImgSrc = useMemo(() => {
    const visibleColors = props.selectedPalette.slice(0, Math.max(1, props.numCategories));
    const colorRamp = new ColorRamp(visibleColors, ColorRampType.HARD_STOP);
    return colorRamp
      .createGradientCanvas(DROPDOWN_WIDTH_PX - DROPDOWN_CATEGORICAL_BORDER_PX, theme.controls.height)
      .toDataURL();
  }, [props.useCategoricalPalettes, props.numCategories, props.selectedPalette]);

  // Check if palette colors match an existing one; otherwise, mark it as being
  // custom.
  let selectedPaletteKey = CUSTOM_PALETTE_ITEM_KEY;
  for (const [key, paletteData] of props.knownCategoricalPalettes) {
    if (arrayDeepEquals(paletteData.colors, props.selectedPalette)) {
      selectedPaletteKey = key;
      break;
    }
  }
  const paletteData = props.knownCategoricalPalettes.get(selectedPaletteKey);
  const selectedPaletteItem = {
    value: selectedPaletteKey,
    label: paletteData?.name || "Custom",
    image: paletteImgSrc,
    tooltip: paletteData?.name || "Custom",
  };

  // Handlers
  const onChangePalette = (key: string): void => {
    const paletteData = props.knownCategoricalPalettes?.get(key);
    if (!paletteData) {
      throw new Error(`Invalid categorical palette key '${key}'`);
    }
    props.onChangePalette(paletteData.colors);
  };

  const onChangeRamp = (key: string): void => {
    props.onChangeRamp(key, false);
  };

  return (
    <FlexRowAlignCenter>
      <DropdownStyleContainer $categorical={props.useCategoricalPalettes}>
        <SelectionDropdown
          disabled={props.disabled}
          items={props.useCategoricalPalettes ? paletteItems : rampItems}
          label="Color map"
          selected={props.useCategoricalPalettes ? selectedPaletteItem : selectedRampItem}
          onChange={props.useCategoricalPalettes ? onChangePalette : onChangeRamp}
          width={`${DROPDOWN_WIDTH_PX}px`}
          isSearchable={false}
          controlTooltipPlacement="top"
        ></SelectionDropdown>
      </DropdownStyleContainer>

      {/** Reverse map button */}
      <Tooltip title="Reverse color map" open={props.disabled || props.useCategoricalPalettes ? false : undefined}>
        <IconButton
          aria-label="Reverse color map"
          style={{ marginLeft: "2px" }}
          type="link"
          disabled={props.disabled || props.useCategoricalPalettes}
          onClick={() => {
            props.onChangeRamp(props.selectedRamp, !props.reversed);
          }}
        >
          <RetweetOutlined />
        </IconButton>
      </Tooltip>
    </FlexRowAlignCenter>
  );
}
