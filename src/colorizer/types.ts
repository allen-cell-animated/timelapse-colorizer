import {
  Color,
  DataTexture,
  FloatType,
  IntType,
  PixelFormat,
  PixelFormatGPU,
  RedFormat,
  RedIntegerFormat,
  TextureDataType,
  UnsignedByteType,
  UnsignedIntType,
  Vector2,
} from "three";

// This file provides a bit of type trickery to allow data loading code to be generic over multiple numeric types.

export type HexColorString = `#${string}`;

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

// CANVAS //////////////////////////////////////

export type FrameLoadResult = {
  frame: number;
  /** True if frame loading encountered an error. */
  frameError: boolean;
  backdropKey: string | null;
  /** True if backdrop loading encountered an error */
  backdropError: boolean;
};

export enum CanvasType {
  CANVAS_2D = "2D",
  CANVAS_3D = "3D",
}

export type Canvas2DScaleInfo = {
  type: CanvasType.CANVAS_2D;
  /**
   * Size of the frame in [0, 1] canvas coordinates, accounting for zoom.
   */
  frameSizeInCanvasCoordinates: Vector2;
  /**
   * Transforms from [0,1] space of the canvas to the [0,1] space of the frame,
   * account for zoom.
   *
   * e.g. If frame has the same aspect ratio as the canvas and zoom is set to
   * 2x, then, assuming that the [0, 0] position of the frame and the canvas are
   * in the same position, the position [1, 1] on the canvas should map to [0.5,
   * 0.5] on the frame.
   */
  canvasToFrameCoordinates: Vector2;
  /**
   * Inverse of `canvasToFrameCoordinates`. Transforms from [0,1] space of the
   * frame to the [0,1] space of the canvas, accounting for zoom.
   */
  frameToCanvasCoordinates: Vector2;
};

export type Canvas3DScaleInfo = {
  type: CanvasType.CANVAS_3D;
};

export type CanvasScaleInfo = Canvas3DScaleInfo | Canvas2DScaleInfo;

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

export enum VectorTooltipMode {
  MAGNITUDE = "m",
  COMPONENTS = "c",
}

export const isVectorTooltipMode = (mode: string): mode is VectorTooltipMode => {
  return Object.values(VectorTooltipMode).includes(mode as VectorTooltipMode);
};

export type VectorConfig = {
  visible: boolean;
  key: string;
  /** Number of time intervals to average over when calculating motion deltas. 5 by default. */
  timeIntervals: number;
  color: Color;
  scaleFactor: number;
  tooltipMode: VectorTooltipMode;
};

// TODO: This should live in the viewer and not in `colorizer`. Same with `url_utils`.
// CHANGING THESE VALUES CAN POTENTIALLY BREAK URLs. See `url_utils.parseDrawSettings` for parsing logic.
export enum TabType {
  TRACK_PLOT = "track_plot",
  SCATTER_PLOT = "scatter_plot",
  CORRELATION_PLOT = "correlation_plot",
  FILTERS = "filters",
  ANNOTATION = "annotation",
  SETTINGS = "settings",
}

export const isTabType = (tab: string): tab is TabType => {
  return Object.values(TabType).includes(tab as TabType);
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

export enum AnnotationSelectionMode {
  TIME,
  RANGE,
  TRACK,
}

/**
 * Data used to map from the segmentation ID (e.g. raw pixel value) of an object
 * in a given frame to its global ID in the dataset, which is used to index into
 * data arrays for feature, time, track, and other data. We use a lookup because
 * segmentation IDs are not guaranteed to be unique across frames.
 *
 * The global ID of an object with segmentation ID `segId` and
 * GlobalIdLookupInfo `info` is given by:
 *
 * ```
 * info.lut[segId - info.minSegId] - 1
 * ```
 *
 *  If the segmentation ID is not present in the dataset, the global ID is
 * `NaN` or `-1`.
 */
export type GlobalIdLookupInfo = {
  /**
   * A LUT that maps from segmentation IDs to global IDs.
   *
   * An optimization is performed where all segmentation IDs are offset by the
   * smallest segmentation ID in the frame to reduce the size of the LUT.
   * Additionally, the value `0` is reserved to indicate that a segmentation ID
   * does not have a global ID, so all global IDs are offset by 1.
   *
   * For example, if we had the following segmentation IDs and global IDs:
   * 
   * | Segmentation IDs | Global ID | Global ID + 1 |
   * |------------------|-----------|---------------|
   * | 3                | 0         | 1             |
   * | 4                | 2         | 3             |
   * | 6                | 4         | 5             |
   * | 9                | 1         | 2             |

   * The raw, pre-optimized LUT would be: `[0, 0, 0, 1, 3, 0, 5, 0, 0, 2]`. We
   * can reduce the size of the LUT by removing the starting 0s and just
   * tracking the smallest ID separately, which gives us `[1, 3, 0, 5, 0, 0,
   * 2]`.
   */
  lut: Uint32Array;
  /**
   * The `lut` packed as a DataTexture with square dimensions. See comments on
   * `lut` for more details on the contents.
   */
  texture: DataTexture;
  /**
   * The smallest segmentation on this frame, used for memory optimization.
   */
  minSegId: number;
};

export type PixelIdInfo = {
  /** Segmentation ID of the pixel.*/
  segId: number;
  /** Global ID derived from the segmentation ID, used to index into data
   * arrays. `undefined` if the segmentation ID is missing from the dataset.
   */
  globalId?: number;
};

/**
 * Callback used to report warnings to the user. The message is the title
 * of the warning, and the description is the body of the warning. If an array
 * is provided for the description, each string should be displayed on a new line.
 */
export type ReportWarningCallback = (message: string, description: string | string[]) => void;

export type ReportErrorCallback = (message: string) => void;

export type ReportLoadProgressCallback = (complete: number, total: number) => void;

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
