import { Transfer, worker } from "workerpool";
import type TransferType from "workerpool/types/transfer";

import type { FeatureDataType, FeatureRangeData } from "src/colorizer/types";
import { computeCorrelations } from "src/colorizer/utils/correlation";
import { columnsToCsv, type CsvDataColumn } from "src/colorizer/utils/csv_utils";
import { type LoadedData, loadFromJsonUrl, loadFromParquetUrl } from "src/colorizer/utils/data_load_utils";
import {
  averageVectorFlowField,
  binAndSumFeatureVectors,
  calculateMotionDeltas,
  constructAllTracksFromData,
  convolveVectorFlowField,
  filterVectorFlowFieldData,
  make3dGaussianKernel,
} from "src/colorizer/utils/math_utils";
import { arrayToDataTextureInfo } from "src/colorizer/utils/texture_utils";

async function loadUrlData(url: string, type: FeatureDataType): Promise<TransferType> {
  let result: LoadedData<typeof type>;
  if (url.endsWith(".json")) {
    result = await loadFromJsonUrl(url, type);
  } else if (url.endsWith(".parquet")) {
    result = await loadFromParquetUrl(url, type);
  } else {
    // Try loading as either format.
    try {
      result = await loadFromJsonUrl(url, type);
    } catch (error1) {
      try {
        result = await loadFromParquetUrl(url, type);
      } catch (error2) {
        // TODO: Nicer error handling here?
        console.error(error1, error2);
        throw new Error(`Could not parse '${url}' as either a JSON or Parquet file.`);
      }
    }
  }

  const { min, max, data } = result;
  // Cannot directly transfer the DataTexture, since the class methods are not transferred.
  // Instead, transfer the underlying image and reconstruct it on the main thread.
  const textureInfo = arrayToDataTextureInfo(data, type);

  // `Transfer` is used to transfer the data buffer to the main thread without copying.
  return new Transfer({ min, max, data, textureInfo }, [data.buffer, textureInfo.data.buffer]);
}

async function getCorrelations(features: (Float32Array | Uint32Array)[]): Promise<number[][]> {
  return computeCorrelations(features);
}

async function getMotionDeltas(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids: Uint16Array,
  timeIntervals: number
): Promise<TransferType> {
  const tracks = constructAllTracksFromData(trackIds, times, centroids);
  const motionDeltas = calculateMotionDeltas(tracks, timeIntervals);
  return new Transfer(motionDeltas, [motionDeltas.buffer]);
}

async function getVectorFlowField(
  trackIds: Uint32Array,
  times: Uint32Array,
  xFeature: FeatureRangeData,
  yFeature: FeatureRangeData,
  zFeature: FeatureRangeData,
  inRangeLUT?: Uint8Array,
  outliers?: Uint8Array,
  gaussianBandwidth?: number
): Promise<TransferType> {
  const tracks = constructAllTracksFromData(trackIds, times);
  const vectorSumData = binAndSumFeatureVectors(
    tracks,
    xFeature.data,
    yFeature.data,
    zFeature.data,
    xFeature.range,
    yFeature.range,
    zFeature.range,
    [xFeature.bins, yFeature.bins, zFeature.bins],
    inRangeLUT,
    outliers
  );

  let vectorFlowFieldData;
  if (gaussianBandwidth) {
    const nbins = xFeature.bins;
    const kernelSize = Math.ceil(gaussianBandwidth * nbins) * 4 + 1;
    const gaussianKernel = make3dGaussianKernel(kernelSize, gaussianBandwidth * nbins);
    vectorFlowFieldData = convolveVectorFlowField(
      vectorSumData,
      [xFeature.bins, yFeature.bins, zFeature.bins],
      gaussianKernel
    );
  } else {
    vectorFlowFieldData = averageVectorFlowField(vectorSumData);
  }

  vectorFlowFieldData = filterVectorFlowFieldData(vectorFlowFieldData);

  return new Transfer(vectorFlowFieldData, [
    vectorFlowFieldData.xPos.buffer,
    vectorFlowFieldData.yPos.buffer,
    vectorFlowFieldData.zPos.buffer,
    vectorFlowFieldData.xData.buffer,
    vectorFlowFieldData.yData.buffer,
    vectorFlowFieldData.zData.buffer,
    vectorFlowFieldData.count.buffer,
  ]);
}

async function getCsvString(columns: CsvDataColumn[], delimiter: string = ","): Promise<string> {
  const csvString = columnsToCsv(columns, delimiter);
  // Note: This could be converted to an array and transferred if there is a
  // noticeable slowdown when copying the string.
  return csvString;
}

worker({
  loadUrlData,
  getMotionDeltas,
  getVectorFlowField,
  getCorrelations,
  getCsvString,
});
