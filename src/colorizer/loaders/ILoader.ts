import { Texture, DataTexture } from "three";
import { FeatureDataType, FeatureArrayType } from "../types";

export interface DataSource {
  getBuffer<T extends FeatureDataType>(type: T): FeatureArrayType[T];
  getTexture(type: FeatureDataType): DataTexture;
  getMin(): number;
  getMax(): number;
}

interface ILoader<DataType> {
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<Texture> {}
export interface IFeatureLoader extends ILoader<DataSource> {}
