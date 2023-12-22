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
import { OUT_OF_RANGE_COLOR_DEFAULT, OUTLIER_COLOR_DEFAULT } from "./ColorizeCanvas";

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

export type FeatureThreshold = {
  featureName: string;
  units: string;
  min: number;
  max: number;
};

export type DrawSettings = {
  mode: DrawMode;
  color: Color;
};

/**
 * Configuration for the canvas viewer.
 */
export type CanvasViewerSettings = {
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  backdropKey: string | null;
  backdropBrightness: number;
  backdropSaturation: number;
  objectOpacity: number;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
};

export const defaultViewerSettings: CanvasViewerSettings = {
  showTrackPath: true,
  showScaleBar: true,
  showTimestamp: true,
  backdropKey: null,
  backdropBrightness: 100,
  backdropSaturation: 100,
  objectOpacity: 100,
  outOfRangeDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUT_OF_RANGE_COLOR_DEFAULT) },
  outlierDrawSettings: { mode: DrawMode.USE_COLOR, color: new Color(OUTLIER_COLOR_DEFAULT) },
};
