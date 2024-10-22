import { DataTexture } from "three";

import { FeatureArrayType, FeatureDataType } from "../types";
import { infoToDataTexture } from "../utils/texture_utils";

import SharedWorkerPool from "../workers/SharedWorkerPool";
import { ArraySource, IArrayLoader } from "./ILoader";

export class UrlArraySource<T extends FeatureDataType> implements ArraySource<T> {
  array: FeatureArrayType[T];
  texture: DataTexture;
  type: T;
  min: number;
  max: number;

  constructor(array: FeatureArrayType[T], texture: DataTexture, type: T, min: number, max: number) {
    this.array = array;
    this.type = type;
    this.min = min;
    this.max = max;
    this.texture = texture;
  }

  getBuffer(): FeatureArrayType[T] {
    return this.array;
  }

  getTexture(): DataTexture {
    return this.texture;
  }

  getMin(): number {
    return this.min;
  }

  getMax(): number {
    return this.max;
  }
}

export default class UrlArrayLoader implements IArrayLoader {
  private workerPool: SharedWorkerPool;
  private cleanupWorkerPoolOnDispose: boolean;

  constructor(workerPool?: SharedWorkerPool) {
    this.cleanupWorkerPoolOnDispose = workerPool === undefined;
    this.workerPool = workerPool ?? new SharedWorkerPool();
  }

  /**
   * Loads array data from the specified URL, handling both JSON and Parquet files.
   * @param url The URL to load data from. Must end in ".json" or ".parquet".
   * @param type `FeatureDataType` for the returned array source (e.g. `F32` or `U8`).
   * @param min Optional minimum value for the data. If defined, overrides the `min` field
   *   in JSON files or the calculated minimum value for Parquet files.
   * @param max Optional maximum value for the data. If defined, overrides the `max` field
   *   in JSON files or the calculated maximum value for Parquet files.
   * @throws Error if the file format is not supported (not JSON or Parquet).
   * @returns a URLArraySource object containing the loaded data.
   */
  async load<T extends FeatureDataType>(url: string, type: T, min?: number, max?: number): Promise<UrlArraySource<T>> {
    if (!url.endsWith(".json") && !url.endsWith(".parquet")) {
      throw new Error(
        `Encountered unsupported file format when loading data. URL must end in '.parquet' or '.json': ${url}`
      );
    }
    const { data, textureInfo, min: newMin, max: newMax } = await this.workerPool.loadUrlData(url, type);

    const tex = infoToDataTexture(textureInfo);
    return new UrlArraySource<T>(data, tex, type, min ?? newMin, max ?? newMax);
  }

  dispose(): void {
    if (this.cleanupWorkerPoolOnDispose) {
      this.workerPool.terminate();
    }
  }
}
