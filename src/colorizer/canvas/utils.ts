import { Vector2 } from "three";

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
