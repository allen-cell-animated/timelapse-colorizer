import { DataTexture, Texture } from "three";

import { FeatureArrayType, FeatureDataType } from "src/colorizer/types";

export interface ArraySource<T extends FeatureDataType> {
  /** Create a `TypedArray` of the specified type from this data source */
  getBuffer(): FeatureArrayType[T];
  /** Create a square texture of the specified type from this data source */
  getTexture(): DataTexture;
  /** Get the minimum value of the contained data */
  getMin(): number;
  /** Get the maximum value of the contained data */
  getMax(): number;
}

export interface ITextureImageLoader {
  load(url: string): Promise<Texture>;
}

export interface IArrayLoader {
  load<T extends FeatureDataType>(url: string, type: T, min?: number, max?: number): Promise<ArraySource<T>>;
  dispose(): void;
}
