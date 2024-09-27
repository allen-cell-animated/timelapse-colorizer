import { Vector2 } from "three";

/**
 * Callback to render an element to the canvas.
 * @param origin Origin of the element, in canvas pixels.
 * Unless otherwise specified, the origin is the top left corner of the element.
 */
export type RenderCallback = (origin: Vector2) => void;

export type RenderInfo = {
  /** Size of the element, in pixels. */
  sizePx: Vector2;
  /**
   * Callback to render an element to the canvas.
   * @param origin Origin of the element, in canvas pixels.
   * Unless otherwise specified, the origin is the top left corner of the element.
   */
  render: RenderCallback;
};

export const EMPTY_RENDER_INFO: RenderInfo = { sizePx: new Vector2(0, 0), render: () => {} };

export type FontStyleOptions = {
  fontSizePx: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
};

export const defaultStyleOptions: FontStyleOptions = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
  fontWeight: "400",
};
