import { describe, expect, it } from "vitest";

import { computeCorrelations, pearson } from "../src/colorizer/utils/correlation";
import { ANY_ERROR } from "./test_utils";

describe("pearson", () => {
  it("handles empty arrays", () => {
    expect(pearson(new Float32Array(0), new Float32Array(0))).toBe(0);
  });

  it("throws an error if arrays are of different length", () => {
    expect(() => {
      pearson(new Float32Array([1, 4]), new Float32Array([1, 2, 3]));
    }).toThrowError(ANY_ERROR);
  });

  it("determines positive correlations", () => {
    const data1 = new Float32Array([1, 2, 3, 4, 5]);
    const data2 = new Float32Array([1, 2, 3, 4, 5]);
    expect(pearson(data1, data2)).toBeCloseTo(1);

    const data3 = new Float32Array([6, 14, 15, 76, 80]);
    expect(pearson(data1, data3)).toBeCloseTo(0.909);
    expect(pearson(data3, data1)).toBeCloseTo(0.909);
  });

  it("determines negative correlations", () => {
    const data1 = new Float32Array([1, 2, 3, 4, 5]);
    const data2 = new Float32Array([5, 4, 3, 2, 1]);
    expect(pearson(data1, data2)).toBeCloseTo(-1);

    const data3 = new Float32Array([100, 99, 60, 20, -4]);
    expect(pearson(data1, data3)).toBeCloseTo(-0.9735);
    expect(pearson(data3, data1)).toBeCloseTo(-0.9735);
  });

  it("handles arrays of length 1", () => {
    const data1 = new Float32Array([1]);
    const data2 = new Float32Array([5]);
    expect(pearson(data1, data2)).toBeCloseTo(0);
  });

  it("returns zero if one or both arrays has zero variance", () => {
    const data1 = new Float32Array([5, 5, 5, 5, 5]);
    const data2 = new Float32Array([1, 2, 3, 4, 5]);
    expect(pearson(data1, data2)).toBeCloseTo(0);

    const data3 = new Float32Array([1, 1, 1, 1, 1]);
    expect(pearson(data1, data3)).toBeCloseTo(0);
  });

  it("skips nan values", () => {
    const data1 = new Float32Array([1, NaN, 3, NaN, 5]);
    const data2 = new Float32Array([1, -1000, 3, 10000, 5]);
    expect(pearson(data1, data2)).toBeCloseTo(1);
  });
});

describe("computeCorrelations", () => {
  it("handles empty arrays", () => {
    expect(computeCorrelations([])).toEqual([]);
  });

  it("handles single array", () => {
    expect(computeCorrelations([new Float32Array([1, 2, 3, 4, 5])])).toEqual([[1]]);
  });

  it("returns matrix of pearson calculations", () => {
    const data1 = new Float32Array([1, 2, 3, 4, 5]);
    const data2 = new Float32Array([3, 4, 3, 3, 4]);
    const data3 = new Float32Array([5, 3, 3, 4, 1]);

    // pearson(data1, data2) =  0.2887
    // pearson(data1, data3) = -0.7462
    // pearson(data2, data3) = -0.7385
    const received = computeCorrelations([data1, data2, data3]);
    const expected = [
      [1, 0.2887, -0.7462],
      [0.2887, 1, -0.7385],
      [-0.7462, -0.7385, 1],
    ];

    expect(received.length).toBe(expected.length);
    console.log(received);
    for (let i = 0; i < received.length; i++) {
      for (let j = 0; j < received[i].length; j++) {
        expect(received[i][j]).toBeCloseTo(expected[i][j]);
      }
    }
  });

  it("is symmetric along diagonal", () => {
    // Generate a random set of features and test that the correlation matrix is
    // symmetric.
    const numFeatures = 20;
    const featuresLength = 100;

    const features: Float32Array[] = [];
    for (let i = 0; i < numFeatures; i++) {
      features.push(new Float32Array(featuresLength).map(() => Math.random()));
    }
    const received = computeCorrelations(features);
    for (let i = 0; i < received.length; i++) {
      for (let j = 0; j < received[i].length; j++) {
        expect(received[i][j]).toBe(received[j][i]);
        if (i === j) {
          expect(received[i][j]).toBe(1);
        }
      }
    }
  });
});
