import { tableFromIPC } from "apache-arrow";
import { type ColumnData, parquetMetadataAsync, parquetRead } from "hyparquet";
import type { ParquetType, SchemaElement } from "hyparquet/src/types";
import { compressors } from "hyparquet-compressors";

import Dataset, { type FeatureData, FeatureType, type Frames2dData, type Frames3dData } from "src/colorizer/Dataset";
import {
  addCentroidFeatures,
  addTimeFeature,
  addTrackFeature,
  interleaveCentroidData,
  resolveFrames2d,
  resolveFrames3d,
} from "src/colorizer/dataset_loaders/dataset_loader_utils";
import type { DatasetLoadOptions } from "src/colorizer/dataset_loaders/types";
import { FeatureDataType } from "src/colorizer/types";
import { getKeyFromName } from "src/colorizer/utils/data_utils";
import { arrayToDataTextureInfo, infoToDataTexture } from "src/colorizer/utils/texture_utils";
import { decodeFloatOrNull, formatPath } from "src/colorizer/utils/url_utils";

import type { ManifestFile } from "../utils/dataset_utils";

const enum ParquetDataType {
  INT32 = "INT32",
  INT64 = "INT64",
  DOUBLE = "DOUBLE",
  FLOAT = "FLOAT",
  BOOLEAN = "BOOLEAN",
  BYTE_ARRAY = "BYTE_ARRAY",
  FIXED_LEN_BYTE_ARRAY = "FIXED_LEN_BYTE_ARRAY",
}

const enum FeatureMetadataKey {
  KEY = "key",
  NAME = "name",
  UNIT = "unit",
  DESCRIPTION = "description",
  MIN = "min",
  MAX = "max",
  CATEGORIES = "categories",
}

function isIntType(type: ParquetType): type is ParquetDataType.INT32 | ParquetDataType.INT64 {
  return type === ParquetDataType.INT32 || type === ParquetDataType.INT64;
}

function isFloatType(type: ParquetType): type is ParquetDataType.DOUBLE | ParquetDataType.FLOAT {
  return type === ParquetDataType.DOUBLE || type === ParquetDataType.FLOAT;
}

function isBooleanType(type: ParquetType): type is ParquetDataType.BOOLEAN {
  return type === ParquetDataType.BOOLEAN;
}

function decodeBase64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function parseCategories(categoryString: string | undefined): string[] | null {
  if (!categoryString) {
    return null;
  }
  // TODO: Handle comma escaping in category names
  return categoryString.split(",").map((s) => s.trim());
}

// TODO: Handle string columns

const TIMES_COLUMN_NAMES = ["t", "t_id", "time", "times", "frame", "frames"];
const TRACK_ID_COLUMN_NAMES = ["track_id", "trackid", "track", "tracks"];
const SEG_ID_COLUMN_NAMES = ["id", "ids", "seg_id", "segid", "label", "labels", "label_id", "label id", "seg_label_id"];
const CENTROID_X_COLUMN_NAMES = ["centroid x", "centroid_x", "x"];
const CENTROID_Y_COLUMN_NAMES = ["centroid y", "centroid_y", "y"];
const CENTROID_Z_COLUMN_NAMES = ["centroid z", "centroid_z", "z"];
const BOUNDS_COLUMN_NAMES = ["bounds", "boundaries"];
const OUTLIER_COLUMN_NAMES = ["outlier", "outliers"];

const enum MetadataType {
  FLOAT_OR_INT = "float_or_int",
  INT = "int",
  INT_OR_BOOLEAN = "int_or_boolean",
}

function isMetadataColumn(
  columnName: string,
  type: ParquetType,
  metadataColumnNames: string[],
  expectedType: MetadataType
): boolean {
  const lowerColumnName = columnName.toLowerCase();
  const matchesMetadataName = metadataColumnNames.includes(lowerColumnName);
  if (!matchesMetadataName) {
    return false;
  }

  // Check if types match expected values
  switch (expectedType) {
    case MetadataType.FLOAT_OR_INT:
      return isFloatType(type) || isIntType(type);
    case MetadataType.INT:
      return isIntType(type);
    case MetadataType.INT_OR_BOOLEAN:
      return isIntType(type) || isBooleanType(type);
    default:
      return false;
  }
}

export default class ParquetDatasetLoader {
  private url: string;
  private baseUrl: string;
  private options: DatasetLoadOptions;
  private file?: ArrayBuffer;

  private columnNameToSchemaMap: Map<string, SchemaElement>;
  private columnNameToFieldMetadata: Map<string, Map<string, string>>;

  private numColumns: number;
  private numColumnsParsed: number;

  private features: Map<string, FeatureData>;
  private segIds: Uint32Array | null;
  private times: Uint32Array | null;
  private trackIds: Uint32Array | null;
  private centroidsX: Float32Array | null;
  private centroidsY: Float32Array | null;
  private centroidsZ: Float32Array | null;
  private bounds: Uint16Array | null;
  private outliers: Uint8Array | null;

  private datasetPromise: Promise<Dataset> | null = null;

  constructor(parquetUrl: string, parquetFile?: ArrayBuffer, options?: DatasetLoadOptions) {
    // Should load from parquet file if provided -> drag and drop support for future datasets
    // If only url is provided, load file from url first
    this.url = parquetUrl;
    this.file = parquetFile;
    this.options = options ?? {};

    this.columnNameToSchemaMap = new Map();
    this.columnNameToFieldMetadata = new Map();

    this.numColumns = 0;
    this.numColumnsParsed = 0;

    this.features = new Map();
    this.segIds = null;
    this.times = null;
    this.trackIds = null;
    this.centroidsX = null;
    this.centroidsY = null;
    this.centroidsZ = null;
    this.bounds = null;
    this.outliers = null;

    this.baseUrl = formatPath(parquetUrl.substring(0, parquetUrl.lastIndexOf("/")));

    this.onLoadedColumnChunk = this.onLoadedColumnChunk.bind(this);

    this.resolvePath = this.resolvePath.bind(this);
  }

  private resolvePath(path: string): string {
    return this.options.pathResolver?.resolve(this.baseUrl, path) ?? path;
  }

  private getFrames3dFromMetadata(metadata: Map<string, string | undefined>): Frames3dData | undefined {
    const frames3dSource = metadata.get("frames3d");
    if (!frames3dSource) {
      return undefined;
    }
    try {
      const frames3dArg = JSON.parse(frames3dSource ?? "null") as ManifestFile["frames3d"] | undefined | null;
      return resolveFrames3d(frames3dArg ?? undefined, this.resolvePath, this.options.reportWarning);
    } catch (e) {
      console.warn("Failed to parse frames3d metadata from Parquet file: ", e);
      return undefined;
    }
  }

  private getFrames2dFromMetadata(metadata: Map<string, string | undefined>): Frames2dData | undefined {
    const frames2dSource = metadata.get("frames2d");
    if (!frames2dSource) {
      return undefined;
    }
    try {
      const frames2dArg = JSON.parse(frames2dSource ?? "null") as ManifestFile["frames2d"] | undefined | null;
      return resolveFrames2d(frames2dArg ?? undefined, this.resolvePath);
    } catch (e) {
      console.warn("Failed to parse frames2d metadata from Parquet file: ", e);
      return undefined;
    }
  }

  private parseColumnData(chunk: ColumnData, schema: SchemaElement): void {
    const columnName = schema.name;
    const schemaType = schema.type;
    const fieldMetadata = this.columnNameToFieldMetadata.get(columnName);
    console.log(`Parsing column '${columnName}' of type '${schemaType}'`, chunk, schema, fieldMetadata);
    // TODO: Handle string arrays (type of BYTE_ARRAY)

    if (!schemaType) {
      console.warn(`Column '${columnName}' does not have a type in Parquet schema, skipping`);
      return;
    }

    if (isMetadataColumn(columnName, schemaType, TIMES_COLUMN_NAMES, MetadataType.INT)) {
      this.times = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, schemaType, TRACK_ID_COLUMN_NAMES, MetadataType.INT)) {
      this.trackIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, schemaType, SEG_ID_COLUMN_NAMES, MetadataType.INT)) {
      this.segIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, schemaType, CENTROID_X_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsX) {
        this.centroidsX = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, schemaType, CENTROID_Y_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsY) {
        this.centroidsY = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, schemaType, CENTROID_Z_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsZ) {
        this.centroidsZ = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, schemaType, BOUNDS_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      this.bounds = Uint16Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, schemaType, OUTLIER_COLUMN_NAMES, MetadataType.INT_OR_BOOLEAN)) {
      this.outliers = Uint8Array.from(chunk.columnData, (v) => Number(v));
    } else {
      // Otherwise, treat as feature column
      const name = fieldMetadata?.get(FeatureMetadataKey.NAME) ?? columnName;
      const key = getKeyFromName(fieldMetadata?.get(FeatureMetadataKey.KEY) ?? columnName);
      if (this.features.has(key)) {
        console.warn(`Duplicate column name '${columnName}' found in Parquet file, skipping`);
        return;
      }
      const data = Float32Array.from(chunk.columnData, (v) => Number(v));
      const textureInfo = arrayToDataTextureInfo(data, FeatureDataType.F32);
      const tex = infoToDataTexture(textureInfo);

      let min, max;
      min = Number.POSITIVE_INFINITY;
      max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        if (isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }

      // Override with metadata values if provided.
      min = decodeFloatOrNull(fieldMetadata?.get(FeatureMetadataKey.MIN)) ?? min;
      max = decodeFloatOrNull(fieldMetadata?.get(FeatureMetadataKey.MAX)) ?? max;

      const categories = parseCategories(fieldMetadata?.get(FeatureMetadataKey.CATEGORIES));
      const description = fieldMetadata?.get(FeatureMetadataKey.DESCRIPTION) ?? null;
      const unit = fieldMetadata?.get(FeatureMetadataKey.UNIT) ?? "";

      let type = FeatureType.CONTINUOUS;
      if (categories) {
        type = FeatureType.CATEGORICAL;
      } else if (isIntType(schemaType)) {
        type = FeatureType.DISCRETE;
      }

      this.features.set(key, { name, key, data, tex, min, max, unit, type, categories, description });
    }
  }

  private async onLoadedColumnChunk(chunk: ColumnData): Promise<void> {
    const schema = this.columnNameToSchemaMap.get(chunk.columnName);
    if (!schema) {
      console.warn(`Column '${chunk.columnName}' not found in Parquet schema, skipping`);
      return;
    }
    const columnName = schema.name;
    const schemaType = schema.type;

    if (!schemaType) {
      console.warn(`Column '${columnName}' does not have a type in Parquet schema, skipping`);
      return;
    }

    // TODO: Handle duplicate collisions
    try {
      this.parseColumnData(chunk, schema);
    } finally {
      this.numColumnsParsed++;
      if (this.options.reportProgress) {
        this.options.reportProgress(this.numColumnsParsed, this.numColumns);
      }
    }
  }

  private async loadDataset(): Promise<Dataset> {
    if (!this.file) {
      // TODO: Fetch in a way that shows progress?
      const result = await fetch(this.url);
      this.file = await result.arrayBuffer();
    }
    const metadata = await parquetMetadataAsync(this.file);
    console.log("Parquet file metadata: ", metadata);
    const metadataMap = new Map<string, string | undefined>(
      (metadata.key_value_metadata ?? []).map((entry) => [entry.key, entry.value])
    );

    // Hyparquet does not directly read per-column key-value pairs, but it is
    // stored in the metadata under the "ARROW:schema" key as an Arrow IPC
    // message.
    // TODO: Is this standard? Do all Parquet files include this?
    const hyparquetArrowMetadata = metadataMap.get("ARROW:schema");
    if (hyparquetArrowMetadata) {
      const uint8Array = decodeBase64ToUint8Array(hyparquetArrowMetadata);
      const schema = tableFromIPC(uint8Array).schema;
      for (const field of schema.fields) {
        this.columnNameToFieldMetadata.set(field.name, field.metadata);
      }
    }

    const frames2d = this.getFrames2dFromMetadata(metadataMap);
    const frames3d = this.getFrames3dFromMetadata(metadataMap);

    this.numColumns = metadata.schema.length - 1;

    this.columnNameToSchemaMap = new Map(
      metadata.schema.map((schema) => {
        return [schema.name, schema] as [string, SchemaElement];
      })
    );

    await parquetRead({
      file: this.file,
      compressors,
      onChunk: this.onLoadedColumnChunk,
    });

    const centroids = interleaveCentroidData(this.centroidsX, this.centroidsY, this.centroidsZ);

    addCentroidFeatures(this.features, centroids);
    addTimeFeature(this.features, this.times);
    addTrackFeature(this.features, this.trackIds);

    const dataset = new Dataset({
      features: this.features,
      segIds: this.segIds,
      times: this.times,
      trackIds: this.trackIds,
      centroids: interleaveCentroidData(this.centroidsX, this.centroidsY, this.centroidsZ),
      bounds: this.bounds,
      outliers: this.outliers,
      frames3d: frames3d,
      frames2d: frames2d,
      // TODO: Parse other manifest metadata
    });
    console.log("Loaded dataset from Parquet file: ", dataset);
    return dataset;
  }

  public async open(): Promise<Dataset> {
    if (!this.datasetPromise) {
      this.datasetPromise = this.loadDataset();
    }
    return this.datasetPromise;
  }

  public dispose(): void {}
}
