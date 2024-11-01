// Source: https://memory.psych.mun.ca/tech/js/correlation.shtml
// Takes two arrays of numbers
function pearson(x: Float32Array, y: Float32Array): number {
  var shortestArrayLength = 0;

  if (x.length !== y.length) {
    throw new Error("x and y data arrays must have the same length");
  }
  if (x.length === y.length) {
    shortestArrayLength = x.length;
  } else if (x.length > y.length) {
    shortestArrayLength = y.length;
    console.error("x has more items in it, the last " + (x.length - shortestArrayLength) + " item(s) will be ignored");
  } else {
    shortestArrayLength = x.length;
    console.error("y has more items in it, the last " + (y.length - shortestArrayLength) + " item(s) will be ignored");
  }

  const xy = new Float32Array(shortestArrayLength);
  const x2 = new Float32Array(shortestArrayLength);
  const y2 = new Float32Array(shortestArrayLength);
  let totalFiniteElements = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      continue;
    }
    xy[i] = x[i] * y[i];
    x2[i] = x[i] * x[i];
    y2[i] = y[i] * y[i];
    totalFiniteElements++;
  }

  var sumx = 0;
  var sumy = 0;
  var sumxy = 0;
  var sumx2 = 0;
  var sumy2 = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      continue;
    }
    sumx += x[i];
    sumy += y[i];
    sumxy += xy[i];
    sumx2 += x2[i];
    sumy2 += y2[i];
  }

  var step1 = totalFiniteElements * sumxy - sumx * sumy;
  var step2 = totalFiniteElements * sumx2 - sumx * sumx;
  var step3 = totalFiniteElements * sumy2 - sumy * sumy;
  var step4 = Math.sqrt(step2 * step3);
  var answer = step1 / step4;

  return answer;
}

/**
 * Computes a correlation matrix between the provided array of feature data.
 * @returns a 2D matrix of correlation values between each pair of features.
 */
export function computeCorrelations(featureData: Float32Array[]): number[][] {
  // Given an array of feature values (Float32 arrays),
  // calculate the Pearson correlation coeffient for each pair of columns
  // and return a correlation matrix, where each object takes the form
  // {column_a, column_a, correlation}
  // Dependencies: pluck
  // number of features squared:
  const out: number[][] = [];
  for (let colx = 0; colx < featureData.length; colx++) {
    const row = [];
    for (let coly = 0; coly < colx; coly++) {
      // get list of values for colx and coly
      const xvals = featureData[colx];
      const yvals = featureData[coly];
      // const { xData, yData } = sanitizeNumericDataArrays(xvals, yvals);
      const val = pearson(xvals, yvals);
      row.push(val);
    }
    out.push(row);
  }
  for (let i = 0; i < out.length; i++) {
    // fill in remainder of diagonal with transposed values
    for (let j = 1; j < out.length; j++) {
      out[i][j] = out[j][i];
    }
    out[i][i] = 1;
  }
  return out;
}
