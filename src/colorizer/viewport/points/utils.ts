import { Color } from "three";

export function getColorForId(id: number): Color {
  const r = id % 256;
  const g = Math.floor(id / 256) % 256;
  const b = Math.floor(id / (256 * 256)) % 256;
  return new Color(r / 255, g / 255, b / 255);
}
