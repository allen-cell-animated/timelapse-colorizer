import { ColorPickerProps, GetProp } from "antd";
import { Color } from "three";

export type AntColor = Extract<GetProp<ColorPickerProps, "value">, string | { cleared: any }>;

export const threeToAntColor = (color: Color): AntColor => {
  return `#${color.getHexString()}`;
};

export const threeToAntColorWithAlpha = (color: Color, alpha: number): AntColor => {
  const hex = color.getHexString();
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${alphaHex}`;
};

export const antToThreeColor = (color: AntColor): { color: Color; alpha: number } => {
  let colorStr: string;
  if (typeof color === "object") {
    colorStr = color.toHexString();
  } else {
    colorStr = color;
  }
  if (typeof colorStr === "string") {
    const hex = colorStr.startsWith("#") ? colorStr.slice(1) : colorStr;
    const threeColor = new Color(`#${hex.slice(0, 6)}`);
    let alpha = 1;
    if (hex.length === 8) {
      alpha = parseInt(hex.slice(6, 8), 16) / 255;
    }
    return { color: threeColor, alpha };
  }
  throw new Error("Invalid color format");
};
