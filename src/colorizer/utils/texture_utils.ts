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
 * Metadata needed to create a `DataTexture`.
 * Contains the dimensions of the texture, the type of data, and the data itself.
 */
export type DataTextureInfo<T extends FeatureDataType> = {
  width: number;
  height: number;
  type: T;
  data: FeatureArrayType[T];
};

/**
 * Creates a `DataTexture` from a `DataTextureInfo` object.
 * @param dataTextureArrayInfo The metadata needed to create the texture.
 * @returns A new `DataTexture` object with the given dimensions, type, and data.
 */
export function infoToDataTexture<T extends FeatureDataType>(dataTextureArrayInfo: DataTextureInfo<T>): DataTexture {
  const { data, width, height, type } = dataTextureArrayInfo;
  const spec = featureTypeSpecs[type];
  const tex = new DataTexture(data, width, height, spec.format, spec.dataType);
  tex.internalFormat = spec.internalFormat;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Replaces all NaN values with Infinity in-place in the given TypedArray.
 * This makes the data array safe to use in WebGL, as NaNs have undefined
 * behavior.
 * @param data The TypedArray to modify in-place.
 */
export function replaceNanWithInfinity<T extends FeatureDataType>(data: FeatureArrayType[T]): FeatureArrayType[T] {
  for (let i = 0; i < data.length; i++) {
    if (Number.isNaN(data[i])) {
      data[i] = Infinity;
    }
  }
  return data;
}

/**
 * Optimizes a given data array for rendering by padding it to make it as square as possible.
 * Returns the dimensions and new data buffer as a `DataTextureInfo` object, which can be
 * used to construct a `DataTexture` object. See `infoToDataTexture`.
 * @param data The data array to pack into a texture.
 * @param type The type of data in the array.
 * @returns a `DataTextureInfo` object containing the packed data, the dimensions of the texture,
 * and the type of data.
 */
export function arrayToDataTextureInfo<T extends FeatureDataType>(
  data: FeatureArrayType[T] | number[],
  type: T
): DataTextureInfo<T> {
  const [width, height] = getSquarestTextureDimensions(data);
  const length = width * height;

  const buffer = replaceNanWithInfinity(padToLength(data, type, 0, length));

  return { data: buffer, width, height, type };
}

/**
 * Packs the given data array into a `DataTexture` object.
 */
export function packDataTexture<T extends FeatureDataType>(data: FeatureArrayType[T] | number[], type: T): DataTexture {
  return infoToDataTexture(arrayToDataTextureInfo(data, type));
}
