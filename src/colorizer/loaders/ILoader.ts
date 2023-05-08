import { Texture, DataTexture } from "three";

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

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<Texture> {}
export interface IFeatureLoader extends ILoader<FeatureData> {}
export interface ITracksLoader extends ILoader<TracksData> {}
