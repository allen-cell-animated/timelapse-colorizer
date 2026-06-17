import { Vector2 } from "three";

/**
 * Calculates the size of a frame in pixels, fit within a canvas with known
 * onscreen pixel dimensions.
 * The frame is scaled to fill the canvas while maintaining its aspect ratio.
 *
 * @param canvasSizePx Size of the canvas, in pixels.
 * @param frameResolution Resolution of the frame, in pixels or units.
 * @param frameZoom The zoom level of the frame. A zoom of 1x means the frame is scaled to fit in the canvas
 * while maintaining its aspect ratio (e.g. the frame will have the width or height of the canvas).
 * A zoom of 2x means the frame is twice as large as it would be at 1x zoom.
 * @returns A tuple of `[width, height]` in pixels.
 */
export function getFrameSizeInScreenPx(canvasSizePx: Vector2, frameResolution: Vector2, frameZoom: number): Vector2 {
  const frameBaseAspectRatio = frameResolution.x / frameResolution.y;

  // Calculate base onscreen frame size in pixels by finding largest size it can be while fitting in
  // the canvas aspect ratio.
  const baseFrameWidthPx = Math.min(canvasSizePx.x, canvasSizePx.y * frameBaseAspectRatio);
  const baseFrameHeightPx = baseFrameWidthPx / frameBaseAspectRatio;

  // Scale with current zoom level
  return new Vector2(baseFrameWidthPx, baseFrameHeightPx).multiplyScalar(frameZoom);
}

/**
 * Converts a pixel offset relative to the canvas to relative frame coordinates.
 * @param frameSizeScreenPx Size of the frame in pixels, as returned by `getFrameSizeInScreenPx`.
 * @param canvasSizePx Size of the canvas, in pixels.
 * @param canvasOffsetPx Offset in pixels relative to the canvas' top left corner, as returned by
 * mouse events.
 * @param canvasPanPx Relative offset of the frame within the canvas, in normalized frame coordinates.
 * [0, 0] means the frame will be centered, while [-0.5, -0.5] means the top right corner of the frame
 *  will be centered in the canvas view.
 * @returns Offset in frame coordinates, normalized to the size of the frame. [0, 0] is the center
 * of the frame, and [0.5, 0.5] is the top right corner.
 */
export function convertCanvasOffsetPxToFrameCoords(
  canvasSizePx: Vector2,
  frameSizeScreenPx: Vector2,
  canvasOffsetPx: Vector2,
  canvasPanPx: Vector2
): Vector2 {
  // Change the offset to be relative to the center of the canvas, rather than the top left corner.
  const offsetFromCenter = new Vector2(
    // +X is flipped between the canvas and the frame, so invert the offset.
    canvasOffsetPx.x - canvasSizePx.x / 2,
    -(canvasOffsetPx.y - canvasSizePx.y / 2)
  );
  // Get the point in pixel coordinates relative to the frame
  // Adding 0 prevents `-0` from being returned.
  return new Vector2(
    offsetFromCenter.x / frameSizeScreenPx.x - canvasPanPx.x + 0,
    offsetFromCenter.y / frameSizeScreenPx.y - canvasPanPx.y + 0
  );
}
