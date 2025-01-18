import workerpool from "workerpool";

import { FeatureArrayType, FeatureDataType, VectorConfig } from "../types";
import { DataTextureInfo } from "../utils/texture_utils";

import Dataset from "../Dataset";
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

  /**
   * Computes a matrix of Pearson correlation coefficients between the provided feature keys.
   * @param d The Dataset to retrieve feature data from.
   * @param featureKeys An optional array of feature keys to compute correlations for.
   * If not provided, correlations will be computed for all features in the dataset.
   * @returns a 2D matrix of correlation values between each pair of features. For
   * any indices `i` and `j`, the value at `[i][j]` (or `[j][i]`) is the
   * correlation coefficient between the `i`th and `j`th features.
   */
  async getCorrelations(d: Dataset, featureKeys?: string[]): Promise<number[][]> {
    const featureData: Float32Array[] = [];
    featureKeys = featureKeys ?? d.featureKeys;
    for (const key of featureKeys) {
      if (d.hasFeatureKey(key)) {
        featureData.push(d.getFeatureData(key)!.data);
      }
    }
    return await this.workerPool.exec("getCorrelations", [featureData]);
  }

  /**
   * Calculates and averages the motion deltas for objects in the dataset as a flat array of
   * vector coordinates.
   * @param dataset The dataset to calculate motion deltas for.
   * @param config Vector configuration settings, including the number of time intervals to average over.
   * @returns one of the following:
   * - `undefined` if the configuration is invalid or the dataset is missing required data.
   * - `Float32Array` of motion deltas for each object in the dataset, with length equal to `2 * dataset.numObjects`.
   * For each object ID `i`, the motion delta is stored at `[2i, 2i + 1]`. If the delta cannot be calculated
   * for the object (e.g. it does not exist for part or all of the  the time interval), the values will be `NaN`.
   */
  async getMotionDeltas(dataset: Dataset, config: VectorConfig): Promise<Float32Array | undefined> {
    // We cannot directly pass the Dataset due to textures not being transferable to workers.
    // Instead, pass the relevant data and reconstruct the tracks on the worker side.
    const trackIds = dataset.trackIds;
    const times = dataset.times;
    const centroids = dataset.centroids;
    if (!trackIds || !times || !centroids || config.timeIntervals < 1) {
      return undefined;
    }
    return await this.workerPool.exec("getMotionDeltas", [trackIds, times, centroids, config]);
  }

  terminate(): void {
    this.workerPool.terminate();
  }
}
