import { Vector2 } from "three";

import { BaseRenderParams, defaultFontStyle, EMPTY_RENDER_INFO, FontStyle, RenderInfo } from "@/colorizer/canvas/types";
import { configureCanvasText, getPixelRatio, renderCanvasText } from "@/colorizer/canvas/utils";
import { numberToSciNotation } from "@/colorizer/utils/math_utils";

export type ScaleBarStyle = FontStyle & {
  minWidthPx: number;
};

export type ScaleBarParams = BaseRenderParams & {
  visible: boolean;
  frameSizeInCanvasCoordinates: Vector2;
};

export const defaultScaleBarStyle: ScaleBarStyle = {
  ...defaultFontStyle,
  minWidthPx: 80,
};

/**
 * Formats a number to be displayed in the scale bar to a reasonable number of significant digits,
 * also handling float errors.
 */
function formatScaleBarValue(value: number): string {
  if (value < 0.01 || value >= 10_000) {
    return numberToSciNotation(value, 0);
  } else if (value < 1) {
    // Fixes float error for unrepresentable values (0.30000000000004 => 0.3)
    return value.toPrecision(1);
  } else {
    // Format integers
    return value.toFixed(0);
  }
}

/**
 * Determine a reasonable width for the scale bar, in units, and the corresponding width in pixels.
 * Unit widths will always have values `nx10^m`, where `n` is 1, 2, or 5, and `m` is an integer. Pixel widths
 * will always be greater than or equal to the `scaleBarOptions.minWidthPx`.
 * @param style Configuration for the scale bar
 * @param unitsPerScreenPixel The number of units per pixel on the screen.
 * @returns An object, containing keys for the width in pixels and units.
 */
function getScaleBarWidth(
  style: ScaleBarStyle,
  unitsPerScreenPixel: number
): {
  scaleBarWidthPx: number;
  scaleBarWidthInUnits: number;
} {
  const devicePixelRatio = getPixelRatio();
  const minWidthUnits = style.minWidthPx * unitsPerScreenPixel * devicePixelRatio;
  // Here we get the power of the most significant digit (MSD) of the minimum width converted to units.
  const msdPower = Math.ceil(Math.log10(minWidthUnits));

  // Only show increments of 1, 2, and 5, because they're easier to read and reason about.
  // Get the next allowed value in the place of the MSD that is greater than the minimum width.
  // This means that the displayed unit in the scale bar only changes at its MSD.
  // Allowed scale bar values will look like this:
  // 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, ...
  const allowedIncrements = [1, 2, 5, 10];
  const msdDigit = minWidthUnits / 10 ** (msdPower - 1);
  // Find the next greatest allowed increment to the MSD digit
  const nextIncrement = allowedIncrements.find((inc) => inc >= msdDigit) || 10;
  const scaleBarWidthInUnits = nextIncrement * 10 ** (msdPower - 1);
  // Convert back into pixels for rendering.
  // Cheat very slightly by rounding to the nearest pixel for cleaner rendering.
  // Scale also by device pixel ratio so units are in terms of the screen size (and not any canvas scaling).
  const scaleBarWidthPx = Math.round(scaleBarWidthInUnits / unitsPerScreenPixel / devicePixelRatio);
  return { scaleBarWidthPx, scaleBarWidthInUnits };
}

/**
 * Draws the scale bar, if visible, and returns a RenderInfo containing the dimensions and
 * a callback to render it to the canvas.
 */
export function getScaleBarRenderer(
  ctx: CanvasRenderingContext2D,
  params: ScaleBarParams,
  style: ScaleBarStyle
): RenderInfo {
  const frameDims = params.dataset?.metadata.frameDims;
  const hasFrameDims = frameDims && frameDims.width && frameDims.height;

  if (!hasFrameDims || !params.visible) {
    return EMPTY_RENDER_INFO;
  }

  const canvasWidthInUnits = frameDims.width / params.frameSizeInCanvasCoordinates.x;
  const unitsPerScreenPixel = canvasWidthInUnits / params.canvasSize.x / getPixelRatio();

  // Get scale bar width and unit label
  const { scaleBarWidthPx, scaleBarWidthInUnits } = getScaleBarWidth(style, unitsPerScreenPixel);
  const textContent = `${formatScaleBarValue(scaleBarWidthInUnits)} ${frameDims.units}`;

  // Calculate the padding and origins for drawing and size
  const scaleBarHeight = 10;

  const renderScaleBar = (bottomRightOrigin: Vector2): void => {
    // Render the scale bar
    ctx.beginPath();
    ctx.strokeStyle = style.fontColor;
    ctx.moveTo(bottomRightOrigin.x, bottomRightOrigin.y - scaleBarHeight);
    ctx.lineTo(bottomRightOrigin.x, bottomRightOrigin.y);
    ctx.lineTo(bottomRightOrigin.x - scaleBarWidthPx, bottomRightOrigin.y);
    ctx.lineTo(bottomRightOrigin.x - scaleBarWidthPx, bottomRightOrigin.y - scaleBarHeight);
    ctx.stroke();
  };

  const textPaddingPx = new Vector2(6, 4);
  const renderScaleBarText = (bottomRightOrigin: Vector2): void => {
    const textOriginPx = new Vector2(bottomRightOrigin.x - textPaddingPx.x, bottomRightOrigin.y - textPaddingPx.y);

    configureCanvasText(ctx, style, "right", "bottom");
    renderCanvasText(ctx, textOriginPx.x, textOriginPx.y, textContent);
  };

  const sizePx = new Vector2(scaleBarWidthPx, style.fontSizePx + textPaddingPx.y * 2);
  return {
    sizePx,
    render: (origin = new Vector2(0, 0)) => {
      // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
      const bottomRightOrigin = origin.clone().add(sizePx);
      const scaleBarOrigin = bottomRightOrigin.clone().round().add(new Vector2(0.5, 0.5));
      renderScaleBar(scaleBarOrigin);
      renderScaleBarText(bottomRightOrigin);
    },
  };
}
