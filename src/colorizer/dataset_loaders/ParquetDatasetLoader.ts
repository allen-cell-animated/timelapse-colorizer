import { type ColumnData, parquetMetadataAsync, parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { ParquetType, SchemaElement } from "hyparquet/src/types";

import Dataset, { type Backdrop3dData, type FeatureData, FeatureType, type Frames3dData } from "src/colorizer/Dataset";
import {
  addCentroidFeatures,
  addTimeFeature,
  addTrackFeature,
  interleaveCentroidData,
} from "src/colorizer/dataset_loaders/dataset_loader_utils";
import type { DatasetLoadOptions } from "src/colorizer/dataset_loaders/types";
import { FeatureDataType, LoadTroubleshooting } from "src/colorizer/types";
import { getKeyFromName } from "src/colorizer/utils/data_utils";
import { arrayToDataTextureInfo, infoToDataTexture } from "src/colorizer/utils/texture_utils";
import { formatPath } from "src/colorizer/utils/url_utils";
import { formatQuantityString } from "src/utils/formatting";

const METADATA_SEG_CHANNEL_COUNT = "num_seg_channels";
const METADATA_SEG_PREFIX = "seg";
const METADATA_CHANNEL_COUNT = "num_channels";
const METADATA_CHANNEL_PREFIX = "c";

const enum MetadataChannelSuffix {
  SOURCE = "_source",
  CHANNEL = "_channel",
  NAME = "_name",
  // Optional fields
  DESCRIPTION = "_description",
  MIN = "_min",
  MAX = "_max",
}

const enum ParquetDataType {
  INT32 = "INT32",
  INT64 = "INT64",
  DOUBLE = "DOUBLE",
  FLOAT = "FLOAT",
  BOOLEAN = "BOOLEAN",
  BYTE_ARRAY = "BYTE_ARRAY",
  FIXED_LEN_BYTE_ARRAY = "FIXED_LEN_BYTE_ARRAY",
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
  }

  private resolvePath(path: string): string {
    return this.options.pathResolver?.resolve(this.baseUrl, path) ?? path;
  }

  private getChannelInfo(
    metadata: Map<string, string | undefined>,
    index: number,
    type: "seg" | "channel"
  ): Backdrop3dData | null {
    const prefix = type === "seg" ? METADATA_SEG_PREFIX : METADATA_CHANNEL_PREFIX;
    const readableType = type === "seg" ? "Segmentation channel" : "Channel";

    const sourceKey = `${prefix}${index}${MetadataChannelSuffix.SOURCE}`;
    let source = metadata.get(sourceKey);
    const channelIdxStr = metadata.get(`${prefix}${index}${MetadataChannelSuffix.CHANNEL}`);
    let name = metadata.get(`${prefix}${index}${MetadataChannelSuffix.NAME}`);
    const description = metadata.get(`${prefix}${index}${MetadataChannelSuffix.DESCRIPTION}`);
    const minStr = metadata.get(`${prefix}${index}${MetadataChannelSuffix.MIN}`);
    const maxStr = metadata.get(`${prefix}${index}${MetadataChannelSuffix.MAX}`);

    // Try to resolve channel source to absolute path
    if (source === undefined || source === "") {
      console.warn(
        `${readableType} ${index} is missing required source field in parquet metadata (${sourceKey}) and will be skipped. ` +
          "Please check the logged metadata for missing volume data sources."
      );
      return null;
    }
    source = this.resolvePath(source);
    if (source === null) {
      console.warn(
        `${readableType} ${index} source path '${source}' could not be resolved and will be skipped. ` +
          "Please check the logged metadata for malformed paths."
      );
      return null;
    }

    // Validate channel index
    const channelIndex = Number.parseInt(channelIdxStr ?? "", 10);
    if (isNaN(channelIndex)) {
      console.warn(
        `${readableType} ${index} has invalid channel index '${channelIdxStr}' and will be skipped. ` +
          "Please check the logged metadata for invalid channel indices."
      );
      return null;
    }
    name = name ?? `${readableType} ${index}`;
    const min = minStr !== undefined ? Number.parseFloat(minStr) : undefined;
    const max = maxStr !== undefined ? Number.parseFloat(maxStr) : undefined;

    return {
      source,
      name,
      channelIndex,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      description,
    };
  }

  private getFrames3dFromMetadata(metadata: Map<string, string | undefined>): Frames3dData | null {
    const numSegChannelsStr = metadata.get(METADATA_SEG_CHANNEL_COUNT);
    const numChannelsStr = metadata.get(METADATA_CHANNEL_COUNT);
    const numSegChannels = numSegChannelsStr ? Number.parseInt(numSegChannelsStr, 10) : 0;
    const numChannels = numChannelsStr ? Number.parseInt(numChannelsStr, 10) : 0;

    if (!numSegChannels && !numChannels) {
      return null;
    }

    // TODO: Update once Dataset has support for multiple seg channels; for now,
    // only the first will be included.
    const segmentations: Backdrop3dData[] = [];
    const backdrops: Backdrop3dData[] = [];
    let numUnloadableSegChannels = 0;
    let numUnloadableChannels = 0;

    for (let i = 0; i < numSegChannels; i++) {
      const segChannelInfo = this.getChannelInfo(metadata, i, "seg");
      if (segChannelInfo) {
        segmentations.push(segChannelInfo);
      } else {
        numUnloadableSegChannels++;
      }
    }
    if (numUnloadableSegChannels > 0) {
      this.options.reportWarning?.(
        formatQuantityString(numUnloadableSegChannels, "segmentation channel", "segmentation channels") +
          " could not be loaded.",
        LoadTroubleshooting.CHECK_PARQUET_3D_METADATA
      );
    }

    for (let i = 0; i < numChannels; i++) {
      const channelInfo = this.getChannelInfo(metadata, i, "channel");
      if (channelInfo) {
        backdrops.push(channelInfo);
      } else {
        numUnloadableChannels++;
      }
    }
    if (numUnloadableChannels > 0) {
      this.options.reportWarning?.(
        formatQuantityString(numUnloadableChannels, "channel", "channels") + " could not be loaded.",
        LoadTroubleshooting.CHECK_PARQUET_3D_METADATA
      );
    }

    const firstSeg = segmentations[0];
    return {
      source: firstSeg.source,
      segmentationChannel: firstSeg.channelIndex,
      backdrops,
    };
  }

  private parseColumnData(chunk: ColumnData, schema: SchemaElement): void {
    const columnName = schema.name;
    const type = schema.type;

    if (!type) {
      console.warn(`Column '${columnName}' does not have a type in Parquet schema, skipping`);
      return;
    }

    if (isMetadataColumn(columnName, type, TIMES_COLUMN_NAMES, MetadataType.INT)) {
      this.times = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, type, TRACK_ID_COLUMN_NAMES, MetadataType.INT)) {
      this.trackIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, type, SEG_ID_COLUMN_NAMES, MetadataType.INT)) {
      this.segIds = Uint32Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, type, CENTROID_X_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsX) {
        this.centroidsX = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, type, CENTROID_Y_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsY) {
        this.centroidsY = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, type, CENTROID_Z_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      if (!this.centroidsZ) {
        this.centroidsZ = Float32Array.from(chunk.columnData, (v) => Number(v));
      }
    } else if (isMetadataColumn(columnName, type, BOUNDS_COLUMN_NAMES, MetadataType.FLOAT_OR_INT)) {
      this.bounds = Uint16Array.from(chunk.columnData, (v) => Number(v));
    } else if (isMetadataColumn(columnName, type, OUTLIER_COLUMN_NAMES, MetadataType.INT_OR_BOOLEAN)) {
      this.outliers = Uint8Array.from(chunk.columnData, (v) => Number(v));
    } else {
      // Otherwise, treat as feature column
      const key = getKeyFromName(columnName);
      if (this.features.has(key)) {
        console.warn(`Duplicate column name '${columnName}' found in Parquet file, skipping`);
        return;
      }
      const data = Float32Array.from(chunk.columnData, (v) => Number(v));
      const textureInfo = arrayToDataTextureInfo(data, FeatureDataType.F32);
      const texture = infoToDataTexture(textureInfo);

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        if (isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }

      this.features.set(key, {
        name: columnName,
        key,
        data: data,
        tex: texture,
        min,
        max,
        unit: "",
        type: FeatureType.CONTINUOUS,
        categories: null,
        description: null,
      });
    }
  }

  private async onLoadedColumnChunk(chunk: ColumnData): Promise<void> {
    const schema = this.columnNameToSchemaMap.get(chunk.columnName);
    if (!schema) {
      console.warn(`Column '${chunk.columnName}' not found in Parquet schema, skipping`);
      return;
    }
    const columnName = schema.name;
    const type = schema.type;

    if (!type) {
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
    const metadataMap = new Map<string, string | undefined>(
      (metadata.key_value_metadata ?? []).map((entry) => [entry.key, entry.value])
    );
    console.log("Parquet file metadata: ", metadataMap);
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
      frames3d: frames3d ?? undefined,
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
