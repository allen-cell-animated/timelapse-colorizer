import { DataTexture, FloatType, RedFormat } from "three";

import { FeatureData, IFeatureLoader } from "./ILoader";

type FeatureDataJson = {
  data: number[];
  min: number;
  max: number;
};

/** Pack a 1d data array into the squarest 2d texture possible */
function packFloatDataTexture(data: number[]): DataTexture {
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

const nanToNull = (json: string): string => json.replace(/NaN/g, "null");

export default class JsonFeatureLoader implements IFeatureLoader {
  async load(url: string): Promise<FeatureData> {
    const response = await fetch(url);
    const text = await response.text();
    const { data, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));
    // const { data, min, max }: FeatureDataJson = await response.json();
    const sanitizedData = data.map((val) => (val === null ? NaN : val));
    return {
      data: packFloatDataTexture(sanitizedData),
      min,
      max,
    };
  }
}
