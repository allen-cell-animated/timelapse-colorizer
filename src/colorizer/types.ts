import {
  Color,
  FloatType,
  IntType,
  PixelFormat,
  PixelFormatGPU,
  RedFormat,
  RedIntegerFormat,
  TextureDataType,
  UnsignedByteType,
  UnsignedIntType,
} from "three";

export const OUTLIER_COLOR_DEFAULT = 0xc0c0c0;
export const OUT_OF_RANGE_COLOR_DEFAULT = 0xdddddd;

// This file provides a bit of type trickery to allow data loading code to be generic over multiple numeric types.

/** Available types for data loading (features, tracks, outliers, etc.), as a CPU buffer or a GPU texture */
export enum FeatureDataType {
  F32,
  U32,
  I32,
  U16,
  U8,
}

/** Maps `FeatureDataType` to the corresponding typed array type */
export type FeatureArrayType = {
  [T in FeatureDataType]: {
    [FeatureDataType.F32]: Float32Array;
    [FeatureDataType.U32]: Uint32Array;
    [FeatureDataType.I32]: Int32Array;
    [FeatureDataType.U16]: Uint16Array;
    [FeatureDataType.U8]: Uint8Array;
  }[T];
};

type FeatureTypeSpec<T extends FeatureDataType> = {
  /** The constructor for a `TypedArray` of this numeric type */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ArrayConstructor: { new (arr: number[] | number): FeatureArrayType[T] };
  format: PixelFormat;
  dataType: TextureDataType;
  internalFormat: PixelFormatGPU;
};

/** Maps `FeatureDataType` to values required to create a valid texture of that type */
export const featureTypeSpecs: { [T in FeatureDataType]: FeatureTypeSpec<T> } = {
  [FeatureDataType.F32]: {
    ArrayConstructor: Float32Array,
    format: RedFormat,
    dataType: FloatType,
    internalFormat: "R32F",
  },
  [FeatureDataType.U32]: {
    ArrayConstructor: Uint32Array,
    format: RedIntegerFormat,
    dataType: UnsignedIntType,
    internalFormat: "R32UI",
  },
  [FeatureDataType.I32]: {
    ArrayConstructor: Int32Array,
    format: RedIntegerFormat,
    dataType: IntType,
    internalFormat: "R32I",
  },
  [FeatureDataType.U16]: {
    ArrayConstructor: Uint16Array,
    format: RedIntegerFormat,
    dataType: UnsignedIntType,
    internalFormat: "R16UI",
  },
  [FeatureDataType.U8]: {
    ArrayConstructor: Uint8Array,
    format: RedIntegerFormat,
    dataType: UnsignedByteType,
    internalFormat: "R8UI",
  },
};

// MUST be synchronized with the DRAW_MODE_* constants in `colorize_RGBA8U.frag`!
// CHANGING THESE VALUES CAN POTENTIALLY BREAK URLs. See `url_utils.parseDrawSettings` for parsing logic.
/** Draw options for object types. */
export enum DrawMode {
  /** Hide this object type. */
  HIDE = 0,
  /** Use a solid color for this object type. */
  USE_COLOR = 1,
}

export const isDrawMode = (mode: number): mode is DrawMode => {
  return mode === DrawMode.HIDE || mode === DrawMode.USE_COLOR;
};

// Similar to `FeatureType`, but indicates that thresholds are lossy when it comes
// to numeric data. Numeric thresholds do not track if their source feature is integer
// (FeatureType.DISCRETE) or a float (FeatureType.CONTINUOUS).
export enum ThresholdType {
  NUMERIC = "numeric",
  CATEGORICAL = "categorical",
}

type BaseFeatureThreshold = {
  featureKey: string;
  unit: string;
  type: ThresholdType;
};

export type NumericFeatureThreshold = BaseFeatureThreshold & {
  type: ThresholdType.NUMERIC;
  min: number;
  max: number;
};

export type CategoricalFeatureThreshold = BaseFeatureThreshold & {
  type: ThresholdType.CATEGORICAL;
  enabledCategories: boolean[];
};

export type FeatureThreshold = NumericFeatureThreshold | CategoricalFeatureThreshold;

export const isThresholdCategorical = (threshold: FeatureThreshold): threshold is CategoricalFeatureThreshold => {
  return threshold.type === ThresholdType.CATEGORICAL;
};

export const isThresholdNumeric = (threshold: FeatureThreshold): threshold is NumericFeatureThreshold => {
  return threshold.type === ThresholdType.NUMERIC;
};

export type DrawSettings = {
  mode: DrawMode;
  color: Color;
};

export enum VectorViewMode {
  ALL = "all",
  TRACK_ONLY = "track_only",
  HIDE = "hide",
}

export type VectorConfig = {
  mode: VectorViewMode;
  timesteps: number;
  timestepThreshold: number;
  color: Color;
  amplitudePx: number;
};

export const getDefaultVectorConfig = (): VectorConfig => ({
  mode: VectorViewMode.ALL,
  timesteps: 5,
  timestepThreshold: 3,
  color: new Color(0x000000),
  amplitudePx: 5,
});

// CHANGING THESE VALUES CAN POTENTIALLY BREAK URLs. See `url_utils.parseDrawSettings` for parsing logic.
export enum TabType {
  FILTERS = "filters",
  TRACK_PLOT = "track_plot",
  SCATTER_PLOT = "scatter_plot",
  SETTINGS = "settings",
}

export const isTabType = (tab: string): tab is TabType => {
  return Object.values(TabType).includes(tab as TabType);
};

/**
 * Configuration for the viewer. These are high-level settings
 * that are not specific to a particular dataset.
 */
export type ViewerConfig = {
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  showLegendDuringExport: boolean;
  showHeaderDuringExport: boolean;
  keepRangeBetweenDatasets: boolean;
  /** Brightness, as an integer percentage. */
  backdropBrightness: number;
  /** Saturation, as an integer percentage. */
  backdropSaturation: number;
  /** Opacity, as an integer percentage. */
  objectOpacity: number;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  openTab: TabType;
  vectorSettings: VectorConfig;
};

export const defaultViewerConfig: ViewerConfig = {
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  showLegendDuringExport: true,
  showHeaderDuringExport: true,
  keepRangeBetweenDatasets: false,
  /** Brightness, as an integer percentage. */
  backdropBrightness: 100,
  /** Saturation, as an integer percentage. */
  backdropSaturation: 100,
  /** Opacity, as an integer percentage. */
  objectOpacity: 100,
  outOfRangeDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUT_OF_RANGE_COLOR_DEFAULT) },
  outlierDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUTLIER_COLOR_DEFAULT) },
  openTab: TabType.TRACK_PLOT,
  vectorSettings: getDefaultVectorConfig(),
};

export enum PlotRangeType {
  ALL_TIME = "All time",
  CURRENT_TRACK = "Current track",
  CURRENT_FRAME = "Current frame",
}

export type ScatterPlotConfig = {
  xAxis: string | null;
  yAxis: string | null;
  rangeType: PlotRangeType;
};

// Use a function instead of a constant to avoid sharing the same object reference.
export const getDefaultScatterPlotConfig = (): ScatterPlotConfig => ({
  xAxis: null,
  yAxis: null,
  rangeType: PlotRangeType.ALL_TIME,
});

/**
 * Callback used to report warnings to the user. The message is the title
 * of the warning, and the description is the body of the warning. If an array
 * is provided for the description, each string should be displayed on a new line.
 */
export type ReportWarningCallback = (message: string, description: string | string[]) => void;

export enum LoadTroubleshooting {
  CHECK_NETWORK = "This may be due to a network issue, the server being unreachable, or a misconfigured URL." +
    " Please check your network access.",
  CHECK_FILE_EXISTS = "Please check if the file exists and if you have access to it, or see the developer console for more details.",
  CHECK_FILE_OR_NETWORK = "This may be because of an unsupported format, missing files, or server and network issues. Please see the developer console for more details.",
}

export enum LoadErrorMessage {
  UNREACHABLE_MANIFEST = "The expected manifest JSON file could not be reached.",
  UNREACHABLE_COLLECTION = "The expected collection JSON file could not be reached.",
  BOTH_UNREACHABLE = "Could not access either a collection or a dataset JSON at the provided URL.",
  BOTH_404 = "Could not load the provided URL as either a collection or a dataset. Server returned a 404 (Not Found) code.",
  COLLECTION_HAS_NO_DATASETS = "Collection JSON was loaded but no datasets were found. At least one dataset must be defined in the collection.",
  MANIFEST_HAS_NO_FEATURES = "The dataset's manifest JSON was loaded but no features were found. At least one feature must be defined.",
  COLLECTION_JSON_PARSE_FAILED = "Parsing failed for the collections JSON file with the following error. Please check that the JSON syntax is correct: ",
  MANIFEST_JSON_PARSE_FAILED = "Parsing failed for the manifest JSON file with the following error. Please check that the JSON syntax is correct: ",
}
