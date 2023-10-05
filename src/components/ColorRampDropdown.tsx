import React, { ReactElement, useContext, useEffect, useMemo, useState } from "react";
import styles from "./ColorRampDropdown.module.css";
import { DEFAULT_COLOR_RAMPS } from "../constants/color_ramps";
import { Button, Tooltip } from "antd";
import { AppThemeContext } from "./AppStyle";
import AccessibleTooltip from "./OptionalTooltip";

type ColorRampSelectorProps = {
  selected: string;
  onChange: (colorRampKey: string) => void;
  colorRamps?: typeof DEFAULT_COLOR_RAMPS;
  disabled?: boolean;
};

const defaultProps: Partial<ColorRampSelectorProps> = {
  colorRamps: DEFAULT_COLOR_RAMPS,
  disabled: false,
};

/**
 * A dropdown selector for color ramp gradients.
 */
const ColorRampSelector: React.FC<ColorRampSelectorProps> = (propsInput): ReactElement => {
  const props = { ...defaultProps, ...propsInput } as Required<ColorRampSelectorProps>;
  const theme = useContext(AppThemeContext);

  /**
   * Force the dropdown to stay open when clicked for accessibility. Close it again
   * when focus is lost.
   */
  const [forceOpen, setForceOpen] = useState(false);
  const componentContainerRef = React.useRef<HTMLDivElement>(null);

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

  const selectedRampData = props.colorRamps.get(props.selected);

  if (!selectedRampData || !selectedRampData.colorRamp) {
    throw new Error(`Selected color ramp name '${props.selected}' is invalid.`);
  }

  // Only regenerate the gradient canvas URL if the selected ramp changes!
  const selectedRamp = selectedRampData.colorRamp;
  const selectedRampColorUrl = useMemo(() => {
    return selectedRamp.createGradientCanvas(120, theme.controls.height).toDataURL();
  }, [props.selected]);

  // Memoize to avoid recalculating dropdown contents
  const dropdownContents: ReactElement[] = useMemo(() => {
    const contents: ReactElement[] = [];
    const colorRampEntries = Array.from(props.colorRamps!.entries());
    // Make a button for every color ramp
    for (let i = 0; i < props.colorRamps.size; i++) {
      // Manipulate class names for rounding at start and end of dropdown list
      let className = "";
      if (i === 0) {
        className = styles.dropdownFirst;
      }
      if (i === props.colorRamps!.size - 1) {
        className = styles.dropdownLast;
      }

      // Show the name of the color ramp in the tooltip, but use its internal key for callbacks.
      const [key, colorRampData] = colorRampEntries[i];
      contents.push(
        <AccessibleTooltip title={colorRampData.name} placement="right" key={key}>
          <Button key={key} rootClassName={className} onClick={() => props.onChange(key)} id={styles.dropdownButton}>
            <img src={colorRampData.colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </AccessibleTooltip>
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
      <div className={buttonDivClassName}>
        <AccessibleTooltip disabled={props.disabled} title={selectedRampData.name} placement="right">
          <Button id={styles.selectorButton} disabled={props.disabled} onClick={() => setForceOpen(true)}>
            <img src={selectedRampColorUrl} />
          </Button>
        </AccessibleTooltip>
        <div className={dropdownContainerClassName}>{dropdownContents}</div>
      </div>
    </div>
  );
};
export default ColorRampSelector;
