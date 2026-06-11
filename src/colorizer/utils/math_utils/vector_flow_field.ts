import type { FeatureData } from "src/colorizer/Dataset";
import type Track from "src/colorizer/Track";
import type { FeatureRangeData, VectorFieldData, VectorSumData } from "src/colorizer/types";

export function featureToRangeData(feature: FeatureData, bins: number): FeatureRangeData {
  return {
    data: feature.data,
    range: [feature.min, feature.max],
    bins,
  };
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
 * Sums vector deltas for objects in a 3D feature space. For all objects that
 * fall into bin `b` in the 3D feature space at any time `t`, the value of the
 * bin is the sum of all deltas between feature values at `t` and `t+1`.
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
 * @param inRangeLUT Optional lookup table indicating whether each object ID is
 * in range of current filters. If provided, only objects with `inRangeLUT[id]
 * === 1` at both time `t` and `t+1` will be included in the sums.
 * @param outliers Optional lookup table indicating whether each object ID is an
 * outlier. If provided, objects with `outliers[id] === 1` at either time `t` or
 * `t+1` will be excluded from the sums.
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
/**
 * Returns the average vector for each bin in the vector sum data by dividing
 * the summed vector by the count for each bin. If a bin has count 0, the
 * average vector will be set to NaN.
 */
export function averageVectorFlowField(vectorSumData: VectorSumData): VectorFieldData {
  const { xPos, yPos, zPos, xSum, ySum, zSum, count: intCount } = vectorSumData;
  const floatCount = new Float32Array(vectorSumData.count);
  const xData = new Float32Array(xSum.length);
  const yData = new Float32Array(ySum.length);
  const zData = new Float32Array(zSum.length);

  for (let i = 0; i < intCount.length; i++) {
    if (intCount[i] > 0) {
      xData[i] = xSum[i] / intCount[i];
      yData[i] = ySum[i] / intCount[i];
      zData[i] = zSum[i] / intCount[i];
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
/**
 * Returns a 1D Gaussian kernel. The kernel is normalized so that the sum of all values
 * is 1.
 * @param size The size of the kernel (number of values). Must be a positive odd
 * integer.
 * @param bandwidth The bandwidth (or standard deviation) of the Gaussian
 * distribution. Must be a positive number.
 * @returns An array of length `size` containing the kernel values.
 */
export function make1dGaussianKernel(size: number, bandwidth: number): number[] {
  const kernel: number[] = [];
  const mid = (size - 1) / 2;
  const bandwidthSquared = bandwidth * bandwidth;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const dist = (i - mid) ** 2;
    const value = Math.exp(-dist / (2 * bandwidthSquared));
    kernel[i] = value;
    sum += value;
  }
  // Normalize kernel so that sum of all values is 1
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  return kernel;
}
/**
 * Performs a 1D convolution on a flat, 3D array with the given kernel and
 * direction. Pads the array with 0s when sampling out of bounds.
 * @param arr 3D array to convolve, as a flat array, in ZYX order. A value at
 * coordinates (x, y, z) should be located at index `z * arrDims[0] * arrDims[1]
 * + y * arrDims[0] + x`.
 * @param arrDims The XYZ dimensions of the array, as a tuple.
 * @param kernel 1D kernel to convolve with.
 * @param direction The direction to convolve along ("x", "y", or "z").
 * @returns A new flat array containing the convolved values, in ZYX order.
 */
export function convolve1dFilter(
  arr: Float32Array | Uint32Array,
  arrDims: [number, number, number],
  kernel: number[],
  direction: "x" | "y" | "z"
): Float32Array {
  if (kernel.length === 0) {
    return new Float32Array(arr);
  }

  const output = new Float32Array(arr.length);

  const [xDim, yDim, zDim] = arrDims;
  const kernelSize = kernel.length;
  const kernelMid = Math.floor(kernelSize / 2);

  const getIndex = (x: number, y: number, z: number): number => z * xDim * yDim + y * xDim + x;

  for (let z = 0; z < zDim; z++) {
    for (let y = 0; y < yDim; y++) {
      for (let x = 0; x < xDim; x++) {
        let value = 0;
        for (let k = 0; k < kernelSize; k++) {
          const offset = k - kernelMid;
          const weight = kernel[k];
          const sampleX = direction === "x" ? x + offset : x;
          const sampleY = direction === "y" ? y + offset : y;
          const sampleZ = direction === "z" ? z + offset : z;
          // Skip out-of-bounds samples
          if (sampleX < 0 || sampleX >= xDim || sampleY < 0 || sampleY >= yDim || sampleZ < 0 || sampleZ >= zDim) {
            continue;
          }
          const arrValue = arr[getIndex(sampleX, sampleY, sampleZ)] || 0;
          value += weight * arrValue;
        }
        output[getIndex(x, y, z)] = value;
      }
    }
  }
  return output;
}
/**
 * Performs a convolution on a flat, 3D array given a series of 1D kernels for
 * each dimension.
 * @param arr 3D array to convolve, as a flat array, in ZYX order. A value at
 * coordinates (x, y, z) should be located at index `z * arrDims[0] * arrDims[1]
 * + y * arrDims[0] + x`.
 * @param arrDims The XYZ dimensions of the array, as a tuple.
 * @param kernelX 1D kernel to convolve with along the X axis.
 * @param kernelY 1D kernel to convolve with along the Y axis.
 * @param kernelZ 1D kernel to convolve with along the Z axis.
 * @returns A new flat array containing the convolved values, in ZYX order.
 */
function convolveSeparableFilters(
  arr: Float32Array | Uint32Array,
  arrDims: [number, number, number],
  kernelX: number[],
  kernelY: number[],
  kernelZ: number[]
): Float32Array {
  let output: Float32Array;

  output = convolve1dFilter(arr, arrDims, kernelX, "x");
  output = convolve1dFilter(output, arrDims, kernelY, "y");
  output = convolve1dFilter(output, arrDims, kernelZ, "z");

  return output;
}
/**
 * Returns a locally-weighted, smoothed average for the vector flow field data.
 * Uses a series of separable 1D kernels for each dimension for performance;
 * ideally, this should be a series of 1D Gaussian kernels (see
 * `make1dGaussianKernel`).
 *
 *  This approximates the Nadaraya-Watson kernel regression
 * (https://en.wikipedia.org/wiki/Kernel_regression).
 *
 * @param vectorSumData The summed vector field data.
 * @param binsPerAxis The number of bins per axis, as a tuple.
 * @param kernelX 1D kernel to convolve with along the X axis.
 * @param kernelY 1D kernel to convolve with along the Y axis.
 * @param kernelZ 1D kernel to convolve with along the Z axis.
 * @param thresholdCount Minimum count threshold for valid data. Bins with fewer
 * than this threshold will be set to NaN.
 * @returns The smoothed vector field data.
 */
export function kernelSmoothVectorFlowField(
  vectorSumData: VectorSumData,
  binsPerAxis: [number, number, number],
  kernelX: number[],
  kernelY: number[],
  kernelZ: number[],
  thresholdCount: number = 0.1
): VectorFieldData {
  const { xPos, yPos, zPos, xSum, ySum, zSum, count: rawCountData } = vectorSumData;

  const xData = new Float32Array(xSum.length);
  const yData = new Float32Array(ySum.length);
  const zData = new Float32Array(zSum.length);
  const count = new Float32Array(rawCountData.length);

  count.set(convolveSeparableFilters(rawCountData, binsPerAxis, kernelX, kernelY, kernelZ));
  xData.set(convolveSeparableFilters(xSum, binsPerAxis, kernelX, kernelY, kernelZ));
  yData.set(convolveSeparableFilters(ySum, binsPerAxis, kernelX, kernelY, kernelZ));
  zData.set(convolveSeparableFilters(zSum, binsPerAxis, kernelX, kernelY, kernelZ));

  // Divide feature data by smoothed countData
  for (let i = 0; i < count.length; i++) {
    if (count[i] <= thresholdCount) {
      xData[i] = NaN;
      yData[i] = NaN;
      zData[i] = NaN;
      continue;
    }
    xData[i] /= count[i];
    yData[i] /= count[i];
    zData[i] /= count[i];
  }
  return { xPos, yPos, zPos, xData, yData, zData, count };
}
