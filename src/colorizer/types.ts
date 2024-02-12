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
  ArrayConstructor: { new (arr: number[]): FeatureArrayType[T] };
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
/** Draw options for object types. */
export enum DrawMode {
  /** Hide this object type. */
  HIDE = 0,
  /** Use a solid color for this object type. */
  USE_COLOR = 1,
}

// Similar to `FeatureType`, but indicates that thresholds are lossy when it comes
// to numeric data. Numeric thresholds do not track if their source feature is integer
// (FeatureType.DISCRETE) or a float (FeatureType.CONTINUOUS).
export enum ThresholdType {
  NUMERIC = "numeric",
  CATEGORICAL = "categorical",
}

type BaseFeatureThreshold = {
  // TODO: Replace with key string
  // featureKey: string;
  featureName: string;
  units: string;
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

/**
 * Configuration for the viewer. These are high-level settings
 * that are not specific to a particular dataset.
 */
export type ViewerConfig = {
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  keepRangeBetweenDatasets: boolean;
  backdropBrightness: number;
  backdropSaturation: number;
  objectOpacity: number;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
};

export const defaultViewerConfig: ViewerConfig = {
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  keepRangeBetweenDatasets: false,
  /** Opacity, as a number percentage. */
  backdropBrightness: 100,
  /** Saturation, as a number percentage. */
  backdropSaturation: 100,
  /** Opacity, as a number percentage. */
  objectOpacity: 100,
  outOfRangeDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUT_OF_RANGE_COLOR_DEFAULT) },
  outlierDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUTLIER_COLOR_DEFAULT) },
};
