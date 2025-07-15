import { ColorPickerProps, GetProp } from "antd";
import { Color } from "three";

export type AntColor = Extract<GetProp<ColorPickerProps, "value">, string | { cleared: any }>;

export const threeToAntColor = (color: Color): AntColor => {
  return `#${color.getHexString()}`;
};

export const antToThreeColor = (color: AntColor): { color: Color; alpha: number } => {
  if (typeof color === "string") {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    const threeColor = new Color(`#${hex.slice(0, 6)}`);
    let alpha = 1;
    if (hex.length === 8) {
      // If the color is in ARGB format, extract the alpha channel
      alpha = parseInt(hex.slice(6, 8), 16) / 255;
    }
    return { color: threeColor, alpha };
  }
  throw new Error("Invalid color format");
};
