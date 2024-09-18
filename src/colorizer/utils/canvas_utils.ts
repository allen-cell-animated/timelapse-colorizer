import { Vector2 } from "three";

import { FontStyleOptions } from "../types";

// See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign

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
