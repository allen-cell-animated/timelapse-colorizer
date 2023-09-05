import React, { ReactElement, ReactNode } from "react";
import styles from "./ColorRampSelector.module.css";
import { ColorRamp } from "../colorizer";
import { DEFAULT_COLOR_RAMP, DEFAULT_COLOR_RAMPS } from "../constants";
import { Button, Tooltip } from "antd";

type ColorRampSelectorProps = {
  selected: string;
  colorRamps?: Map<string, ColorRamp>;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const defaultProps: Partial<ColorRampSelectorProps> = {
  colorRamps: DEFAULT_COLOR_RAMPS,
  disabled: false,
};
const ColorRampSelector: React.FC<ColorRampSelectorProps> = (props): ReactElement => {
  props = { ...defaultProps, ...props };

  const ramp = props.colorRamps?.get(props.selected);
  if (!ramp) {
    throw new Error("ColorRamp is undefined.");
  }

  if (props.disabled !== undefined && !props.disabled) {
  }
  return (
    <div className={styles.colorRampSelector}>
      Color Ramp
      <div className={styles.buttonContainer}>
        <Button className={styles.selectorButton}>
          <img src={ramp.createGradientCanvas(120, 25).toDataURL()} />
        </Button>

        <div className={styles.hoverContainer}>
          <Tooltip title="AAAAAAAAAAAAA" placement="right">
            <Button className={styles.selectorButton + " " + styles.dropdownFirst}>
              <img src={ramp.createGradientCanvas(120, 25).toDataURL()} />
            </Button>
          </Tooltip>
          <Tooltip title={"AAAAAAA"} placement="right">
            <Button className={styles.selectorButton}>
              <img src={ramp.createGradientCanvas(120, 25).toDataURL()} />
            </Button>
          </Tooltip>
          <Button className={styles.selectorButton + " " + styles.dropdownLast}>
            <img src={ramp.createGradientCanvas(120, 25).toDataURL()} />
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ColorRampSelector;
