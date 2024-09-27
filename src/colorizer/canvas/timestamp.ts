import { Vector2 } from "three";

import { BaseRenderParams, defaultStyleOptions, EMPTY_RENDER_INFO, FontStyleOptions, RenderInfo } from "./types";
import { configureCanvasText, getTextDimensions, renderCanvasText } from "./utils";

export type TimestampOptions = FontStyleOptions & {
  visible: boolean;
};

export type TimestampParams = BaseRenderParams & {
  currentFrame: number;
};

export const defaultTimestampOptions: TimestampOptions = {
  ...defaultStyleOptions,
  visible: true,
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
 * Draws the timestamp, if visible, and returns the rendered height and width.
 * @param originPx The origin of the timestamp, from the lower right corner, in pixels.
 * @returns an object with two properties:
 *  - `size`: a vector representing the width and height of the rendered scale bar, in pixels.
 *  - `render`: a callback that renders the scale bar to the canvas. Note that the origin is
 *   the bottom right corner of the timestamp.
 */
export function getTimestampRenderer(
  ctx: CanvasRenderingContext2D,
  params: TimestampParams,
  options: TimestampOptions
): RenderInfo {
  if (!options.visible) {
    return EMPTY_RENDER_INFO;
  }
  const timestampFormatted = getTimestampLabel(params);
  if (!timestampFormatted) {
    return EMPTY_RENDER_INFO;
  }

  // Save the render function for later.
  const timestampPaddingPx = new Vector2(6, 2);
  const render = (bottomRightOrigin: Vector2): void => {
    const timestampOriginPx = bottomRightOrigin.clone().sub(timestampPaddingPx);
    configureCanvasText(ctx, options, "right", "bottom");
    renderCanvasText(ctx, timestampOriginPx.x, timestampOriginPx.y, timestampFormatted);
  };

  return {
    sizePx: new Vector2(getTextDimensions(ctx, timestampFormatted, options).x, options.fontSizePx).add(
      timestampPaddingPx.clone().multiplyScalar(2)
    ),
    render,
  };
}
