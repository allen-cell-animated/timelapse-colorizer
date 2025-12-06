import type { Vector2 } from "three";

export const enum CanvasType {
  CANVAS_2D = "2D",
  CANVAS_3D = "3D",
}

export type Canvas2DScaleInfo = {
  type: CanvasType.CANVAS_2D;
  /**
   * Size of the frame in [0, 1] canvas coordinates, accounting for zoom.
   */
  frameSizeInCanvasCoordinates: Vector2;
  /**
   * Transforms from [0,1] space of the canvas to the [0,1] space of the frame,
   * account for zoom.
   *
   * e.g. If frame has the same aspect ratio as the canvas and zoom is set to
   * 2x, then, assuming that the [0, 0] position of the frame and the canvas are
   * in the same position, the position [1, 1] on the canvas should map to [0.5,
   * 0.5] on the frame.
   */
  canvasToFrameCoordinates: Vector2;
  /**
   * Inverse of `canvasToFrameCoordinates`. Transforms from [0,1] space of the
   * frame to the [0,1] space of the canvas, accounting for zoom.
   */
  frameToCanvasCoordinates: Vector2;

  /**
   * Panning offset,
   */
  panOffset: Vector2;
};

export type Canvas3DScaleInfo = {
  type: CanvasType.CANVAS_3D;
};

export type CanvasScaleInfo = Canvas3DScaleInfo | Canvas2DScaleInfo;
