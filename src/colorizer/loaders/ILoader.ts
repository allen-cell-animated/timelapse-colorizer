import { Texture } from "three";
import { FeatureDataType, FeatureArrayType } from "../types";

export interface ArraySource {
  /** Create a `TypedArray` of the specified type from this data source */
  getBuffer<T extends FeatureDataType>(type: T): FeatureArrayType[T];
  /** Create a square texture of the specified type from this data source */
  getTexture(type: FeatureDataType): Texture;
  /** Get the minimum value of the contained data */
  getMin(): number;
  /** Get the maximum value of the contained data */
  getMax(): number;
}

interface ILoader<DataType> {
  /** Begin loading data */
  load(url: string): Promise<DataType>;
}

export interface IFrameLoader extends ILoader<Texture> {}
export interface IArrayLoader extends ILoader<ArraySource> {}
