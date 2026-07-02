import { parquetMetadataAsync, parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import JSZip from "jszip";

import {
  type FeatureArrayType,
  type FeatureDataType,
  featureTypeSpecs,
  type ReportLoadProgressCallback,
} from "src/colorizer/types";

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

export type ParquetLoadOptions = {
  /**
   * Columns to read. If undefined, all columns will be read. The returned array
   * is a flat array, where the values are interleaved from each column, in the
   * order specified. An error will be thrown if any of the specified columns do
   * not exist in the Parquet file.
   */
  columns?: string[];
};

/**
 * Selects columns from the specified raw data and interleaves them, in order,
 * into a single flat array. If no columns are specified, all columns will be
 * selected.
 * @param rawData The raw data read from the Parquet file, organized as an array of rows.
 * @param columns The columns to select and interleave, in order.
 * @param schemaColumns The columns available in the Parquet file schema.
 * @throws An error if any of the specified columns do not exist in the Parquet file.
 * @returns A flat array containing the interleaved values of the selected columns.
 * @example
 * ```ts
 * const schemaColumns = ["col1", "col2", "col3"];
 * const rawData = [
 *   [0, 10, 100],
 *   [1, 11, 101],
 *   [2, 12, 102],
 *   [3, 13, 103],
 * ];
 * const data = selectAndInterleaveColumns(rawData, ["col3", "col1"], schemaColumns);
 * // = [100, 0, 101, 1, 102, 2, 103, 3]
 * ```
 */
export function selectAndInterleaveColumns(rawData: number[][], columns: string[], schemaColumns: string[]): number[] {
  if (columns.length === 0) {
    return rawData.flat();
  }
  // Map from selected column names to index in the schema
  const columnIndices = columns.map((col) => schemaColumns.indexOf(col));
  // Validate that all the requested columns were found in the schema
  for (let i = 0; i < columns.length; i++) {
    const colName = columns[i];
    const index = columnIndices[i];
    if (index === -1) {
      throw new Error(
        `Column '${colName}' does not exist in the Parquet file. Columns provided: [${schemaColumns.join(", ")}]`
      );
    }
  }
  // Select and flatten the data
  const data = [];
  for (let i = 0; i < rawData.length; i++) {
    for (let j = 0; j < columnIndices.length; j++) {
      data.push(rawData[i][columnIndices[j]]);
    }
  }
  return data;
}

export async function loadFromParquetUrl<T extends FeatureDataType>(
  url: string,
  type: T,
  options?: ParquetLoadOptions
): Promise<LoadedData<T>> {
  const result = await fetch(url);

  if (!result.ok) {
    throw new Error(`Failed to load Parquet data from URL '${url}': ${result.status} ${result.statusText}`);
  }

  const arrayBuffer = await result.arrayBuffer();
  let data: FeatureArrayType[T] = new featureTypeSpecs[type].ArrayConstructor(0);
  let dataMin: number = Number.POSITIVE_INFINITY;
  let dataMax: number = Number.NEGATIVE_INFINITY;

  const metadata = await parquetMetadataAsync(arrayBuffer);
  let schemaColumns = metadata.schema.map((col) => col.name);
  const requestedColumns = options?.columns ?? [];
  if (requestedColumns.length > 0) {
    // Filter to requested columns, since parquetRead will ignore all other
    // columns (but still keeps them in the original schema order). Validation
    // that the requested columns exist is done in `selectAndInterleaveColumns`.
    schemaColumns = schemaColumns.filter((col) => requestedColumns.includes(col));
  }

  await parquetRead({
    file: arrayBuffer,
    compressors,
    columns: options?.columns,
    onComplete: (rawData: number[][]) => {
      const flattenedData = selectAndInterleaveColumns(rawData, requestedColumns, schemaColumns);
      const filteredData = flattenedData.map((value) => {
        return value === null ? NaN : Number(value);
      });
      data = new featureTypeSpecs[type].ArrayConstructor(filteredData);
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

/**
 * Parses a ZIP file into a map of file paths to their contents. If files are nested
 * inside one or more levels of empty directories, those directories will be stripped
 * from the file paths.
 * @param zipFile A ZIP file object.
 * @returns A Promise that resolves to a map of file paths to a File object.
 */
export async function zipToFileMap(
  zipFile: File,
  onLoadProgress?: ReportLoadProgressCallback
): Promise<Record<string, File>> {
  const zip = await JSZip.loadAsync(zipFile).catch((error) => {
    console.error("Could not parse zip file:", error);
    throw new Error(`Could not parse '${zipFile.name}'. Please check if it is a valid ZIP file.`);
  });

  // Load all contents and save them as File objects
  const fileMap: Record<string, File> = {};
  const filePromises: Promise<void>[] = [];
  const loadToFileMap = async (relativePath: string, zipObject: JSZip.JSZipObject): Promise<void> => {
    const fileContents = await zipObject.async("blob");
    fileMap[relativePath] = new File([fileContents], relativePath);
  };

  let totalFiles = 0;
  let completedFiles = 0;
  const onLoadStart = (): void => {
    totalFiles++;
  };
  const onLoadComplete = (): void => {
    completedFiles++;
    onLoadProgress?.(completedFiles, totalFiles);
  };

  zip.forEach((relativePath, zipObject) => {
    if (zipObject.dir) {
      return;
    }
    const loadFileCallback = async (): Promise<void> => {
      onLoadStart();
      try {
        await loadToFileMap(relativePath, zipObject);
      } catch (error) {
        console.error(`Failed to load file ${relativePath} from ${zipFile.name}:`, error);
      } finally {
        // Currently always called even if a file fails to load.
        onLoadComplete();
      }
    };
    filePromises.push(loadFileCallback());
  });

  await Promise.allSettled(filePromises);

  // Handle case where files are all nested one or more layers deep in empty
  // folders by removing the shared prefix. This is very common when zipping
  // folders.
  const fileKeys = Object.keys(fileMap);
  if (fileKeys.length === 0) {
    return {};
  }
  let prefix = Object.keys(fileMap)[0].split("/").slice(0, -1).join("/");
  for (const key of fileKeys) {
    if (key.startsWith(prefix)) {
      continue;
    }
    // Find the longest common prefix
    const prefixDirectories = prefix.split("/");
    const keyDirectories = key.split("/");
    let i = 0;
    while (i < prefixDirectories.length && i < keyDirectories.length && prefixDirectories[i] === keyDirectories[i]) {
      i++;
    }
    prefix = prefixDirectories.slice(0, i).join("/");
  }
  if (prefix !== "") {
    prefix += "/"; // Include final directory slash
  }

  // Remove prefix from the start of all paths
  const trimmedFileMap: Record<string, File> = {};
  for (const key of Object.keys(fileMap)) {
    trimmedFileMap[key.slice(prefix.length)] = fileMap[key];
  }

  return trimmedFileMap;
}
