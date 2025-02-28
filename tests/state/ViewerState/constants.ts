import { AnyManifestFile } from "../../../src/colorizer/utils/dataset_utils";
import { makeMockDataset } from "../../test_utils";

export enum MOCK_FEATURE_KEYS {
  FEATURE1 = "feature1",
  FEATURE2 = "feature2",
  FEATURE3 = "feature3",
}

export const DEFAULT_BACKDROP_KEY = "test_backdrop_key";
export const DEFAULT_INITIAL_FEATURE_KEY = MOCK_FEATURE_KEYS.FEATURE1;

const MOCK_DATASET_MANIFEST: AnyManifestFile = {
  frames: ["frame0.json"],
  features: [
    {
      key: MOCK_FEATURE_KEYS.FEATURE1,
      name: "Feature1",
      data: "feature1.json",
      unit: "meters",
      type: "continuous",
      min: 0,
      max: 1,
    },
    {
      key: MOCK_FEATURE_KEYS.FEATURE2,
      name: "Feature2",
      data: "feature2.json",
      unit: "(m)",
      type: "discrete",
      min: 0,
      max: 100,
    },
    {
      key: MOCK_FEATURE_KEYS.FEATURE3,
      name: "feature3",
      data: "feature3.json",
      type: "categorical",
      categories: ["small", "medium", "large"],
      min: 0,
      max: 2,
    },
  ],
  backdrops: [{ name: DEFAULT_BACKDROP_KEY, key: DEFAULT_BACKDROP_KEY, frames: ["frame0.json"] }],
};

export const MOCK_DATASET = await makeMockDataset(MOCK_DATASET_MANIFEST);

export const MOCK_DATASET_WITHOUT_BACKDROP = await makeMockDataset({
  ...MOCK_DATASET_MANIFEST,
  backdrops: [],
});
