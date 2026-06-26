import { tableFromIPC } from "apache-arrow";
import { type ColumnData, parquetMetadataAsync, parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { ParquetType, SchemaElement } from "hyparquet/src/types";

import Dataset, { type FeatureData, FeatureType, type Frames2dData, type Frames3dData } from "src/colorizer/Dataset";
import {
  addCentroidFeatures,
  addTimeFeature,
  addTrackFeature,
  getUniqueKeyName,
  interleaveCentroidData,
  resolveFrames2d,
  resolveFrames3d,
} from "src/colorizer/dataset_loaders/dataset_loader_utils";
import type { DatasetLoadOptions } from "src/colorizer/dataset_loaders/types";
import { FeatureDataType } from "src/colorizer/types";
import type { ManifestFile } from "src/colorizer/utils/dataset_utils";
import { arrayToDataTextureInfo, infoToDataTexture } from "src/colorizer/utils/texture_utils";
import { decodeFloatOrNull, formatPath } from "src/colorizer/utils/url_utils";

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
  try {
    const categories = JSON.parse(categoryString);
    if (Array.isArray(categories) && categories.every((c) => typeof c === "string")) {
      return categories;
    } else {
      console.warn("Failed to parse category string from Parquet metadata:", categoryString);
    }
  } catch (e) {
    console.warn("Failed to parse category string from Parquet metadata:", categoryString, e);
  }
  return null;
}

const enum MetadataType {
  FLOAT_OR_INT = "float_or_int",
  INT = "int",
  INT_OR_BOOLEAN = "int_or_boolean",
}

// TODO: Handle string columns
const enum MetadataColumnKeys {
  TIMES = "times",
  TRACKS = "tracks",
  SEG_IDS = "segIds",
  CENTROID_X = "centroidsX",
  CENTROID_Y = "centroidsY",
  CENTROID_Z = "centroidsZ",
  BOUNDS = "bounds",
  OUTLIERS = "outliers",
}

const MetadataColumnKeyToExpectedType: Record<MetadataColumnKeys, MetadataType> = {
  [MetadataColumnKeys.TIMES]: MetadataType.INT,
  [MetadataColumnKeys.TRACKS]: MetadataType.INT,
  [MetadataColumnKeys.SEG_IDS]: MetadataType.INT,
  [MetadataColumnKeys.CENTROID_X]: MetadataType.FLOAT_OR_INT,
  [MetadataColumnKeys.CENTROID_Y]: MetadataType.FLOAT_OR_INT,
  [MetadataColumnKeys.CENTROID_Z]: MetadataType.FLOAT_OR_INT,
  [MetadataColumnKeys.BOUNDS]: MetadataType.INT,
  [MetadataColumnKeys.OUTLIERS]: MetadataType.INT_OR_BOOLEAN,
};

const MetadataColumnKeyToDefaultNames: Record<MetadataColumnKeys, string[]> = {
  [MetadataColumnKeys.TIMES]: ["t", "t_id", "time", "times", "frame", "frames"],
  [MetadataColumnKeys.TRACKS]: ["track_id", "track_ids", "trackids", "trackid", "track", "tracks"],
  [MetadataColumnKeys.SEG_IDS]: [
    "id",
    "ids",
    "seg_id",
    "seg_ids",
    "segid",
    "segids",
    "label",
    "labels",
    "label_id",
    "label_ids",
    "label id",
    "label ids",
    "seg_label_id",
    "seg_label_ids",
  ],
  [MetadataColumnKeys.CENTROID_X]: ["centroid x", "centroid_x", "x"],
  [MetadataColumnKeys.CENTROID_Y]: ["centroid y", "centroid_y", "y"],
  [MetadataColumnKeys.CENTROID_Z]: ["centroid z", "centroid_z", "z"],
  [MetadataColumnKeys.BOUNDS]: ["bounds", "boundaries"],
  [MetadataColumnKeys.OUTLIERS]: ["outlier", "outliers"],
};

function isMetadataColumn(
  columnName: string,
  type: ParquetType,
  key: MetadataColumnKeys,
  metadata: Map<string, string | undefined>
): boolean {
  // If column is explicitly defined, check against the column name in metadata.
  if (metadata.has(key)) {
    if (metadata.get(key) !== columnName) {
      return false;
    }
  } else {
    // Otherwise, check if the column name matches any of the default names for this
    // metadata key.
    const lowerColumnName = columnName.toLowerCase();
    const matchesMetadataName = MetadataColumnKeyToDefaultNames[key].includes(lowerColumnName);
    if (!matchesMetadataName) {
      return false;
    }
  }

  // Check if types match expected values
  const expectedType = MetadataColumnKeyToExpectedType[key];
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

  private metadata: Map<string, string | undefined>;
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

    this.metadata = new Map();
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
    const colName = schema.name;
    const schemaType = schema.type;
    const fieldMetadata = this.columnNameToFieldMetadata.get(colName);
    // TODO: Handle string arrays (type of BYTE_ARRAY)

    if (!schemaType) {
      console.warn(`Column '${colName}' does not have a type in Parquet schema, skipping`);
      return;
    }

    if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.TIMES, this.metadata)) {
      this.times = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.TRACKS, this.metadata)) {
      this.trackIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.SEG_IDS, this.metadata)) {
      this.segIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.CENTROID_X, this.metadata)) {
      this.centroidsX = Float32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.CENTROID_Y, this.metadata)) {
      this.centroidsY = Float32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.CENTROID_Z, this.metadata)) {
      this.centroidsZ = Float32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.BOUNDS, this.metadata)) {
      this.bounds = Uint16Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(colName, schemaType, MetadataColumnKeys.OUTLIERS, this.metadata)) {
      this.outliers = Uint8Array.from(chunk.columnData, (v) => Number(v));
    } else {
      // Otherwise, treat as feature column
      const name = fieldMetadata?.get(FeatureMetadataKey.NAME) ?? colName;
      const key = getUniqueKeyName(fieldMetadata?.get(FeatureMetadataKey.KEY), name, new Set(this.features.keys()));
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
    this.metadata = new Map<string, string | undefined>(
      (metadata.key_value_metadata ?? []).map((entry) => [entry.key, entry.value])
    );

    // Hyparquet does not directly read per-column key-value pairs, but it is
    // stored in the metadata under the "ARROW:schema" key as an Arrow IPC
    // message.
    // TODO: Is this standard? Do all Parquet files include this?
    const hyparquetArrowMetadata = this.metadata.get("ARROW:schema");
    if (hyparquetArrowMetadata) {
      const uint8Array = decodeBase64ToUint8Array(hyparquetArrowMetadata);
      const schema = tableFromIPC(uint8Array).schema;
      for (const field of schema.fields) {
        this.columnNameToFieldMetadata.set(field.name, field.metadata);
      }
    }

    const frames2d = this.getFrames2dFromMetadata(this.metadata);
    const frames3d = this.getFrames3dFromMetadata(this.metadata);

    this.numColumns = metadata.schema.length - 1;

    this.columnNameToSchemaMap = new Map(
      metadata.schema.map((schema) => {
        return [schema.name, schema] as [string, SchemaElement];
      })
    );

    await parquetRead({
      file: this.file,
      compressors,
      onChunk: (chunk) => this.onLoadedColumnChunk(chunk),
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
