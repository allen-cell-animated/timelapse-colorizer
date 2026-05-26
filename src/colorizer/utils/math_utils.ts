import { Vector2 } from "three";

import type { VectorFieldData, VectorSumData } from "src/colorizer";
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

export function getBinIndex(value: number, range: [number, number], steps: number): number {
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);
  if (min === max || steps <= 0) {
    return 0;
  }
  const stepSize = (max - min) / steps;
  const bin = Math.floor((value - min) / stepSize);
  return Math.min(Math.max(bin, 0), steps - 1);
}

export function getBinValue(binIndex: number, range: [number, number], steps: number): number {
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);
  if (min === max || steps <= 0) {
    return min;
  }
  const stepSize = (max - min) / steps;
  return min + (binIndex + 0.5) * stepSize;
}

/**
 * Sums vector deltas for objects in a 3D feature space. For each bin in the 3D
 * feature space, the value is the sum of the delta between feature values at
 * any time `t` and `t+1` for all objects that fall into the bin at time `t`.
 * @param tracks Array of tracks, where each track contains object IDs and their
 * corresponding timepoints.
 * @param xFeatureData Flat feature data array where the value for object ID `i`
 * is at index `i`.
 * @param yFeatureData Flat feature data array where the value for object ID `i`
 * is at index `i`.
 * @param zFeatureData Flat feature data array where the value for object ID `i`
 * is at index `i`.
 * @param xRange Range of values for the X dimension, as a tuple [min, max].
 * @param yRange Range of values for the Y dimension, as a tuple [min, max].
 * @param zRange Range of values for the Z dimension, as a tuple [min, max].
 * @param binsPerAxis Number of bins per axis, as a tuple [xBins, yBins, zBins].
 * @returns VectorSumData containing the summed vectors.
 */
export function binAndSumFeatureVectors(
  tracks: Track[],
  xFeatureData: Float32Array | Uint32Array,
  yFeatureData: Float32Array | Uint32Array,
  zFeatureData: Float32Array | Uint32Array,
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number],
  binsPerAxis: [number, number, number],
  inRangeLUT: Uint8Array | undefined = undefined,
  outliers: Uint8Array | undefined = undefined
): VectorSumData {
  const [xSteps, ySteps, zSteps] = binsPerAxis;

  const numBins = xSteps * ySteps * zSteps;
  const count = new Uint32Array(numBins);
  const xSum = new Float32Array(numBins);
  const ySum = new Float32Array(numBins);
  const zSum = new Float32Array(numBins);
  const xPos = new Float32Array(numBins);
  const yPos = new Float32Array(numBins);
  const zPos = new Float32Array(numBins);

  for (const track of tracks) {
    for (let i = 0; i < track.ids.length - 1; i++) {
      // Times are in sorted order, check if the next timepoint exists
      if (track.times[i] + 1 !== track.times[i + 1]) {
        continue;
      }
      const id0 = track.ids[i];
      const id1 = track.ids[i + 1];
      if (inRangeLUT && (!inRangeLUT[id0] || !inRangeLUT[id1])) {
        continue;
      }
      if (outliers && (outliers[id0] || outliers[id1])) {
        continue;
      }

      const x0Value = xFeatureData[id0];
      const y0Value = yFeatureData[id0];
      const z0Value = zFeatureData[id0];
      const x1Value = xFeatureData[id1];
      const y1Value = yFeatureData[id1];
      const z1Value = zFeatureData[id1];
      const deltaX = x1Value - x0Value;
      const deltaY = y1Value - y0Value;
      const deltaZ = z1Value - z0Value;

      const xBin = getBinIndex(x0Value, xRange, xSteps);
      const yBin = getBinIndex(y0Value, yRange, ySteps);
      const zBin = getBinIndex(z0Value, zRange, zSteps);
      const binIndex = xBin + yBin * xSteps + zBin * xSteps * ySteps;

      // TODO: This may result in float imprecision issues
      xSum[binIndex] += deltaX;
      ySum[binIndex] += deltaY;
      zSum[binIndex] += deltaZ;
      count[binIndex]++;
    }
  }

  for (let z = 0; z < zSteps; z++) {
    for (let y = 0; y < ySteps; y++) {
      for (let x = 0; x < xSteps; x++) {
        const binIndex = x + y * xSteps + z * xSteps * ySteps;
        xPos[binIndex] = getBinValue(x, xRange, xSteps);
        yPos[binIndex] = getBinValue(y, yRange, ySteps);
        zPos[binIndex] = getBinValue(z, zRange, zSteps);
        // TODO: add some random jitter here to avoid moire pattern
      }
    }
  }

  return { xPos, yPos, zPos, xSum, ySum, zSum, count };
}

export function normalizeVectorFlowFieldData(vectorSumData: VectorSumData): VectorFieldData {
  const { xPos, yPos, zPos, xSum, ySum, zSum, count: intCount } = vectorSumData;
  const floatCount = new Float32Array(vectorSumData.count);
  const xData = new Float32Array(xSum.length);
  const yData = new Float32Array(ySum.length);
  const zData = new Float32Array(zSum.length);

  for (let i = 0; i < intCount.length; i++) {
    if (intCount[i] > 0) {
      xData[i] = xSum[i]; // / intCount[i];
      yData[i] = ySum[i]; // / intCount[i];
      zData[i] = zSum[i]; // / intCount[i];
    } else {
      xData[i] = NaN;
      yData[i] = NaN;
      zData[i] = NaN;
    }
  }
  return { xPos, yPos, zPos, xData, yData, zData, count: floatCount };
}

/** Removes bins with 0 count or NaN/Infinity values. */
export function filterVectorFlowFieldData(flowFieldData: VectorFieldData): VectorFieldData {
  const { xPos, yPos, zPos, xData, yData, zData, count } = flowFieldData;
  // Filter out 0-count bins or NaN/Infinity values
  const validBins = Array.from(count).map(
    (c, i) => c > 0 && isFinite(xData[i]) && isFinite(yData[i]) && isFinite(zData[i])
  );
  const filteredXPos = xPos.filter((_, i) => validBins[i]);
  const filteredYPos = yPos.filter((_, i) => validBins[i]);
  const filteredZPos = zPos.filter((_, i) => validBins[i]);
  const filteredXData = xData.filter((_, i) => validBins[i]);
  const filteredYData = yData.filter((_, i) => validBins[i]);
  const filteredZData = zData.filter((_, i) => validBins[i]);
  const filteredCount = count.filter((_, i) => validBins[i]);
  return {
    xPos: filteredXPos,
    yPos: filteredYPos,
    zPos: filteredZPos,
    xData: filteredXData,
    yData: filteredYData,
    zData: filteredZData,
    count: filteredCount,
  };
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

export function make3dGaussianKernel(size: number, bandwidth: number): number[][][] {
  const kernel: number[][][] = [];
  for (let x = 0; x < size; x++) {
    kernel[x] = [];
    for (let y = 0; y < size; y++) {
      kernel[x][y] = [];
    }
  }

  const mid = (size - 1) / 2;
  const bandwidthSquared = bandwidth * bandwidth;
  let sum = 0;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        // f(x) = exp(-dist^2 / (2 * bandwidth^2))
        const dist = (x - mid) ** 2 + (y - mid) ** 2 + (z - mid) ** 2;
        const value = Math.exp(-dist / (2 * bandwidthSquared)) / Math.sqrt(2 * Math.PI * bandwidthSquared);
        kernel[x][y][z] = value;
        sum += value;
      }
    }
  }
  // Normalize kernel so that sum of all values is 1
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        kernel[x][y][z] /= sum;
      }
    }
  }
  return kernel;
}

function isInBounds(x: number, y: number, z: number, xSteps: number, ySteps: number, zSteps: number): boolean {
  return x >= 0 && x < xSteps && y >= 0 && y < ySteps && z >= 0 && z < zSteps;
}

function convolve(
  arr: Float32Array | Uint32Array,
  binsPerAxis: [number, number, number],
  kernel: number[][][],
  arrWeight?: Float32Array
): Float32Array {
  const output = new Float32Array(arr.length);

  const [xSteps, ySteps, zSteps] = binsPerAxis;
  const kernelSize = kernel.length;
  const kernelMid = Math.floor(kernelSize / 2);

  for (let z = 0; z < zSteps; z++) {
    for (let y = 0; y < ySteps; y++) {
      for (let x = 0; x < xSteps; x++) {
        let sum = 0;
        let sumWeight = 0;
        for (let k = 0; k < kernelSize; k++) {
          for (let j = 0; j < kernelSize; j++) {
            for (let i = 0; i < kernelSize; i++) {
              // Skip if kernel index is out of bounds of the input array
              const kernelValue = kernel[i][j][k];
              const xIndex = x + i - kernelMid;
              const yIndex = y + j - kernelMid;
              const zIndex = z + k - kernelMid;
              if (isInBounds(xIndex, yIndex, zIndex, xSteps, ySteps, zSteps)) {
                const index = zIndex * ySteps * xSteps + yIndex * xSteps + xIndex;
                // Optional weighting of input values.
                // TODO: Remove?
                const weight = arrWeight ? arrWeight[index] : 1;
                sum += arr[index] * weight * kernelValue;
                sumWeight += kernelValue;
              }
            }
          }
        }
        const outputIndex = z * ySteps * xSteps + y * xSteps + x;
        output[outputIndex] = sumWeight > 0 ? sum / sumWeight : 0;
      }
    }
  }
  return output;
}

export function convolveVectorFlowField(
  flowFieldData: VectorSumData,
  binsPerAxis: [number, number, number],
  kernel: number[][][]
): VectorFieldData {
  const { xPos, yPos, zPos, xSum, ySum, zSum, count: rawCountData } = flowFieldData;

  const xData = new Float32Array(xSum.length);
  const yData = new Float32Array(ySum.length);
  const zData = new Float32Array(zSum.length);
  const count = new Float32Array(rawCountData.length);

  count.set(convolve(rawCountData, binsPerAxis, kernel));
  xData.set(convolve(xSum, binsPerAxis, kernel));
  yData.set(convolve(ySum, binsPerAxis, kernel));
  zData.set(convolve(zSum, binsPerAxis, kernel));

  // Divide feature data by smoothed countData
  for (let i = 0; i < count.length; i++) {
    if (count[i] > 0.1) {
      xData[i] /= count[i];
      yData[i] /= count[i];
      zData[i] /= count[i];
    }
  }

  return { xPos, yPos, zPos, xData, yData, zData, count: count };
}
