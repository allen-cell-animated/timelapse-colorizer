import { FeatureData, IFeatureLoader } from "./ILoader";
import { packFloatDataTexture } from "./util";

type FeatureDataJson = {
  data: number[];
  min: number;
  max: number;
};

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
