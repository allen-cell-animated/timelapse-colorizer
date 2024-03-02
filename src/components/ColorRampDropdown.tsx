import { RetweetOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { ReactElement, useContext, useEffect, useMemo, useState } from "react";
import { Color } from "three";

import {
  ColorRamp,
  ColorRampData,
  ColorRampType,
  DEFAULT_CATEGORICAL_PALETTES,
  KNOWN_COLOR_RAMPS,
  PaletteData,
} from "../colorizer";

import { AppThemeContext } from "./AppStyle";
import IconButton from "./IconButton";

import styles from "./ColorRampDropdown.module.css";

type ColorRampSelectorProps = {
  selectedRamp: string;
  onChangeRamp: (colorRampKey: string, reversed: boolean) => void;
  /**
   * The keys of the color ramps to display, in order. If `null` (default), shows all
   * the color ramps given by `knownColorRamps`.
   */
  colorRampsToDisplay?: string[] | null;
  knownColorRamps?: Map<string, ColorRampData>;

  useCategoricalPalettes?: boolean;
  categoricalPalettes?: Map<string, PaletteData>;
  numCategories: number;
  selectedPalette: Color[];
  onChangePalette: (newPalette: Color[]) => void;

  disabled?: boolean;
  reversed?: boolean;
};

const defaultProps: Partial<ColorRampSelectorProps> = {
  knownColorRamps: KNOWN_COLOR_RAMPS,
  colorRampsToDisplay: null,
  disabled: false,
  useCategoricalPalettes: false,
  categoricalPalettes: DEFAULT_CATEGORICAL_PALETTES,
};

/**
 * Returns whether the two arrays are deeply equal, where arr1[i] === arr2[i] for all i.
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

  const colorRampsToDisplay = props.colorRampsToDisplay ?? Array.from(props.knownColorRamps.keys());

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

  const selectedRampData = props.knownColorRamps.get(props.selectedRamp);

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
    const visibleColors = props.selectedPalette.slice(0, Math.max(1, props.numCategories));
    const colorRamp = new ColorRamp(visibleColors, ColorRampType.HARD_STOP);
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

  /** Generates a list of tooltip-wrapped buttons containing color ramp gradients. */
  const makeRampButtonList = (
    colorRampData: ColorRampData[],
    onClick: (rampData: ColorRampData) => void
  ): ReactElement[] => {
    const contents: ReactElement[] = [];
    for (let i = 0; i < colorRampData.length; i++) {
      contents.push(
        <Tooltip title={colorRampData[i].name} placement="right" key={i} trigger={["hover", "focus"]}>
          <Button onClick={() => onClick(colorRampData[i])} rootClassName={styles.dropdownButton}>
            <img src={colorRampData[i].colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </Tooltip>
      );
    }
    return contents;
  };

  /** The contents of the dropdown that appears when you hover over the button */
  const dropdownContents = useMemo(() => {
    if (props.useCategoricalPalettes) {
      // Make categorical palettes by converting them into color ramps.
      const onClick = (paletteData: ColorRampData): void => {
        const colors = props.categoricalPalettes.get(paletteData.key)?.colors;
        if (colors) {
          props.onChangePalette(colors);
        }
      };
      // Generate color ramps from the palettes.
      const paletteData = Array.from(props.categoricalPalettes.values());
      // Append the missing ColorRamp into the palette data so it can be handled as a ColorRampData.
      const colorRampData = paletteData.map((data) => {
        const visibleColors = data.colors.slice(0, Math.max(1, props.numCategories));
        return { ...data, colorRamp: new ColorRamp(visibleColors, ColorRampType.HARD_STOP) };
      });
      return makeRampButtonList(colorRampData, onClick);
    } else {
      // Make gradient ramps instead
      return makeRampButtonList(
        colorRampsToDisplay.map((key) => props.knownColorRamps.get(key)!),
        (rampData) => {
          props.onChangeRamp(rampData.key, false);
        }
      );
    }
  }, [
    props.knownColorRamps,
    props.colorRampsToDisplay,
    props.useCategoricalPalettes,
    props.categoricalPalettes,
    props.numCategories,
  ]);

  /// Rendering

  // Swap between two image sources as needed
  const dropdownButtonImgSrc = props.useCategoricalPalettes ? paletteImgSrc : rampImgSrc;

  const buttonDivClassName = styles.buttonContainer + (props.disabled ? ` ${styles.disabled}` : "");

  const dropdownClassNames = [styles.dropdownContainer];
  if (props.useCategoricalPalettes) {
    dropdownClassNames.push(styles.categorical);
  }
  if (forceOpen) {
    dropdownClassNames.push(styles.forceOpen);
  }
  const dropdownContainerClassName = dropdownClassNames.join(" ");

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
        <div className={dropdownContainerClassName}>{dropdownContents}</div>
      </div>
      {/** Reverse map button */}
      <Tooltip title="Reverse color map" open={props.disabled || props.useCategoricalPalettes ? false : undefined}>
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
      </Tooltip>
    </div>
  );
};
export default ColorRampSelector;
