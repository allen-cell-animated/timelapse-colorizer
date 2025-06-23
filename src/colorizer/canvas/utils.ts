import { Vector2 } from "three";

import { Canvas2DScaleInfo, CanvasType } from "../types";
import { FontStyle } from "./types";

export function getTextDimensions(ctx: CanvasRenderingContext2D, text: string, style: FontStyle): Vector2 {
  configureCanvasText(ctx, style);
  const textWidth = ctx.measureText(text).width;
  return new Vector2(textWidth, style.fontSizePx);
}

export function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Configures the canvas rendering context with the given font style.
 * @param ctx CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.
 * @param style Font style options, including weight, size, family, and color.
 * @param textAlign Text alignment. Default is "left". Valid values are "start", "end",
 *   "left", "right", and "center". See
 *   https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign
 *   for more details.
 * @param textBaseline Text baseline (vertical alignment). Default is "alphabetic".
 *   Valid values are "top", "hanging", "middle", "alphabetic", "ideographic", and "bottom".
 *   See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline
 *   for more details.
 */
export function configureCanvasText(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: FontStyle,
  textAlign: CanvasTextAlign = "left",
  textBaseline: CanvasTextBaseline = "alphabetic"
): void {
  ctx.font = `${style.fontWeight} ${style.fontSizePx}px ${style.fontFamily}`;
  ctx.fillStyle = style.fontColor;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
}

/**
 * Renders text to the canvas context. Optionally truncates text if it exceeds
 * a set maximum width.
 * @param ctx CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.
 * @param x X origin of the text. Horizontal alignment can be set using
 *   `configureCanvasText()`.
 * @param y Y origin of the text. Vertical alignment can be set using
 *   `configureCanvasText()`.
 * @param text Text string to render.
 * @param options Optional configuration. Contains the following properties:
 *   - `maxWidth`: Maximum width of the text in pixels. If the text exceeds this width, it
 *     will be truncated using ellipses.
 * @returns the width and height of the rendered text in pixels.
 */
export function renderCanvasText(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  options?: { maxWidth?: number }
): Vector2 {
  const maxWidth = options?.maxWidth ?? Infinity;
  let textWidth = ctx.measureText(text).width;

  // Use placeholder text ("Hg") to keep ascending and descending text height consistent.
  // This may be inaccurate for some fonts.
  const textHeightMeasure = ctx.measureText("Hg");
  const textHeight = textHeightMeasure.actualBoundingBoxAscent + textHeightMeasure.actualBoundingBoxDescent;

  if (textWidth > maxWidth) {
    const ellipsis = "...";
    let truncatedText = text.slice(0, -1) + ellipsis;
    while (textWidth > maxWidth && truncatedText.length > 0) {
      truncatedText = truncatedText.slice(0, -1);
      textWidth = ctx.measureText(truncatedText + ellipsis).width;
    }
    text = truncatedText + ellipsis;
  }
  ctx.fillText(text, x, y);

  return new Vector2(textWidth, textHeight);
}

export function get2DCanvasScaling(
  frameResolution: Vector2,
  canvasResolution: Vector2,
  zoomMultiplier: number
): Canvas2DScaleInfo {
  // Both the frame and the canvas have coordinates in a range of [0, 1] in the
  // x and y axis. However, the canvas may have a different aspect ratio than
  // the frame, so we need to scale the frame to fit within the canvas while
  // maintaining the aspect ratio.
  const canvasAspect = canvasResolution.x / canvasResolution.y;
  const frameAspect = frameResolution.x / frameResolution.y;
  const unscaledFrameSizeInCanvasCoords: Vector2 = new Vector2(1, 1);
  if (canvasAspect > frameAspect) {
    // Canvas has a wider aspect ratio than the frame, so proportional height is
    // 1 and we scale width accordingly.
    unscaledFrameSizeInCanvasCoords.x = canvasAspect / frameAspect;
  } else {
    unscaledFrameSizeInCanvasCoords.y = frameAspect / canvasAspect;
  }

  // Get final size by applying the current zoom level, where `zoomMultiplier=2`
  // means the frame is 2x larger than its base size. Save this to use when
  // calculating onscreen units (e.g. with the scale bar).
  const frameSizeInCanvasCoordinates = unscaledFrameSizeInCanvasCoords.clone().multiplyScalar(zoomMultiplier);
  // Transforms from [0, 1] space of the canvas to the [0, 1] space of the frame
  // by dividing by the zoom level.
  // ex: Let's say our frame has the same aspect ratio as the canvas, but our
  // zoom is set to 2x. Assuming that the [0, 0] position of the frame and the
  // canvas are in the same position, the position [1, 1] on the canvas should
  // map to [0.5, 0.5] on the frame.
  const canvasToFrameCoordinates = unscaledFrameSizeInCanvasCoords.clone().divideScalar(zoomMultiplier);

  // Invert to get the frame to canvas coordinates. Useful for objects (e.g.
  // line mesh vertices) that are in frame coordinates and need to be drawn on
  // the canvas.
  const frameToCanvasCoordinates = new Vector2(1 / canvasToFrameCoordinates.x, 1 / canvasToFrameCoordinates.y);

  return {
    type: CanvasType.CANVAS_2D,
    frameSizeInCanvasCoordinates,
    canvasToFrameCoordinates,
    frameToCanvasCoordinates,
  };
}

/** Rounds a number to the nearest even integer. */
export function toEven(value: number): number {
  return Math.round(value / 2) * 2;
}
