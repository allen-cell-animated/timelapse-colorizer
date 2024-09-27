import { Vector2 } from "three";

import Collection from "../Collection";
import Dataset from "../Dataset";

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

export type BaseRenderParams = {
  collection: Collection | null;
  dataset: Dataset | null;
  datasetKey: string | null;
  featureKey: string | null;
  canvasWidth: number;
  canvasHeight: number;
};

export type FontStyleOptions = {
  fontSizePx: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
};

export type ContainerOptions = {
  marginPx: Vector2;
  paddingPx: Vector2;
  fill: string;
  stroke: string;
};

export const defaultStyleOptions: FontStyleOptions = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
  fontWeight: "400",
};

export const defaultContainerOptions: ContainerOptions = {
  marginPx: new Vector2(0, 0),
  paddingPx: new Vector2(0, 0),
  fill: "rgba(255, 255, 255, 1.0)",
  stroke: "rgba(203, 203, 204, 1.0)",
};
