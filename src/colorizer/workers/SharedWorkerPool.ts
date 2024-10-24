import workerpool from "workerpool";

import { FeatureArrayType, FeatureDataType } from "../types";
import { DataTextureInfo } from "../utils/texture_utils";

// Vite import directive for worker files! See https://vitejs.dev/guide/features.html#import-with-query-suffixes.
// @ts-ignore Ignore missing file warning
import WorkerUrl from "./worker?url&worker";

export default class SharedWorkerPool {
  private workerPool: workerpool.Pool;

  constructor() {
    this.workerPool = workerpool.pool(WorkerUrl, {
      workerOpts: {
        // Set worker type to undefined (classic) in production to fix a Vite issue where the
        // application crashes when loading a module worker.
        // Copied from https://github.com/josdejong/workerpool/tree/master/examples/vite.
        type: import.meta.env.PROD ? undefined : "module",
      },
    });
  }

  /**
   * Loads array data from the specified URL, handling both JSON and Parquet files.
   * @param url The URL to load data from. Must end in ".json" or ".parquet".
   * @param type `FeatureDataType` for the returned array source (e.g. `F32` or `U8`).
   * @throws Error if the file format is not supported (not JSON or Parquet).
   * @returns an object containing the loaded data and metadata:
   *  - `data`: The loaded data array.
   *  - `textureInfo`: Texture data and metadata needed to create a `DataTexture`.
   * Use with `infoToDataTexture()`.
   *  - `min`: The minimum value in the data array.
   *  - `max`: The maximum value in the data array.
   */
  async loadUrlData<T extends FeatureDataType>(
    url: string,
    type: T
  ): Promise<{ data: FeatureArrayType[T]; textureInfo: DataTextureInfo<T>; min: number; max: number }> {
    return await this.workerPool.exec("loadUrlData", [url, type]);
  }

  terminate(): void {
    this.workerPool.terminate();
  }
}
