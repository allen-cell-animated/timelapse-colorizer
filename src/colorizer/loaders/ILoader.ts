import { Texture, DataTexture } from "three";

export type FeatureData = {
  data: DataTexture;
  min: number;
  max: number;
};

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<Texture> {}
export interface IFeatureLoader extends ILoader<FeatureData> {}
