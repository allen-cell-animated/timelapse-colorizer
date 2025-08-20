import { Vector2 } from "three";

import Collection from "../Collection";
import Dataset from "../Dataset";

/**
 * Callback to render an element to the canvas.
 * @param origin Origin of the element, in canvas pixels. Unless otherwise
 * specified, the top left corner of the element will be placed at the origin.
 */
export type RenderCallback = (origin: Vector2) => void;

export type RenderInfo = {
  /** Size of the element, in pixels. */
  sizePx: Vector2;
  /**
   * Callback to render an element to the canvas.
   * @param origin Origin of the element, in canvas pixels. Unless otherwise
   * specified, the top left corner of the element will be placed at the origin.
   */
  render: RenderCallback;
};

export const EMPTY_RENDER_INFO: RenderInfo = { sizePx: new Vector2(0, 0), render: () => {} };

export type BaseRenderParams = {
  collection: Collection | null;
  dataset: Dataset | null;
  datasetKey: string | null;
  featureKey: string | null;
  /** Dimensions of the colorized canvas, in pixels. */
  canvasSize: Vector2;
};

export type FontStyle = {
  fontSizePx: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
};

export type ContainerStyle = {
  marginPx: Vector2;
  paddingPx: Vector2;
  fill: string;
  stroke: string;
};

export const defaultFontStyle: FontStyle = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
  fontWeight: "400",
};

export const defaultContainerStyle: ContainerStyle = {
  marginPx: new Vector2(0, 0),
  paddingPx: new Vector2(0, 0),
  fill: "rgba(255, 255, 255, 1.0)",
  stroke: "rgba(203, 203, 204, 1.0)",
};
