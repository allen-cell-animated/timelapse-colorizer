import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import workerpool from "workerpool";
import Transfer from "workerpool/types/transfer";

import { FeatureDataType, featureTypeSpecs } from "../../types";
import { nanToNull } from "../../utils/data_utils";

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

async function loadFromJsonUrl(url: string, type: FeatureDataType): Promise<Transfer> {
  const result = await fetch(url);
  const text = await result.text();
  let { data: rawData, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));

  // Construct typed array from raw data so it can be transferred w/o copying to
  // main thread
  if (isBoolArray(rawData)) {
    rawData = rawData.map(Number);
  }
  // Replace null values with Infinity due to WebGL not supporting NaN
  for (let i = 0; i < rawData.length; i++) {
    if (rawData[i] === null) {
      rawData[i] = Infinity;
    }
  }
  const data = new featureTypeSpecs[type].ArrayConstructor(rawData);

  return new workerpool.Transfer({ min, max, data }, [data.buffer]);
}

async function loadFromParquetUrl(url: string, type: FeatureDataType): Promise<Transfer> {
  const result = await fetch(url);
  const arrayBuffer = await result.arrayBuffer();
  let data: Float32Array | Uint32Array | Uint8Array = new Float32Array(0);
  let dataMin: number | undefined = undefined;
  let dataMax: number | undefined = undefined;

  await parquetRead({
    file: arrayBuffer,
    compressors,
    onComplete: (rawData: number[][]) => {
      const data = new featureTypeSpecs[type].ArrayConstructor(rawData.flat().map(Number));

      // Get min and max values for the data
      for (let i = 0; i < data.length; i++) {
        const value = Number(data);
        dataMin = dataMin === undefined ? value : Math.min(dataMin, value);
        dataMax = dataMax === undefined ? value : Math.max(dataMax, value);
      }
    },
  });

  return new workerpool.Transfer({ min: dataMin, max: dataMax, data }, [data.buffer]);
}

async function load(url: string, type: FeatureDataType): Promise<Transfer> {
  if (url.endsWith(".json")) {
    return loadFromJsonUrl(url, type);
  } else if (url.endsWith(".parquet")) {
    return loadFromParquetUrl(url, type);
  } else {
    throw new Error(`Unsupported file format: ${url}`);
  }

  // TODO: Also generate textures for the data on the worker thread too?
  // Would need access to the underlying array buffer to transfer
}

workerpool.worker({
  load: load,
});
