// sort-imports-ignore
import { DataTexture } from "three";
import workerpool from "workerpool";

// @ts-ignore Ignore missing file
import WorkerUrl from "./workers/urlLoadWorker?url&worker";

import { FeatureArrayType, FeatureDataType } from "../types";
import { packDataTexture } from "../utils/texture_utils";

import { ArraySource, IArrayLoader } from "./ILoader";

export class UrlArraySource<T extends FeatureDataType> implements ArraySource<T> {
  array: FeatureArrayType[T];
  type: T;
  min: number;
  max: number;

  constructor(array: FeatureArrayType[T], type: T, min: number, max: number) {
    // Must store Infinity values internally because WebGL states that NaN behavior is undefined.
    // This can cause shaders to not detect NaN, and operations like isnan() fail.
    // On the UI, however, Infinity should be parsed as NaN for display.
    this.array = array;
    this.type = type;
    this.min = min;
    this.max = max;
  }

  getBuffer(): FeatureArrayType[T] {
    return this.array;
  }

  getTexture(): DataTexture {
    return packDataTexture(this.array, this.type);
  }

  getMin(): number {
    return this.min;
  }

  getMax(): number {
    return this.max;
  }
}

export default class UrlArrayLoader implements IArrayLoader {
  private workerPool: workerpool.Pool;

  constructor() {
    // TODO: Maintain a single worker pool for all loaders/all asynchronous operations in the app
    this.workerPool = workerpool.pool(WorkerUrl, {
      workerOpts: {
        // Fixes a Vite issue  where the application fails in production:
        //  https://github.com/josdejong/workerpool/tree/master/examples/vite
        type: import.meta.env.PROD ? undefined : "module",
      },
    });
  }

  /**
   * Loads array data from the specified URL, handling both JSON and Parquet files.
   * @param url The URL to load data from. Must end in ".json" or ".parquet".
   * @param min Optional minimum value for the data. If defined, overrides the `min` field
   *   in JSON files or the calculated minimum value for Parquet files.
   * @param max Optional maximum value for the data. If defined, overrides the `max` field
   *   in JSON files or the calculated maximum value for Parquet files.
   * @param type Optional data type for the returned array. Defaults to `FeatureDataType.F32`.
   * @throws Error if the file format is not supported (not JSON or Parquet).
   * @returns a URLArraySource object containing the loaded data.
   */
  async load<T extends FeatureDataType>(url: string, type: T, min?: number, max?: number): Promise<UrlArraySource<T>> {
    if (url.endsWith(".json") || url.endsWith(".parquet")) {
      const { data, min: newMin, max: newMax } = await this.workerPool.exec("load", [url, type]);
      const result = new UrlArraySource<T>(data, type, min ?? newMin, max ?? newMax);
      return result;
    } else {
      throw new Error(`Unsupported file format for URL array loader: ${url}`);
    }
  }

  dispose(): void {
    this.workerPool.terminate();
  }
}
