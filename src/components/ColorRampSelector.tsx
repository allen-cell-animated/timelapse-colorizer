import React, { ReactElement, useContext, useMemo } from "react";
import styles from "./ColorRampSelector.module.css";
import { DEFAULT_COLOR_RAMPS } from "../constants/color_ramps";
import { Button, Tooltip } from "antd";
import { AppThemeContext } from "./AppStyle";
import OptionalTooltip from "./OptionalTooltip";

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
      let id = styles.dropdownButton;
      let className = "";
      // Manipulate class names for rounding at start and end of dropdown list
      if (i === 0) {
        id = styles.dropdownFirst;
      }
      if (i === props.colorRamps!.size - 1) {
        id = styles.dropdownLast;
      }

      // Show the name of the color ramp in the tooltip, but use its internal key for callbacks.
      const [key, colorRampData] = colorRampEntries[i];
      contents.push(
        <Tooltip title={colorRampData.name} placement="right" key={key}>
          <Button key={key} className={className} onClick={() => props.onChange(key)} id={id}>
            <img src={colorRampData.colorRamp.createGradientCanvas(120, theme.controls.height).toDataURL()} />
          </Button>
        </Tooltip>
      );
    }
    return contents;
  }, [props.colorRamps]);

  const buttonDivClassName = styles.buttonContainer + " " + (props.disabled ? styles.disabled : "");

  return (
    <div className={styles.colorRampSelector}>
      <h3>Color map</h3>
      <div className={buttonDivClassName}>
        <OptionalTooltip disabled={props.disabled} title={selectedRampData.name} placement="right">
          <Button id={styles.selectorButton} disabled={props.disabled}>
            <img src={selectedRampColorUrl} />
          </Button>
        </OptionalTooltip>
        <div className={styles.dropdownContainer}>{dropdownContents}</div>
      </div>
    </div>
  );
};
export default ColorRampSelector;
