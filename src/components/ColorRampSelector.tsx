import React, { ReactElement, ReactNode } from "react";
import styles from "./ColorRampSelector.module.css";
import { ColorRamp } from "../colorizer";
import { DEFAULT_COLOR_RAMP, DEFAULT_COLOR_RAMPS } from "../constants";

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

export default function ColorRampSelector(props: ColorRampSelectorProps): ReactElement {
  props = { ...defaultProps, ...props };

  const ramp = props.colorRamps?.get(props.selected);
  if (!ramp) {
    throw new Error("ColorRamp is undefined.");
  }

  // Generate button for color ramps
  // Example dropdown menu: https://stackblitz.com/edit/react-hpxwah?file=index.js
  const customRender = (menus: ReactNode) => {};

  if (props.disabled !== undefined && !props.disabled) {
  }
  return <></>;
}
