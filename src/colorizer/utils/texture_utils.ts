import { DataTexture } from "three";

import { FeatureDataType, featureTypeSpecs } from "../types";

/**
 * Calculate the squarest possible texture that `data` can fit into, extend it with
 * `emptyVal` to fit perfectly into that space, and return a tuple of `[width, height]`
 */
function fitIntoSquare<T>(data: T[], emptyVal: T): [number, number] {
  const width = Math.ceil(Math.sqrt(data.length));
  const height = Math.ceil(data.length / width);
  const length = width * height;

  while (data.length < length) {
    data.push(emptyVal);
  }

  return [width, height];
}

/** Pack a 1d array of data into the squarest 2d texture possible */
export function packDataTexture(data: number[], type: FeatureDataType): DataTexture {
  const [width, height] = fitIntoSquare(data, 0);

  const spec = featureTypeSpecs[type];
  const buffer = new spec.arrayConstructor(data);

  const tex = new DataTexture(buffer, width, height, spec.format, spec.dataType);
  tex.internalFormat = spec.internalFormat;
  tex.needsUpdate = true;
  return tex;
}
