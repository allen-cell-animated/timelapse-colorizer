import { Vector2 } from "three";

import Track from "../Track";

/**
 * Formats a number as a string decimal with a defined number of digits
 * after the decimal place. Optionally ignores integers and returns them as-is.
 */
export function numberToStringDecimal(
  input: number | undefined | null,
  decimalPlaces: number,
  skipIntegers: boolean = true
): string {
  if (input === undefined || input === null) {
    return "NaN";
  }
  if (Number.isInteger(input) && skipIntegers) {
    return input.toString();
  }
  return input.toFixed(decimalPlaces);
}

/**
 * Returns the number with a maximum number of digits after the decimal place, rounded to nearest.
 */
export function setMaxDecimalPrecision(input: number, decimalPlaces: number): number {
  return Number.parseFloat(numberToStringDecimal(input, decimalPlaces, true));
}

// Adapted from https://gist.github.com/ArneS/2ecfbe4a9d7072ac56c0.
function digitToUnicodeSupercript(n: number): string {
  const subst = [0x2070, 185, 178, 179, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079];
  return String.fromCharCode(subst[n]);
}

function numberToUnicodeSuperscript(input: number): string {
  const prefix = input < 0 ? "⁻" : "";
  const digits = Math.abs(input).toString().split("");
  return prefix + digits.map((digit) => digitToUnicodeSupercript(parseInt(digit, 10))).join("");
}

/**
 * Remaps a value from one range to another, optionally clamping the input value to the input range.
 *
 * Handles reversed ranges (e.g. `inMin > inMax` or `outMin > outMax`). If `inMin === inMax`, returns `outMin`.
 *
 * @param clamp If true (default), clamps the input to the input range.
 */
export function remap(
  input: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamp: boolean = true
): number {
  if (clamp) {
    const min = Math.min(inMin, inMax);
    const max = Math.max(inMin, inMax);
    input = Math.min(Math.max(input, min), max);
  }
  if (inMin === inMax) {
    return outMin;
  }
  return ((input - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Converts a number to scientific notation with the specified number of significant
 * figures, handling negative numbers and rounding.
 * @param input The number to convert.
 * @param significantFigures the number of signficant figures/digits. Must be >= 1.
 * @returns a string, formatted as a number in scientific notation.
 * @example
 * ```
 * numberToSciNotation(1, 3) // "1.00×10⁰"
 * numberToSciNotation(0.99, 2) // "9.9×10⁻¹"
 * numberToSciNotation(0.999, 2) // "1.0×10⁰"
 * numberToSciNotation(-0.05, 1) // "-5×10⁻²"
 * numberToSciNotation(1400, 3) // "1.40×10³"
 * ```
 */
export function numberToSciNotation(input: number, significantFigures: number): string {
  significantFigures = Math.max(significantFigures, 1);
  const prefix = input < 0 ? "-" : "";
  input = Math.abs(input);
  // Apply precision in case it causes input to round up to the next power of 10.
  // For example, if input = 0.99 and significantFigures = 1, we want to round to 1 now.
  // Otherwise we'd get `exponent = -1` and 10×10⁻¹ instead of 1×10⁰.
  // See unit tests for validation.
  input = Number.parseFloat(input.toPrecision(significantFigures));
  if (input === 0) {
    return "0×10⁰";
  }
  const exponent = Math.floor(Math.log10(input));
  const coefficient = input / 10 ** exponent;
  return `${prefix}${coefficient.toFixed(significantFigures - 1)}×10${numberToUnicodeSuperscript(exponent)}`;
}

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

export function getDisplayDateString(date: Date): string {
  try {
    return date.toLocaleString("en-US", { timeZoneName: "short" });
  } catch {
    return date.toISOString();
  }
}

export function getBuildDisplayDateString(): string {
  return getDisplayDateString(new Date(Number.parseInt(import.meta.env.VITE_BUILD_TIME_UTC, 10)));
}

type TrackData = {
  ids: number[];
  times: number[];
  centroids: number[];
};

/**
 * Constructs an array of tracks from the given data.
 */
export function constructAllTracksFromData(trackIds: Uint32Array, times: Uint32Array, centroids: Uint16Array): Track[] {
  const trackIdToTrackData = new Map<number, TrackData>();

  for (let id = 0; id < trackIds.length; id++) {
    const trackId = trackIds[id];
    let trackData = trackIdToTrackData.get(trackId);
    if (!trackData) {
      trackData = { ids: [], times: [], centroids: [] };
      trackIdToTrackData.set(trackId, trackData);
    }
    trackData.ids.push(id);
    trackData.times.push(times[id]);
    trackData.centroids.push(centroids[id * 2], centroids[id * 2 + 1]);
  }

  // Construct and return tracks. (Tracks will also automatically sort their data by time.)
  const tracks = Array.from(trackIdToTrackData.entries()).map(([trackId, trackData]) => {
    return new Track(trackId, trackData.times, trackData.ids, trackData.centroids, [] as number[]);
  });
  return tracks;
}

/**
 * Returns a lookup from all timepoints `t` in the track to the centroid delta `t` and
 * `t-1`. If the track does not exist at timepoint `t-1`, the delta is undefined.
 */
function timeToMotionDelta(track: Track): { [key: number]: [number, number] | undefined } {
  const deltas: { [key: number]: [number, number] | undefined } = {};

  for (let i = 0; i < track.ids.length; i++) {
    const time = track.times[i];
    const prevTime = track.times[i - 1];
    if (i === 0 || prevTime !== time - 1) {
      deltas[time] = undefined;
    }

    const currentCentroidX = track.centroids[i * 2];
    const currentCentroidY = track.centroids[i * 2 + 1];
    const prevCentroidX = track.centroids[(i - 1) * 2];
    const prevCentroidY = track.centroids[(i - 1) * 2 + 1];
    deltas[time] = [currentCentroidX - prevCentroidX, currentCentroidY - prevCentroidY];
  }

  return deltas;
}

/**
 * Calculates an array of motion deltas for each object in the dataset, averaged over the specified number of timesteps.
 * @param tracks An array of all tracks in the dataset to calculate motion deltas for.
 * @param numTimesteps The number of timesteps to average over. For an object at time `t`, the motion delta will be calculated
 * over time `t` to `t - numTimesteps`.
 * @param timestepThreshold The minimum number of timesteps the object must have centroid data for (over the span from time `t`
 * to `t - numTimesteps`). Objects that do not meet this threshold will the motion deltas set to `NaN`.
 * @returns
 * - `undefined` if `numTimesteps < 1` or `numTimesteps < timestepThreshold`.
 * - an array of motion deltas, with length equal to `dataset.numObjects * 2`. For each object id `i`, the x and y components
 * of its motion delta are stored at indices `2i` and `2i + 1`, respectively. If an object does not meet the
 * the timestep threshold, both values will be `NaN`.
 */
export function calculateMotionDeltas(
  tracks: Track[],
  numTimesteps: number,
  timestepThreshold: number
): Float32Array | undefined {
  numTimesteps = Math.max(numTimesteps, 0);
  timestepThreshold = Math.max(timestepThreshold, 0);

  if (numTimesteps < 1 || numTimesteps < timestepThreshold) {
    return undefined;
  }

  // Count total objects to allocate the motion deltas array
  let numObjects = 0;
  for (const track of tracks) {
    numObjects += track.ids.length;
  }
  const motionDeltas = new Float32Array(numObjects * 2);

  for (const track of tracks) {
    const timeToDelta = timeToMotionDelta(track);

    for (let i = 0; i < track.ids.length; i++) {
      const objectId = track.ids[i];
      const timestamp = track.times[i];

      // Get all valid deltas for timepoints `t` to `t - numTimesteps`.
      const deltas: [number, number][] = [];
      for (let j = 0; j < numTimesteps; j++) {
        const delta = timeToDelta[timestamp - j];
        if (delta) {
          deltas.push(delta);
        }
      }

      // Check that the object has enough valid deltas to meet the threshold;
      // if so average and store the delta.
      if (deltas.length >= timestepThreshold) {
        const averagedDelta: [number, number] = deltas.reduce(
          (acc, delta) => [acc[0] + delta[0] / deltas.length, acc[1] + delta[1] / deltas.length],
          [0, 0]
        );
        motionDeltas[2 * objectId] = averagedDelta[0];
        motionDeltas[2 * objectId + 1] = averagedDelta[1];
      } else {
        // TODO: These may need to become Infinity for shader compatibility
        motionDeltas[2 * objectId] = NaN;
        motionDeltas[2 * objectId + 1] = NaN;
      }
    }
  }

  return motionDeltas;
}
