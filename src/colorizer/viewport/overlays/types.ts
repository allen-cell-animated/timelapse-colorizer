import type { Vector2 } from "three";

import type Collection from "src/colorizer/Collection";
import type Dataset from "src/colorizer/Dataset";

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
