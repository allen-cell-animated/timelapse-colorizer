import { DataTexture, RedFormat, FloatType } from "three";

/** Pack a 1d data array into the squarest 2d texture possible */
export function packFloatDataTexture(data: number[]): DataTexture {
  const width = Math.ceil(Math.sqrt(data.length));
  const height = Math.ceil(data.length / width);
  const length = width * height;

  while (data.length < length) {
    data.push(0);
  }

  const tex = new DataTexture(new Float32Array(data), width, height, RedFormat, FloatType);
  tex.internalFormat = "R32F";
  tex.needsUpdate = true;
  return tex;
}
