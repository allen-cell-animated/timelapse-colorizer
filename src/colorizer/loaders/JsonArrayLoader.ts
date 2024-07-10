import { DataTexture } from "three";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../types";
import { packDataTexture } from "../utils/texture_utils";

import { ArraySource, IArrayLoader } from "./ILoader";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";

class JsonArraySource implements ArraySource {
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

const nanToNull = (json: string): string => json.replace(/NaN/g, "null");

export default class JsonArrayLoader implements IArrayLoader {
  async load(url: string): Promise<JsonArraySource> {
    const response = await fetch(url);
    const text = await response.text();
    const { data, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));
    return new JsonArraySource(data, min, max);
  }
}
