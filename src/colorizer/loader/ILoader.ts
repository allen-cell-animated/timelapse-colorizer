import { DataTexture } from "three";

export type FrameData = {
  data: Int32Array;
  width: number;
  height: number;
};

export type FeatureData = {
  data: DataTexture;
  min: number;
  max: number;
};

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<FrameData> {}
export interface IFeatureLoader extends ILoader<FeatureData> {}
