import { Vector2 } from "three";

import type { VectorFieldData } from "src/colorizer";
import Track from "src/colorizer/Track";

/**
 * Formats a number as a string decimal, with a maximum number of significant
 * digits after the decimal place.
 * @param input The number to format.
 * @param maxSignificantDigitsAfterDecimal The maximum number of significant
 * digits after the decimal place. If `input` is less than 1, this will be the
 * number of significant digits. If `input is greater than 1, this will be the
 * number of digits after the decimal point.
 * @param showIntegersAsDecimals If true, integers will be shown as numbers with
 * decimal points. False by default.
 * @returns A string representation of the number.
 * - If the number is `undefined` or `null`, returns `"NaN"`.
 * - If the number is an integer and `skipIntegers` is true, returns the number
 *   as a string without a decimal point.
 * - If the number is less than 1, returns the number with
 *   `maxSignificantDigitsAfterDecimal` significant digits. (using
 *   `toPrecision`).
 * - Otherwise, returns the number with `maxSignificantDigitsAfterDecimal`
 *   digits after the decimal point (using `toFixed`).
 *
 */
export function formatNumber(
  input: number | undefined | null,
  maxSignificantDigitsAfterDecimal: number,
  showIntegersAsDecimals: boolean = false
): string {
  if (input === undefined || input === null) {
    return "NaN";
  } else if (Number.isInteger(input) && !showIntegersAsDecimals) {
    return input.toString();
  } else if (Math.abs(input) < 1) {
    // For numbers less than 1, return value by precision
    return input.toPrecision(maxSignificantDigitsAfterDecimal);
  } else {
    return input.toFixed(maxSignificantDigitsAfterDecimal);
  }
}

/**
 * Returns the number with a maximum number of digits after the decimal place, rounded to nearest.
 */
export function setMaxDecimalPrecision(input: number, decimalPlaces: number): number {
  return Number.parseFloat(formatNumber(input, decimalPlaces, true));
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
export function constructAllTracksFromData(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids?: Uint16Array
): Track[] {
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
    if (centroids) {
      trackData.centroids.push(centroids[id * 3], centroids[id * 3 + 1], centroids[id * 3 + 2]);
    }
  }

  // Construct and return tracks. Tracks will automatically sort their data by time.
  const tracks = Array.from(trackIdToTrackData.entries()).map(([trackId, trackData]) => {
    return new Track(trackId, trackData.times, trackData.ids, trackData.centroids, [] as number[]);
  });
  return tracks;
}

/**
 * Returns a lookup from any timepoints `t` in the track to the position delta between the centroid
 * at time `t` and `t-1`. If the track does not exist at timepoint `t-1`, the delta is undefined.
 */
function timeToMotionDelta(track: Track): { [key: number]: [number, number, number] | undefined } {
  const deltas: { [key: number]: [number, number, number] | undefined } = {};

  // Track IDs are sorted by time, but are not guaranteed to be contiguous.
  // For each time `t`, check if `t-1` exists and then calculate the delta.
  for (let i = 0; i < track.ids.length; i++) {
    const time = track.times[i];
    const prevTime = track.times[i - 1];
    if (i === 0 || prevTime !== time - 1) {
      deltas[time] = undefined;
    }

    const currentCentroidX = track.centroids[i * 3];
    const currentCentroidY = track.centroids[i * 3 + 1];
    const currentCentroidZ = track.centroids[i * 3 + 2];
    const prevCentroidX = track.centroids[(i - 1) * 3];
    const prevCentroidY = track.centroids[(i - 1) * 3 + 1];
    const prevCentroidZ = track.centroids[(i - 1) * 3 + 2];
    deltas[time] = [
      currentCentroidX - prevCentroidX,
      currentCentroidY - prevCentroidY,
      currentCentroidZ - prevCentroidZ,
    ];
  }

  return deltas;
}

/**
 * Calculates an array of motion deltas for each object in the dataset, averaged over the specified number of timesteps.
 * @param tracks An array of all tracks in the dataset to calculate motion deltas for.
 * @param numTimeIntervals The number of time intervals to average over (minimum 1). For an object at time `t`, the motion
 * delta will be calculated over time `t` to `t - numTimeIntervals`. If the object is not present for any or all timepoints
 * in the range, the motion deltas will be `NaN`.
 * @returns one of the following:
 * - an array of motion deltas, with length equal to `dataset.numObjects * 2`. For each object id `i`, the x and y components
 * of its motion delta are stored at indices `2i` and `2i + 1`, respectively. If an object does not exist for the specified number
 * of time intervals, both values will be `NaN`.
 */
export function calculateMotionDeltas(tracks: Track[], numTimeIntervals: number): Float32Array {
  numTimeIntervals = Math.max(numTimeIntervals, 1);

  // Count total objects to allocate the motion deltas array
  let numObjects = 0;
  for (const track of tracks) {
    numObjects += track.ids.length;
  }
  const motionDeltas = new Float32Array(numObjects * 3);

  for (const track of tracks) {
    const timeToDelta = timeToMotionDelta(track);

    for (let i = 0; i < track.ids.length; i++) {
      const objectId = track.ids[i];
      const timestamp = track.times[i];

      // Get all valid deltas for timepoints `t` to `t - numTimesteps`.
      const deltas: [number, number, number][] = [];
      for (let j = 0; j < numTimeIntervals; j++) {
        const delta = timeToDelta[timestamp - j];
        if (delta) {
          deltas.push(delta);
        }
      }

      // Check that the object has enough valid deltas to meet the threshold;
      // if so average and store the delta.
      if (deltas.length === numTimeIntervals) {
        const averagedDelta: [number, number, number] = deltas.reduce(
          (acc, delta) => [
            acc[0] + delta[0] / deltas.length,
            acc[1] + delta[1] / deltas.length,
            acc[2] + delta[2] / deltas.length,
          ],
          [0, 0, 0]
        );
        motionDeltas[3 * objectId] = averagedDelta[0];
        motionDeltas[3 * objectId + 1] = averagedDelta[1];
        motionDeltas[3 * objectId + 2] = averagedDelta[2];
      } else {
        // NOTE: These may need to become Infinity for shader compatibility
        motionDeltas[3 * objectId] = NaN;
        motionDeltas[3 * objectId + 1] = NaN;
        motionDeltas[3 * objectId + 2] = NaN;
      }
    }
  }

  return motionDeltas;
}

/**
 * If the centroids data is in 2D (only x and y coords), pad the data to 3D by adding
 * a z coordinate of 0.
 * @param centroidsData
 * @param numObjects
 */
export function padCentroidsTo3d(centroidsData: Uint16Array, numObjects: number): Uint16Array {
  if (centroidsData.length === numObjects * 3) {
    return centroidsData;
  } else if (centroidsData.length === numObjects * 2) {
    const paddedCentroids = new Uint16Array(numObjects * 3);
    for (let i = 0; i < numObjects; i++) {
      paddedCentroids[i * 3] = centroidsData[i * 2];
      paddedCentroids[i * 3 + 1] = centroidsData[i * 2 + 1];
      paddedCentroids[i * 3 + 2] = 0;
    }
    return paddedCentroids;
  } else {
    console.warn(
      `padCentroidsTo3d: Length of centroids data (${centroidsData.length}) is not a multiple of the number of objects (${numObjects}).`
    );
    return centroidsData;
  }
}

function getBinIndex(value: number, range: [number, number], steps: number): number {
  const [min, max] = range;
  const stepSize = (max - min) / steps;
  const bin = Math.floor((value - min) / stepSize);
  return Math.min(Math.max(bin, 0), steps - 1);
}

function getBinValue(binIndex: number, range: [number, number], steps: number): number {
  const [min, max] = range;
  const stepSize = (max - min) / steps;
  return min + binIndex * stepSize + stepSize / 2;
}

export function calculateVectorFlowField(
  tracks: Track[],
  xFeatureData: Float32Array | Uint32Array,
  yFeatureData: Float32Array | Uint32Array,
  zFeatureData: Float32Array | Uint32Array,
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number],
  binsPerAxis: [number, number, number]
): VectorFieldData {
  const [xSteps, ySteps, zSteps] = binsPerAxis;

  const numBins = xSteps * ySteps * zSteps;
  const count = new Uint16Array(numBins);
  const xData = new Float32Array(numBins);
  const yData = new Float32Array(numBins);
  const zData = new Float32Array(numBins);
  const xPos = new Float32Array(numBins);
  const yPos = new Float32Array(numBins);
  const zPos = new Float32Array(numBins);

  for (const track of tracks) {
    for (let i0 = 0; i0 < track.ids.length; i0++) {
      const time = track.times[i0];
      const i1 = track.times.indexOf(time + 1);
      const x0Value = xFeatureData[track.ids[i0]];
      const y0Value = yFeatureData[track.ids[i0]];
      const z0Value = zFeatureData[track.ids[i0]];
      const x1Value = xFeatureData[track.ids[i1]];
      const y1Value = yFeatureData[track.ids[i1]];
      const z1Value = zFeatureData[track.ids[i1]];
      const deltaX = x1Value - x0Value;
      const deltaY = y1Value - y0Value;
      const deltaZ = z1Value - z0Value;

      const xBin = getBinIndex(x0Value, xRange, xSteps);
      const yBin = getBinIndex(y0Value, yRange, ySteps);
      const zBin = getBinIndex(z0Value, zRange, zSteps);
      const binIndex = xBin * ySteps * zSteps + yBin * zSteps + zBin;

      // TODO: This may result in float imprecision issues
      xData[binIndex] += deltaX;
      yData[binIndex] += deltaY;
      zData[binIndex] += deltaZ;
      count[binIndex]++;
    }
  }

  // Normalize by number of vectors
  for (let x = 0; x < xSteps; x++) {
    for (let y = 0; y < ySteps; y++) {
      for (let z = 0; z < zSteps; z++) {
        const binIndex = x * ySteps * zSteps + y * zSteps + z;
        if (count[binIndex] > 0) {
          xData[binIndex] /= count[binIndex];
          yData[binIndex] /= count[binIndex];
          zData[binIndex] /= count[binIndex];
        }
        xPos[binIndex] = getBinValue(x, xRange, xSteps);
        yPos[binIndex] = getBinValue(y, yRange, ySteps);
        zPos[binIndex] = getBinValue(z, zRange, zSteps);
      }
    }
  }

  return { xPos, yPos, zPos, xData, yData, zData, count };
}

export function thresholdVectorFlowFieldByCount(
  flowFieldData: VectorFieldData,
  countThreshold: number
): VectorFieldData {
  const { xPos, yPos, zPos, xData, yData, zData, count } = flowFieldData;
  const passedThreshold = Array(count.length)
    .fill(false)
    .map((_, i) => count[i] >= countThreshold);
  return {
    xPos: xPos.filter((_, i) => passedThreshold[i]),
    yPos: yPos.filter((_, i) => passedThreshold[i]),
    zPos: zPos.filter((_, i) => passedThreshold[i]),
    xData: xData.filter((_, i) => passedThreshold[i]),
    yData: yData.filter((_, i) => passedThreshold[i]),
    zData: zData.filter((_, i) => passedThreshold[i]),
    count: count.filter((_, i) => passedThreshold[i]),
  };
}
