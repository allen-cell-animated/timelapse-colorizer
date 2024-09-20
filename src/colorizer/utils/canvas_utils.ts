import { Vector2 } from "three";

import { FontStyleOptions } from "../types";

/**
 * Configures the canvas rendering context with the given font options.
 * @param ctx CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.
 * @param options Font style options, including weight, size, family, and color.
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
  options: FontStyleOptions,
  textAlign: CanvasTextAlign = "left",
  textBaseline: CanvasTextBaseline = "alphabetic"
): void {
  ctx.font = `${options.fontWeight} ${options.fontSizePx}px ${options.fontFamily}`;
  ctx.fillStyle = options.fontColor;
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
  // proxy for font size
  // TODO: Fix this
  const textHeight = ctx.measureText("M").width;

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
