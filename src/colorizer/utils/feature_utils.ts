import {
  DataTexture,
  RedFormat,
  FloatType,
  UnsignedByteType,
  RedIntegerFormat,
  PixelFormat,
  TextureDataType,
  PixelFormatGPU,
  UnsignedIntType,
} from "three";

/** Specifies available types for data loading */
export enum FeatureDataType {
  F32,
  U32,
  U8,
}

/** Maps `FeatureDataType` to corresponding typed array type */
export type FeatureArrayType = {
  [T in FeatureDataType]: {
    [FeatureDataType.F32]: Float32Array;
    [FeatureDataType.U32]: Uint32Array;
    [FeatureDataType.U8]: Uint8Array;
  }[T];
};

type FeatureTypeSpec<T extends FeatureDataType> = {
  arrayConstructor: { new (arr: number[]): FeatureArrayType[T] };
  format: PixelFormat;
  dataType: TextureDataType;
  internalFormat: PixelFormatGPU;
};

/** Maps `FeatureDataType` to values required to create a valid texture of that type */
export const featureTypeSpecs: { [T in FeatureDataType]: FeatureTypeSpec<T> } = {
  [FeatureDataType.F32]: {
    arrayConstructor: Float32Array,
    format: RedFormat,
    dataType: FloatType,
    internalFormat: "R32F",
  },
  [FeatureDataType.U32]: {
    arrayConstructor: Uint32Array,
    format: RedIntegerFormat,
    dataType: UnsignedIntType,
    internalFormat: "R32UI",
  },
  [FeatureDataType.U8]: {
    arrayConstructor: Uint8Array,
    format: RedIntegerFormat,
    dataType: UnsignedByteType,
    internalFormat: "R8UI",
  },
};

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

/** Pack a 1d float array into the squarest 2d texture possible */
export function packFloatDataTexture(data: number[]): DataTexture {
  const [width, height] = fitIntoSquare(data, 0);

  const tex = new DataTexture(new Float32Array(data), width, height, RedFormat, FloatType);
  tex.internalFormat = "R32F";
  tex.needsUpdate = true;
  return tex;
}

/** Pack a 1d boolean array into the squarest possible 2d texture of bytes */
export function packBooleanDataTexture(data: boolean[]): DataTexture {
  const numberArr = data.map((val) => (val ? 1 : 0));
  const [width, height] = fitIntoSquare(numberArr, 0);

  const tex = new DataTexture(new Uint8Array(numberArr), width, height, RedIntegerFormat, UnsignedByteType);
  tex.internalFormat = "R8UI";
  tex.needsUpdate = true;
  return tex;
}
