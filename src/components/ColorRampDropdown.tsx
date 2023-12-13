import React, { ReactElement, useContext, useEffect, useMemo, useState } from "react";
import { Button, Tooltip } from "antd";
import { RetweetOutlined } from "@ant-design/icons";

import { DEFAULT_COLOR_RAMPS } from "../constants/color_ramps";
import { AppThemeContext } from "./AppStyle";
import IconButton from "./IconButton";
import { DEFAULT_CATEGORICAL_PALETTES } from "../constants";
import { Color } from "three";
import { ColorRamp } from "../colorizer";
import styles from "./ColorRampDropdown.module.css";

type ColorRampSelectorProps = {
  selectedRamp: string;
  onChangeRamp: (colorRampKey: string, reversed: boolean) => void;
  colorRamps?: typeof DEFAULT_COLOR_RAMPS;

  useCategoricalPalettes?: boolean;
  categoricalPalettes?: typeof DEFAULT_CATEGORICAL_PALETTES;
  numCategories: number;
  selectedPalette: Color[];
  onChangePalette: (newPalette: Color[]) => void;

  disabled?: boolean;
  reversed?: boolean;
};

const defaultProps: Partial<ColorRampSelectorProps> = {
  colorRamps: DEFAULT_COLOR_RAMPS,
  disabled: false,
  useCategoricalPalettes: false,
  categoricalPalettes: DEFAULT_CATEGORICAL_PALETTES,
};

/**
 * Returns whether if the two arrays are equal, where arr1[i] === arr2[i] for all i.
 */
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

/**
 * A dropdown selector for color ramp gradients.
 */
const ColorRampSelector: React.FC<ColorRampSelectorProps> = (propsInput): ReactElement => {
  const props = { ...defaultProps, ...propsInput } as Required<ColorRampSelectorProps>;
  const theme = useContext(AppThemeContext);

  // TODO: Consider refactoring this into a shared hook if this behavior is repeated again.
  // Override the open/close behavior for the dropdown so it's compatible with keyboard navigation.
  const [forceOpen, setForceOpen] = useState(false);
  const componentContainerRef = React.useRef<HTMLDivElement>(null);

  // If open, close the dropdown when focus is lost.
  useEffect(() => {
    if (!forceOpen) {
      return;
    }
    const doesContainTarget = (target: EventTarget | null): boolean => {
      return (
        (target instanceof Element &&
          componentContainerRef.current &&
          componentContainerRef.current.contains(target)) ||
        false
      );
    };
    // Handle focus loss for tab navigation
    const handleFocusLoss = (event: FocusEvent): void => {
      if (!doesContainTarget(event.relatedTarget)) {
        setForceOpen(false);
      }
    };

    componentContainerRef.current?.addEventListener("focusout", handleFocusLoss);
    return () => {
      componentContainerRef.current?.removeEventListener("focusout", handleFocusLoss);
    };
  }, [forceOpen]);

  const selectedRampData = props.colorRamps.get(props.selectedRamp);

  if (!selectedRampData || !selectedRampData.colorRamp) {
    throw new Error(`Selected color ramp name '${props.selectedRamp}' is invalid.`);
  }

  // Only regenerate the gradient canvas URL if the selected ramp changes!
  const rampImgSrc = useMemo(() => {
    let selectedRamp = selectedRampData.colorRamp;
    if (props.reversed) {
      selectedRamp = selectedRamp.reverse();
    }
    return selectedRamp.createGradientCanvas(120, theme.controls.height).toDataURL();
  }, [props.selectedRamp, props.reversed]);

  const paletteImgSrc = useMemo(() => {
    const visibleColors = props.selectedPalette.slice(0, props.numCategories);
    const colorRamp = new ColorRamp(visibleColors, true);
    return colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL();
  }, [props.useCategoricalPalettes, props.numCategories, props.selectedPalette]);

  // Determine if we're currently using a preset palette; otherwise show the "Custom" tooltip.
  let selectedPaletteName = "Custom";
  for (const [, paletteData] of props.categoricalPalettes) {
    if (arrayDeepEquals(paletteData.colors, props.selectedPalette)) {
      selectedPaletteName = paletteData.name;
      break;
    }
  }

  ///////// Generate dropdown contents

  // Memoize to avoid recalculating dropdown contents
  const rampDropdownContents: ReactElement[] = useMemo(() => {
    const contents: ReactElement[] = [];
    const colorRampEntries = Array.from(props.colorRamps!.entries());
    // Make a button for every color ramp
    for (let i = 0; i < props.colorRamps.size; i++) {
      // Show the name of the color ramp in the tooltip, but use its internal key for callbacks.
      const [key, colorRampData] = colorRampEntries[i];
      contents.push(
        <Tooltip title={colorRampData.name} placement="right" key={key} trigger={["hover", "focus"]}>
          <Button onClick={() => props.onChangeRamp(key, false)} rootClassName={styles.dropdownButton}>
            <img src={colorRampData.colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </Tooltip>
      );
    }
    return contents;
  }, [props.colorRamps]);

  const paletteDropdownContents: ReactElement[] = useMemo(() => {
    const contents: ReactElement[] = [];
    // Make a button for every palette
    const paletteEntries = Array.from(props.categoricalPalettes.entries());
    for (let i = 0; i < props.categoricalPalettes.size; i++) {
      // Show the name of the color ramp in the tooltip, but use its internal key for callbacks.
      const [key, paletteData] = paletteEntries[i];
      const visibleColors = paletteData.colors.slice(0, props.numCategories);
      const colorRamp = new ColorRamp(visibleColors, true);

      contents.push(
        <Tooltip title={paletteData.name} placement="right" key={key} trigger={["hover", "focus"]}>
          <Button
            // Changes all colors, not just the visible ones, to the palette
            onClick={() => props.onChangePalette(paletteData.colors)}
            rootClassName={styles.dropdownButton}
          >
            <img src={colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </Tooltip>
      );
    }
    return contents;
  }, [props.categoricalPalettes, props.numCategories]);

  /// Rendering

  // Swap between two image sources as needed
  const dropdownButtonImgSrc = props.useCategoricalPalettes ? paletteImgSrc : rampImgSrc;

  const buttonDivClassName = styles.buttonContainer + (props.disabled ? ` ${styles.disabled}` : "");
  let dropdownContainerClassName = styles.dropdownContainer;
  dropdownContainerClassName += forceOpen ? ` ${styles.forceOpen}` : "";

  return (
    <div className={styles.colorRampSelector} ref={componentContainerRef}>
      <h3>Color map</h3>
      <div className={buttonDivClassName} style={{ marginLeft: "6px" }}>
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={props.disabled ? false : undefined}
          title={props.useCategoricalPalettes ? selectedPaletteName : selectedRampData.name}
          placement="right"
          trigger={["focus", "hover"]}
        >
          <Button
            id={styles.selectorButton}
            className={props.useCategoricalPalettes ? styles.categorical : ""}
            disabled={props.disabled}
            onClick={() => setForceOpen(!forceOpen)}
          >
            <img src={dropdownButtonImgSrc} />
          </Button>
        </Tooltip>
        {props.useCategoricalPalettes ? (
          <div className={dropdownContainerClassName + " " + styles.categorical}>{paletteDropdownContents} </div>
        ) : (
          <div className={dropdownContainerClassName}>{rampDropdownContents}</div>
        )}
      </div>
      {/** Reverse map button */}
      <IconButton
        style={{ marginLeft: "2px" }}
        type="link"
        disabled={props.disabled || props.useCategoricalPalettes}
        onClick={() => {
          props.onChangeRamp(props.selectedRamp, !props.reversed);
        }}
      >
        <RetweetOutlined />
      </IconButton>
    </div>
  );
};
export default ColorRampSelector;
