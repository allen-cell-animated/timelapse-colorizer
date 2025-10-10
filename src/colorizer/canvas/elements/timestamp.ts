import { Vector2 } from "three";

import {
  BaseRenderParams,
  defaultFontStyle,
  EMPTY_RENDER_INFO,
  FontStyle,
  RenderInfo,
} from "src/colorizer/canvas/types";
import { configureCanvasText, getTextDimensions, renderCanvasText } from "src/colorizer/canvas/utils";

export type TimestampStyle = FontStyle;

export type TimestampParams = BaseRenderParams & {
  visible: boolean;
  currentFrame: number;
};

export const defaultTimestampStyle: TimestampStyle = {
  ...defaultFontStyle,
};

/**
 * Calculates a timestamp based on the current timestamp configuration.
 * @param timestampOptions Configuration for the timestamp, including the frame duration,
 * current time, and maximum time.
 * @returns a string timestamp. Units for the timestamp are determined by the units
 * present in the maximum time possible. Millisecond precision will be shown if the frame
 * duration is less than a second and the max time is < 1 hour.
 *
 * Valid example timestamps:
 * - `HH:mm:ss (h, m, s)`
 * - `HH:mm (h, m)`
 * - `mm:ss (m, s)`
 * - `mm:ss.sss (m, s)`
 * - `ss (s)`
 * - `ss.sss (s)`.
 */
export function getTimestampLabel(params: TimestampParams): string | undefined {
  if (!params.dataset || !params.dataset.metadata.frameDurationSeconds) {
    return undefined;
  }

  const frameDurationSec = params.dataset.metadata.frameDurationSeconds;
  const startTimeSec = params.dataset.metadata.startTimeSeconds;
  const currTimeSec = params.currentFrame * frameDurationSec + startTimeSec;
  const maxTimeSec = params.dataset.numberOfFrames * frameDurationSec + startTimeSec;

  const useHours = maxTimeSec >= 60 * 60;
  const useMinutes = maxTimeSec >= 60;
  // Ignore seconds if the frame duration is in minute increments AND the start time is also in minute increments.
  const useSeconds = !(frameDurationSec % 60 === 0 && startTimeSec % 60 === 0);

  const timestampDigits: string[] = [];
  const timestampUnits: string[] = [];

  if (useHours) {
    const hours = Math.floor(currTimeSec / (60 * 60));
    timestampDigits.push(hours.toString().padStart(2, "0"));
    timestampUnits.push("h");
  }
  if (useMinutes) {
    const minutes = Math.floor(currTimeSec / 60) % 60;
    timestampDigits.push(minutes.toString().padStart(2, "0"));
    timestampUnits.push("m");
  }
  if (useSeconds) {
    const seconds = currTimeSec % 60;
    if (!useHours && frameDurationSec % 1.0 !== 0) {
      // Duration increment is smaller than a second and we're not showing hours, so show milliseconds.
      timestampDigits.push(seconds.toFixed(3).padStart(6, "0"));
    } else {
      timestampDigits.push(seconds.toFixed(0).padStart(2, "0"));
    }
    timestampUnits.push("s");
  }

  return timestampDigits.join(":") + " (" + timestampUnits.join(", ") + ")";
}

/**
 * Draws the timestamp, if visible, and returns a RenderInfo containing the dimensions and
 * a callback to render it to the canvas.
 */
export function getTimestampRenderer(
  ctx: CanvasRenderingContext2D,
  params: TimestampParams,
  style: TimestampStyle
): RenderInfo {
  if (!params.visible) {
    return EMPTY_RENDER_INFO;
  }
  const timestampFormatted = getTimestampLabel(params);
  if (!timestampFormatted) {
    return EMPTY_RENDER_INFO;
  }

  // Save the render function for later.
  const timestampPaddingPx = new Vector2(6, 2);
  const sizePx = new Vector2(getTextDimensions(ctx, timestampFormatted, style).x, style.fontSizePx).add(
    timestampPaddingPx.clone().multiplyScalar(2)
  );
  const render = (origin: Vector2): void => {
    const timestampOriginPx = origin.clone().add(timestampPaddingPx);
    configureCanvasText(ctx, style, "left", "top");
    renderCanvasText(ctx, timestampOriginPx.x, timestampOriginPx.y, timestampFormatted);
  };

  return {
    sizePx,
    render,
  };
}
