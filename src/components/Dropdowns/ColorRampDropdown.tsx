import { RetweetOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { type ReactElement, useContext, useMemo } from "react";
import styled from "styled-components";
import type { Color } from "three";
import { clamp } from "three/src/math/MathUtils";

import {
  ColorRamp,
  type ColorRampData,
  ColorRampType,
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  KNOWN_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
  type PaletteData,
} from "src/colorizer";
import IconButton from "src/components/Buttons/IconButton";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRowAlignCenter } from "src/styles/utils";

import SelectionDropdown from "./SelectionDropdown";
import type { SelectItem } from "./types";

const SELECTED_RAMP_ITEM_KEY = "__selected_ramp__";
const CUSTOM_PALETTE_ITEM_KEY = "__custom__";
const DROPDOWN_CONTROL_WIDTH_PX = 28;
// Clamp max colors
const DROPDOWN_CONTROL_MAX_COLORS = 10;

const DROPDOWN_MENU_WIDTH_PX = 118;
const DROPDOWN_DEFAULT_BORDER_PX = 1;
const DROPDOWN_CATEGORICAL_BORDER_PX = 2;

const ReverseIconButton = styled(IconButton)`
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  // Remove 6px gap + 1px border overlap between button and dropdown
  margin-left: -7px;
  border-color: var(--color-borders);
  border-left-color: transparent;

  &&:not(:disabled):hover {
    border-color: var(--color-button);
  }

  &&:not(:disabled):active {
    border-color: var(--color-button-active);
  }
`;

const DropdownStyleContainer = styled.div<{ $categorical: boolean }>`
  --width: ${DROPDOWN_CONTROL_WIDTH_PX}px;
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
    width: ${DROPDOWN_MENU_WIDTH_PX}px;
  }

  & .react-select__control {
    // Remove right border radius to merge visually with reverse button
    border-radius: 6px 0 0 6px;
    & img {
      border-radius: 5px 0 0 5px;
      outline: var(--outline-width-unselected) solid var(--color-text-button);
      outline-offset: calc(0px - var(--outline-width-unselected));
    }
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
  // Config
  id: string | undefined;
  label?: string;
  disabled?: boolean;
  colorRampToImageUrl?: (colorRamp: ColorRamp) => string;

  // Color ramp
  selectedRamp: string;
  reversed?: boolean;
  mirror?: boolean;
  onChangeRamp: (colorRampKey: string, reversed: boolean) => void;
  /** The keys of the color ramps to display, in order. */
  colorRampsToDisplay: string[];
  /**
   * All known and displayable color ramps. This is a superset of
   * `colorRampsToDisplay` and may include additional ramps, such as deprecated
   * ramps that are hidden on the UI.
   */
  knownColorRamps?: Map<string, ColorRampData>;

  // Categorical palette selection
  /** If true, shows the categorical palettes and selected palette instead of
   * the color ramps. */
  useCategoricalPalettes?: boolean;
  selectedPalette?: Color[];
  selectedPaletteKey?: string | null;
  onChangePalette?: (newPalette: Color[]) => void;
  numCategories?: number;
  categoricalPalettesToDisplay?: string[];
  knownCategoricalPalettes?: Map<string, PaletteData>;
};

const defaultProps: Partial<ColorRampSelectionProps> = {
  knownColorRamps: KNOWN_COLOR_RAMPS,
  disabled: false,
  useCategoricalPalettes: false,
  knownCategoricalPalettes: KNOWN_CATEGORICAL_PALETTES,
  selectedPalette: KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!.colors,
  selectedPaletteKey: DEFAULT_CATEGORICAL_PALETTE_KEY,
  numCategories: 5,
  categoricalPalettesToDisplay: DISPLAY_CATEGORICAL_PALETTE_KEYS,
};

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
      const gradientWidthPx = DROPDOWN_MENU_WIDTH_PX - 2 * DROPDOWN_DEFAULT_BORDER_PX;
      return {
        value: key,
        label: rampData.name,
        image: rampData.colorRamp
          .createGradientCanvas(gradientWidthPx, theme.controls.height, {
            reverse: rampData.reverseByDefault,
            mirror: props.mirror,
          })
          .toDataURL(),
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
      const colorRamp = new ColorRamp(visibleColors, ColorRampType.CATEGORICAL);
      const gradientWidthPx = DROPDOWN_MENU_WIDTH_PX - 2 * DROPDOWN_CATEGORICAL_BORDER_PX;
      const dataUrl = colorRamp.createGradientCanvas(gradientWidthPx, theme.controls.height).toDataURL();
      colorRamp.dispose();
      return {
        value: key,
        label: paletteData.name,
        image: dataUrl,
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
    let borderWidthPx = DROPDOWN_DEFAULT_BORDER_PX;
    if (selectedRamp.type === ColorRampType.CATEGORICAL) {
      borderWidthPx = DROPDOWN_CATEGORICAL_BORDER_PX;
      // Clamp number of colors due to smaller dropdown size
      const visibleColors = selectedRamp.colorStops.slice(0, DROPDOWN_CONTROL_MAX_COLORS);
      selectedRamp.dispose();
      selectedRamp = new ColorRamp(visibleColors, ColorRampType.CATEGORICAL);
    }
    const gradientWidthPx = DROPDOWN_MENU_WIDTH_PX - 2 * borderWidthPx;
    const dataUrl = selectedRamp
      .createGradientCanvas(gradientWidthPx, theme.controls.height, { mirror: props.mirror })
      .toDataURL();
    selectedRamp.dispose();
    return dataUrl;
  }, [props.selectedRamp, props.reversed, props.mirror]);

  const showAsReversed = props.reversed !== !!selectedRampData.reverseByDefault;
  const selectedRampItem = {
    value: SELECTED_RAMP_ITEM_KEY,
    label: selectedRampData.name + (showAsReversed ? " (reversed)" : ""),
    image: rampImgSrc,
    tooltip: selectedRampData.name + (showAsReversed ? " (reversed)" : ""),
  };

  const paletteImgSrc = useMemo(() => {
    const visibleColorCount = clamp(props.numCategories, 1, DROPDOWN_CONTROL_MAX_COLORS);
    const visibleColors = props.selectedPalette.slice(0, visibleColorCount);
    const colorRamp = new ColorRamp(visibleColors, ColorRampType.CATEGORICAL);
    const dataUrl = colorRamp
      .createGradientCanvas(DROPDOWN_MENU_WIDTH_PX - DROPDOWN_CATEGORICAL_BORDER_PX, theme.controls.height)
      .toDataURL();
    colorRamp.dispose();
    return dataUrl;
  }, [props.useCategoricalPalettes, props.numCategories, props.selectedPalette]);

  // Check if palette colors match an existing one; otherwise, mark it as being
  // custom.
  const selectedPaletteKey = props.selectedPaletteKey ?? CUSTOM_PALETTE_ITEM_KEY;
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
    const rampData = props.knownColorRamps.get(key);
    const reverse = rampData?.reverseByDefault ?? false;
    props.onChangeRamp(key, reverse);
  };

  return (
    <FlexRowAlignCenter $gap={4}>
      <DropdownStyleContainer $categorical={props.useCategoricalPalettes}>
        <SelectionDropdown
          disabled={props.disabled}
          items={props.useCategoricalPalettes ? paletteItems : rampItems}
          id={props.id}
          // TODO: If the dropdown is reused elsewhere where no label is used
          // (e.g. in settings), allow passing in the id of a labeling element.
          label={props.label}
          selected={props.useCategoricalPalettes ? selectedPaletteItem : selectedRampItem}
          onChange={props.useCategoricalPalettes ? onChangePalette : onChangeRamp}
          controlWidth={`${DROPDOWN_CONTROL_WIDTH_PX}px`}
          menuWidth={`${DROPDOWN_MENU_WIDTH_PX}px`}
          isSearchable={false}
          controlTooltipPlacement="top"
          selectStyles={{
            // Hide dropdown indicator since the dropdown is too small for it
            dropdownIndicator: () => ({ display: "none" }),
          }}
        >
          {/** Reverse map button */}
          <Tooltip title="Reverse color map" open={props.disabled || props.useCategoricalPalettes ? false : undefined}>
            <ReverseIconButton
              aria-label="Reverse color map"
              type="outlined"
              disabled={props.disabled || props.useCategoricalPalettes}
              onClick={() => {
                props.onChangeRamp(props.selectedRamp, !props.reversed);
              }}
            >
              <RetweetOutlined />
            </ReverseIconButton>
          </Tooltip>
        </SelectionDropdown>
      </DropdownStyleContainer>
    </FlexRowAlignCenter>
  );
}
