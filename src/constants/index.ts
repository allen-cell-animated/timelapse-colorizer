import {
  CategoricalFeatureThreshold,
  FeatureThreshold,
  NumericFeatureThreshold,
  ThresholdType,
} from "../colorizer/types";

export const DEFAULT_PLAYBACK_FPS = 10;
export const MAX_FEATURE_CATEGORIES = 12;

export const isThresholdCategorical = (threshold: FeatureThreshold): threshold is CategoricalFeatureThreshold => {
  return threshold.type === ThresholdType.CATEGORICAL;
};

export const isThresholdNumeric = (threshold: FeatureThreshold): threshold is NumericFeatureThreshold => {
  return threshold.type === ThresholdType.NUMERIC;
};

export * from "./url";
