import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { DataTexture } from "three";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../types";
import { nanToNull } from "../utils/data_utils";
import { packDataTexture } from "../utils/texture_utils";

import { ArraySource, IArrayLoader } from "./ILoader";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";

export class UrlArraySource implements ArraySource {
  array: number[];
  isBool: boolean;
  min?: number;
  max?: number;

  constructor(array: number[] | boolean[], min?: number | boolean, max?: number | boolean) {
    if (isBoolArray(array)) {
      this.array = array.map(Number);
      this.isBool = true;
    } else {
      // Must store Infinity values internally because WebGL states that NaN behavior is undefined.
      // This can cause shaders to not detect NaN, and operations like isnan() fail.
      // On the UI, however, Infinity should be parsed as NaN for display.
      this.array = array.map((val) => (val === null ? Infinity : val));
      this.isBool = false;
    }
    this.min = typeof min === "boolean" ? Number(min) : min;
    this.max = typeof max === "boolean" ? Number(max) : max;
  }

  getBuffer<T extends FeatureDataType>(type: T): FeatureArrayType[T] {
    return new featureTypeSpecs[type].ArrayConstructor(this.array);
  }

  getTexture(type: FeatureDataType): DataTexture {
    return packDataTexture(this.array, type);
  }

  getMin(): number {
    if (this.min === undefined) {
      this.min = this.array.reduce((acc, val) => (val < acc ? val : acc));
    }
    return this.min;
  }

  getMax(): number {
    if (this.max === undefined) {
      this.max = this.array.reduce((acc, val) => (val > acc ? val : acc));
    }
    return this.max;
  }
}

export default class UrlArrayLoader implements IArrayLoader {
  /**
   * Loads array data from the specified URL, handling both JSON and Parquet files.
   * @param url The URL to load data from. Must end in ".json" or ".parquet".
   * @param min Optional minimum value for the data. If defined, overrides the `min` field
   *   in JSON files or the calculated minimum value for Parquet files.
   * @param max Optional maximum value for the data. If defined, overrides the `max` field
   *   in JSON files or the calculated maximum value for Parquet files.
   * @throws Error if the file format is not supported (not JSON or Parquet).
   * @returns a URLArraySource object containing the loaded data.
   */
  async load(url: string, min?: number, max?: number): Promise<UrlArraySource> {
    if (url.endsWith(".json")) {
      const response = await fetch(url);
      const text = await response.text();
      const { data, min: jsonMin, max: jsonMax }: FeatureDataJson = JSON.parse(nanToNull(text));
      return new UrlArraySource(data, min ?? jsonMin, max ?? jsonMax);
    } else if (url.endsWith(".parquet")) {
      const result = await fetch(url);
      const arrayBuffer = await result.arrayBuffer();
      let data: number[] = [];
      let dataMin: number | undefined = undefined;
      let dataMax: number | undefined = undefined;
      await parquetRead({
        file: arrayBuffer,
        compressors,
        columns: ["data"],
        onComplete: (loadedData: number[][]) => {
          data = Array(loadedData.length);
          for (let i = 0; i < loadedData.length; i++) {
            const value = Number(loadedData[i][0]);
            dataMin = dataMin === undefined ? value : Math.min(dataMin, value);
            dataMax = dataMax === undefined ? value : Math.max(dataMax, value);
            data[i] = value;
          }
        },
      });
      return new UrlArraySource(data, min ?? dataMin, max ?? dataMax);
    } else {
      throw new Error(`Unsupported file format for URL array loader: ${url}`);
    }
  }
}
