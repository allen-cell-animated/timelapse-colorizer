import { FeatureData, IFeatureLoader } from "./ILoader";
import { packBooleanDataTexture, packFloatDataTexture } from "../utils/texture_utils";

type FeatureDataJson = {
  data: number[] | boolean[];
  min: number;
  max: number;
};

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";
const nanToNull = (json: string): string => json.replace(/NaN/g, "null");

export default class JsonFeatureLoader implements IFeatureLoader {
  async load(url: string): Promise<FeatureData> {
    const response = await fetch(url);
    const text = await response.text();
    const { data, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));

    const tex = isBoolArray(data)
      ? packBooleanDataTexture(data)
      : packFloatDataTexture(data.map((val) => (val === null ? Infinity : val)));
    const dataArr = isBoolArray(data) ? new Float32Array(data.map((value) => (value ? 1 : 0))) : new Float32Array(data);
    return { data: dataArr, tex, min, max };
  }
}
