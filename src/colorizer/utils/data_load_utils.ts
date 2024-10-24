import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";

import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../types";

const isBoolArray = (arr: number[] | boolean[]): arr is boolean[] => typeof arr[0] === "boolean";

type FeatureDataJson = {
  data: number[] | boolean[];
  min?: number;
  max?: number;
};

export type LoadedData<T extends FeatureDataType> = {
  data: FeatureArrayType[T];
  min: number;
  max: number;
};

/**
 * Replaces all NaN in string text (such as the string representation of a JSON
 * object) with null. Can be used to safely parse JSON objects with NaN values.
 */
export const nanToNull = (json: string): string => json.replace(/NaN/g, "null");

export async function loadFromJsonUrl<T extends FeatureDataType>(url: string, type: T): Promise<LoadedData<T>> {
  const result = await fetch(url);

  if (!result.ok) {
    throw new Error(`Failed to load JSON data from URL '${url}': ${result.status} ${result.statusText}`);
  }

  const text = await result.text();
  // JSON does not support `NaN` so we use `null` as a placeholder for it while parsing, then convert back.
  const parseResult: FeatureDataJson = JSON.parse(nanToNull(text));
  let { data: rawData } = parseResult;
  const { min, max } = parseResult;

  for (let i = 0; i < rawData.length; i++) {
    if (rawData[i] === null) {
      rawData[i] = NaN;
    }
  }
  if (isBoolArray(rawData)) {
    rawData = rawData.map(Number);
  }

  // Construct typed array
  const data = new featureTypeSpecs[type].ArrayConstructor(rawData);
  // If min/max is not provided, calculate it from the data
  let dataMin = Number.POSITIVE_INFINITY;
  let dataMax = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < data.length; i++) {
    dataMin = Math.min(data[i], dataMin);
    dataMax = Math.max(data[i], dataMax);
  }
  return { data, min: min ?? dataMin, max: max ?? dataMax };
}

export async function loadFromParquetUrl<T extends FeatureDataType>(url: string, type: T): Promise<LoadedData<T>> {
  const result = await fetch(url);

  if (!result.ok) {
    throw new Error(`Failed to load Parquet data from URL '${url}': ${result.status} ${result.statusText}`);
  }

  const arrayBuffer = await result.arrayBuffer();
  let data: FeatureArrayType[T] = new featureTypeSpecs[type].ArrayConstructor(0);
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
