import { DataTexture } from "three";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../types";

/**
 * Calculate the squarest possible texture that `data` can fit into and return a tuple of `[width, height]`
 */
function getSquarestTextureDimensions<T extends FeatureDataType>(
  data: FeatureArrayType[T] | number[]
): [number, number] {
  const width = Math.ceil(Math.sqrt(data.length));
  const height = Math.ceil(data.length / width);

  return [width, height];
}

/**
 * Returns a copy of the typed array `data` padded with `emptyVal` to the specified length.
 */
function padToLength<T extends FeatureDataType>(
  data: FeatureArrayType[T] | number[],
  type: T,
  emptyVal: number,
  length: number
): FeatureArrayType[T] {
  const buffer = new featureTypeSpecs[type].ArrayConstructor(length);
  buffer.fill(emptyVal, data.length, length);
  buffer.set(data, 0);
  return buffer;
}

/**
 * Creates a DataTexture from a TypedArray, using the specified FeatureDataType `type` and dimensions.
 * @returns A `DataTexture` containing the data, with the specified dimensions and an internal format
 * matching the `type`.
 */
export function typedArrayToDataTexture<T extends FeatureDataType>(
  data: FeatureArrayType[T],
  type: T,
  width: number,
  height: number
): DataTexture {
  const spec = featureTypeSpecs[type];
  const tex = new DataTexture(data, width, height, spec.format, spec.dataType);
  tex.internalFormat = spec.internalFormat;
  tex.needsUpdate = true;
  return tex;
}

/** Pack a 1d array of data into the squarest 2d texture possible */
export function packDataTexture<T extends FeatureDataType>(data: FeatureArrayType[T] | number[], type: T): DataTexture {
  const [width, height] = getSquarestTextureDimensions(data);
  const length = width * height;

  const buffer = padToLength(data, type, 0, length);

  // Convert all NaNs in the buffer to Infinity before texture conversion, as WebGL has undefined
  // behavior for NaNs. This assumes that the data is float-based.
  for (let i = 0; i < buffer.length; i++) {
    if (Number.isNaN(buffer[i])) {
      buffer[i] = Infinity;
    }
  }

  return typedArrayToDataTexture(buffer, type, width, height);
}
