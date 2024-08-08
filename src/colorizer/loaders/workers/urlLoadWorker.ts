import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import workerpool from "workerpool";
import Transfer from "workerpool/types/transfer";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../../types";
import { nanToNull } from "../../utils/data_utils";

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

type LoadedData<T extends FeatureDataType> = {
  data: FeatureArrayType[T];
  min: number;
  max: number;
};

async function loadFromJsonUrl(url: string, type: FeatureDataType): Promise<LoadedData<typeof type>> {
  const result = await fetch(url);
  const text = await result.text();
  // JSON does not support `NaN` so we use `null` as a placeholder for it, then convert back
  // to `NaN` when parsing the data.
  let { data: rawData, min, max }: FeatureDataJson = JSON.parse(nanToNull(text));
  for (let i = 0; i < rawData.length; i++) {
    if (rawData[i] === null) {
      rawData[i] = NaN;
    }
  }

  if (isBoolArray(rawData)) {
    rawData = rawData.map(Number);
  }

  // If min/max is not provided, calculate it from the data
  let dataMin = Number.POSITIVE_INFINITY;
  let dataMax = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < rawData.length; i++) {
    dataMin = Math.min(rawData[i], dataMin);
    dataMax = Math.max(rawData[i], dataMax);
  }

  // Construct typed array from raw data so it can be transferred w/o copying to
  // main thread
  const data = new featureTypeSpecs[type].ArrayConstructor(rawData);

  return { data, min: min ?? dataMin, max: max ?? dataMax };
}

async function loadFromParquetUrl(url: string, type: FeatureDataType): Promise<LoadedData<typeof type>> {
  const result = await fetch(url);
  const arrayBuffer = await result.arrayBuffer();
  let data: FeatureArrayType[typeof type] = new featureTypeSpecs[type].ArrayConstructor(0);
  let dataMin: number = Number.POSITIVE_INFINITY;
  let dataMax: number = Number.NEGATIVE_INFINITY;

  await parquetRead({
    file: arrayBuffer,
    compressors,
    onComplete: (rawData: number[][]) => {
      const flattenedMap = rawData.flat().map((value) => {
        return value === null ? NaN : Number(value);
      });
      data = new featureTypeSpecs[type].ArrayConstructor(flattenedMap);
      // Get min and max values for the data
      for (let i = 0; i < data.length; i++) {
        const value = Number(data[i]);
        dataMin = dataMin === undefined ? value : Math.min(dataMin, value);
        dataMax = dataMax === undefined ? value : Math.max(dataMax, value);
      }
    },
  });
  return { data, min: dataMin, max: dataMax };
}

async function load(url: string, type: FeatureDataType): Promise<Transfer> {
  let result: LoadedData<typeof type>;
  if (url.endsWith(".json")) {
    result = await loadFromJsonUrl(url, type);
  } else if (url.endsWith(".parquet")) {
    result = await loadFromParquetUrl(url, type);
  } else {
    throw new Error(`Unsupported file format: ${url}`);
  }

  const { min, max, data } = result;

  // TODO: Also generate textures for the data on the worker thread too?
  // Would need access to the underlying array buffer to transfer

  return new workerpool.Transfer({ min, max, data }, [data.buffer]);
}

workerpool.worker({
  load: load,
});
