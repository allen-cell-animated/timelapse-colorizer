export type FrameData = {
  data: Uint32Array;
  width: number;
  height: number;
};

export type FeatureData = {
  data: Float32Array;
  min: number;
  max: number;
};

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<FrameData> {}
export interface IFeatureLoader extends ILoader<FeatureData> {}
