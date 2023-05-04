import { DataSource, IFeatureLoader } from "./ILoader";
import { FeatureDataType, FeatureArrayType, featureTypeSpecs } from "../types";
import { packDataTexture } from "../utils/texture_utils";
import { DataTexture } from "three";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

class JsonDataSource implements DataSource {
  array: number[];
  isBool: boolean;
  min?: number;
  max?: number;

  constructor(array: number[] | boolean[], min?: number | boolean, max?: number | boolean) {
    if (isBoolArray(array)) {
      this.array = array.map(Number);
      this.isBool = true;
    } else {
      this.array = array.map((val) => (val === null ? Infinity : val));
      this.isBool = false;
    }
    this.min = typeof min === "boolean" ? Number(min) : min;
    this.max = typeof max === "boolean" ? Number(max) : max;
  }

  getBuffer<T extends FeatureDataType>(type: T): FeatureArrayType[T] {
    return new featureTypeSpecs[type].arrayConstructor(this.array);
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

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";
const nanToNull = (json: string): string => json.replace(/NaN/g, "null");

export default class JsonFeatureLoader implements IFeatureLoader {
  async load(url: string): Promise<DataSource> {
    const response = await fetch(url);
    const text = await response.text();
    let { data, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));
    return new JsonDataSource(data, min, max);
  }
}
