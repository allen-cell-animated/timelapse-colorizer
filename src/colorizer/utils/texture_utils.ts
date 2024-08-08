import { DataTexture } from "three";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../types";

/**
 * Calculate the squarest possible texture that `data` can fit into and return a tuple of `[width, height]`
 */
function getSquareDimensions<T extends FeatureDataType>(data: FeatureArrayType[T]): [number, number] {
  const width = Math.ceil(Math.sqrt(data.length));
  const height = Math.ceil(data.length / width);

  return [width, height];
}

/**
 * Returns a copy of the typed array `data` padded with `emptyVal` to the specified length.
 */
function padToLength<T extends FeatureDataType>(
  data: FeatureArrayType[T],
  type: T,
  emptyVal: number,
  length: number
): FeatureArrayType[T] {
  const buffer = new featureTypeSpecs[type].ArrayConstructor(length);
  buffer.fill(emptyVal, data.length, length);
  buffer.set(data, 0);
  return buffer;
}

/** Pack a 1d array of data into the squarest 2d texture possible */
export function packDataTexture<T extends FeatureDataType>(data: FeatureArrayType[T], type: T): DataTexture {
  const [width, height] = getSquareDimensions(data);
  const length = width * height;

  const spec = featureTypeSpecs[type];
  const buffer = padToLength(data, type, 0, length);

  const tex = new DataTexture(buffer, width, height, spec.format, spec.dataType);
  tex.internalFormat = spec.internalFormat;
  tex.needsUpdate = true;
  return tex;
}
