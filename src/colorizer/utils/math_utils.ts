import { Vector2 } from "three";

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

export type TrackData = {
  ids: number[];
  times: number[];
  centroids: number[];
};

export function makeDataOnlyTracks(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids: Uint16Array
): Map<number, TrackData> {
  const trackIdToTrackData = new Map<number, TrackData>();

  for (let i = 0; i < trackIds.length; i++) {
    const trackId = trackIds[i];
    let trackData = trackIdToTrackData.get(trackId);
    if (!trackData) {
      trackData = { ids: [], times: [], centroids: [] };
      trackIdToTrackData.set(trackId, trackData);
    }
    trackData.ids.push(i);
    trackData.times.push(times[i]);
    trackData.centroids.push(centroids[i * 2], centroids[i * 2 + 1]);
  }

  // Sort track data by time
  for (const trackData of trackIdToTrackData.values()) {
    const indices = [...trackData.times.keys()];
    indices.sort((a, b) => trackData.times[a] - trackData.times[b]);
    trackData.times = indices.map((i) => trackData.times[i]);
    trackData.ids = indices.map((i) => trackData.ids[i]);
    trackData.centroids = indices.reduce((result, i) => {
      result.push(trackData.centroids[i * 2], trackData.centroids[i * 2 + 1]);
      return result;
    }, [] as number[]);
  }
  return trackIdToTrackData;
}

/**
 * Returns a list of centroid deltas for each object ID in the track. Deltas are calculated
 * as the difference between the centroid at a timepoint and the centroid at the
 * previous timepoint. Up to `numTimesteps` deltas are returned for each object ID.
 * @param track
 * @param numTimesteps
 * @returns
 */
function getTrackMotionDeltas(track: TrackData, numTimesteps: number): { [key: number]: [number, number][] } {
  const deltas: { [key: number]: [number, number][] } = {};

  for (let i = 0; i < track.ids.length; i++) {
    const objectId = track.ids[i];
    const minTime = track.times[i] - numTimesteps;
    deltas[objectId] = [];

    for (let j = 0; j < numTimesteps; j++) {
      // Note that `track.times` is only guaranteed to be ordered, not contiguous.
      // Check for adjacent, contiguous timepoints that are within the time range.
      const currentObjectTime = track.times[i - j];
      const previousObjectTime = track.times[i - j - 1];

      if (currentObjectTime - 1 !== previousObjectTime) {
        continue;
      } else if (previousObjectTime < minTime) {
        break;
      }

      const currentCentroidX = track.centroids[(i - j) * 2];
      const currentCentroidY = track.centroids[(i - j) * 2 + 1];
      const prevCentroidX = track.centroids[(i - j - 1) * 2];
      const prevCentroidY = track.centroids[(i - j - 1) * 2 + 1];
      deltas[objectId].push([currentCentroidX - prevCentroidX, currentCentroidY - prevCentroidY]);
    }
  }
  return deltas;
}

/**
 * Calculates an array of motion deltas for each object in the dataset, averaged over the specified number of timesteps.
 * @param dataset The dataset to calculate motion deltas for.
 * @param numTimesteps The number of timepoints to average over.
 * @param timestepThreshold The minimum number of timepoints the object must have available centroid data for (our of the last
 * `numTimesteps` time points) to be included. For example, if `numTimesteps` is 3 and `timestepThreshold` is 2, the object must
 * exist for at least 2 of the last 3 timepoints to be included in the output.
 * @returns an array of motion deltas, with length equal to `dataset.numObjects * 2`. For each object id `i`, the x and y components
 * of its motion delta are stored at indices `2 * i` and `2 * i + 1`, respectively. If an object does not meet the
 * `timestepThreshold`, both values will be `NaN`.
 */
export function calculateMotionDeltas(
  tracks: TrackData[],
  numTimesteps: number,
  timestepThreshold: number
): Float32Array {
  // Count total objects to allocate the motion deltas array
  let numObjects = 0;
  for (const track of tracks) {
    numObjects += track.ids.length;
  }
  const motionDeltas = new Float32Array(numObjects * 2);

  for (const track of tracks) {
    const objectIdToDeltas = getTrackMotionDeltas(track, numTimesteps);

    for (const [stringObjectId, deltas] of Object.entries(objectIdToDeltas)) {
      const objectId = parseInt(stringObjectId, 10);

      // Check that the object has enough deltas to meet the threshold; if so
      // average and store the delta.
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
