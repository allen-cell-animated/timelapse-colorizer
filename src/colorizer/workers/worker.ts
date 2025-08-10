import workerpool from "workerpool";
import Transfer from "workerpool/types/transfer";

import { FeatureDataType, FeatureThreshold } from "../types";
import { computeCorrelations } from "../utils/correlation";
import { LoadedData, loadFromJsonUrl, loadFromParquetUrl } from "../utils/data_load_utils";
import { calculateInRangeLUT, calculateMotionDeltas, constructAllTracksFromData } from "../utils/math_utils";
import { arrayToDataTextureInfo } from "../utils/texture_utils";

async function loadUrlData(url: string, type: FeatureDataType): Promise<Transfer> {
  let result: LoadedData<typeof type>;
  if (url.endsWith(".json")) {
    result = await loadFromJsonUrl(url, type);
  } else if (url.endsWith(".parquet")) {
    result = await loadFromParquetUrl(url, type);
  } else {
    throw new Error(`Unsupported file format: ${url}`);
  }

  const { min, max, data } = result;
  // Cannot directly transfer the DataTexture, since the class methods are not transferred.
  // Instead, transfer the underlying image and reconstruct it on the main thread.
  const textureInfo = arrayToDataTextureInfo(data, type);

  // `Transfer` is used to transfer the data buffer to the main thread without copying.
  return new workerpool.Transfer({ min, max, data, textureInfo }, [data.buffer, textureInfo.data.buffer]);
}

async function getCorrelations(features: (Float32Array | Uint32Array)[]): Promise<number[][]> {
  return computeCorrelations(features);
}

async function getMotionDeltas(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids: Uint16Array,
  timeIntervals: number
): Promise<Transfer> {
  const tracks = constructAllTracksFromData(trackIds, times, centroids);
  const motionDeltas = calculateMotionDeltas(tracks, timeIntervals);
  return new workerpool.Transfer(motionDeltas, [motionDeltas.buffer]);
}

async function getInRangeLUT(
  numObjects: number,
  thresholds: FeatureThreshold[],
  featureData: Float32Array[]
): Promise<Transfer> {
  const inRangeIds = calculateInRangeLUT(numObjects, thresholds, featureData);
  return new workerpool.Transfer(inRangeIds, [inRangeIds.buffer]);
}

workerpool.worker({
  loadUrlData,
  getMotionDeltas,
  getCorrelations,
  getInRangeLUT,
});
