import { Texture, DataTexture } from "three";
import { FeatureDataType, FeatureArrayType as FeatureDataTypeArray } from "../utils/feature_utils";

export type FeatureData = {
  data: Float32Array;
  tex: DataTexture;
  min: number;
  max: number;
};
export type TracksData = {
  trackIds: Uint32Array;
  times: Uint32Array;
};

export interface DataSource {
  getBuffer<T extends FeatureDataType>(type: T): FeatureDataTypeArray[T];
  getTexture(type: FeatureDataType): DataTexture;
  getMin(): number;
  getMax(): number;
}

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<Texture> {}
export interface IFeatureLoader extends ILoader<DataSource> {}
export interface ITracksLoader extends ILoader<TracksData> {}
