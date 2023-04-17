import { DataTexture, RedFormat, FloatType, UnsignedByteType, RedIntegerFormat } from "three";

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
