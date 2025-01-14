/**
 * Calculates the Pearson correlation coefficient (a measurement of linear
 * correlation) between two arrays of numbers. See
 * https://en.wikipedia.org/wiki/Pearson_correlation_coefficient.
 */
function pearson(x: Float32Array, y: Float32Array): number {
  // Adapted from: https://memory.psych.mun.ca/tech/js/correlation.shtml
  if (x.length !== y.length) {
    throw new Error(
      "correlations.ts/pearson: Data arrays must have the same length when calculating correlation coefficient."
    );
  }

  const arrayLength = x.length;
  const xy = new Float32Array(arrayLength);
  const x2 = new Float32Array(arrayLength);
  const y2 = new Float32Array(arrayLength);

  let totalFiniteElements = 0;
  for (let i = 0; i < arrayLength; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      continue;
    }
    xy[i] = x[i] * y[i];
    x2[i] = x[i] * x[i];
    y2[i] = y[i] * y[i];
    totalFiniteElements++;
  }

  let sumx = 0;
  let sumy = 0;
  let sumxy = 0;
  let sumx2 = 0;
  let sumy2 = 0;

  for (let i = 0; i < arrayLength; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      continue;
    }
    sumx += x[i];
    sumy += y[i];
    sumxy += xy[i];
    sumx2 += x2[i];
    sumy2 += y2[i];
  }

  const step1 = totalFiniteElements * sumxy - sumx * sumy;
  const step2 = totalFiniteElements * sumx2 - sumx * sumx;
  const step3 = totalFiniteElements * sumy2 - sumy * sumy;
  const step4 = Math.sqrt(step2 * step3);
  const answer = step1 / step4;
  return answer;
}

/**
 * Computes a matrix of Pearson correlation coefficients between the provided
 * arrays of feature data.
 * @param featureData An array of Float32Arrays of feature data.
 * @returns a 2D matrix of correlation values between each pair of features. For
 * any indices `i` and `j`, the value at `[i][j]` (or `[j][i]`) is the
 * correlation coefficient between the `i`th and `j`th features.
 */
export function computeCorrelations(featureData: Float32Array[]): number[][] {
  const out: number[][] = [];
  // Optimization: Only calculate coefficients for [x][y] where y < x. [x][x] is
  // always 1, and [x][y] == [y][x], so we only need to calculate it once for
  // each x, y pair.
  for (let colx = 0; colx < featureData.length; colx++) {
    const row = [];
    for (let coly = 0; coly < colx; coly++) {
      // get list of values for colx and coly
      const xvals = featureData[colx];
      const yvals = featureData[coly];
      const val = pearson(xvals, yvals);
      row.push(val);
    }
    out.push(row);
  }

  // fill in remainder of diagonal with transposed values
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      out[j][i] = out[i][j];
    }
    out[i][i] = 1;
  }
  return out;
}
