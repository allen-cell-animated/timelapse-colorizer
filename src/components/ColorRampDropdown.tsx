import React, { ReactElement, useContext, useEffect, useMemo, useState } from "react";
import { Button, Tooltip } from "antd";
import { RetweetOutlined } from "@ant-design/icons";

import styles from "./ColorRampDropdown.module.css";
import { DEFAULT_COLOR_RAMPS } from "../constants/color_ramps";
import { AppThemeContext } from "./AppStyle";
import IconButton from "./IconButton";
import { DEFAULT_CATEGORICAL_PALETTES } from "../constants";
import { Color } from "three";

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

  ///////// Generate dropdown contents

  // Only regenerate the gradient canvas URL if the selected ramp changes!
  let selectedRamp = selectedRampData.colorRamp;
  if (props.reversed) {
    selectedRamp = selectedRamp.reverse();
  }
  const selectedRampColorUrl = useMemo(() => {
    return selectedRamp.createGradientCanvas(120, theme.controls.height).toDataURL();
  }, [props.selectedRamp, props.reversed]);

  // Memoize to avoid recalculating dropdown contents
  const dropdownContents: ReactElement[] = useMemo(() => {
    const contents: ReactElement[] = [];
    const colorRampEntries = Array.from(props.colorRamps!.entries());
    // Make a button for every color ramp
    for (let i = 0; i < props.colorRamps.size; i++) {
      // Show the name of the color ramp in the tooltip, but use its internal key for callbacks.
      const [key, colorRampData] = colorRampEntries[i];
      contents.push(
        <Tooltip title={colorRampData.name} placement="right" key={key} trigger={["hover", "focus"]}>
          <Button key={key} onClick={() => props.onChangeRamp(key, false)} rootClassName={styles.dropdownButton}>
            <img src={colorRampData.colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </Tooltip>
      );
    }
    return contents;
  }, [props.colorRamps]);

  /// Rendering

  const buttonDivClassName = styles.buttonContainer + (props.disabled ? ` ${styles.disabled}` : "");
  const dropdownContainerClassName = styles.dropdownContainer + (forceOpen ? ` ${styles.forceOpen}` : "");

  return (
    <div className={styles.colorRampSelector} ref={componentContainerRef}>
      <h3>Color map</h3>
      <div className={buttonDivClassName} style={{ marginLeft: "6px" }}>
        <Tooltip
          // Force the tooltip to be hidden (open=false) when disabled
          open={props.disabled ? false : undefined}
          title={selectedRampData.name}
          placement="right"
          trigger={["focus", "hover"]}
        >
          <Button id={styles.selectorButton} disabled={props.disabled} onClick={() => setForceOpen(!forceOpen)}>
            <img src={selectedRampColorUrl} />
          </Button>
        </Tooltip>
        <div className={dropdownContainerClassName}>{dropdownContents}</div>
      </div>
      <IconButton
        style={{ marginLeft: "2px" }}
        type="link"
        disabled={props.disabled}
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
