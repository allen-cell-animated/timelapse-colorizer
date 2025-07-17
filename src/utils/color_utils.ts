import { ColorPickerProps, GetProp } from "antd";
import { Color } from "three";

export type AntColor = Extract<GetProp<ColorPickerProps, "value">, string | { cleared: any }>;

export const threeToAntColor = (color: Color): AntColor => {
  return `#${color.getHexString()}`;
};

export const antToThreeColor = (color: AntColor): Color => {
  if (typeof color === "string") {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    return new Color(`#${hex}`);
  }
  throw new Error("Invalid color format");
};
