import { waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import { Dataset, FeatureDataType } from "../../../src/colorizer";
import { AnyManifestFile, ManifestFile } from "../../../src/colorizer/utils/dataset_utils";
import { ViewerState } from "../../../src/state";
import { DEFAULT_DATASET_DIR, makeMockDataset, MockArrayLoader, MockArraySource } from "../../test_utils";

/**
 * Wrapper around `store.setDataset()`. Allows for async operations to complete
 * after a Dataset is set in the store.
 */
export const setDatasetAsync = async (
  result: { current: ViewerState },
  dataset: Dataset,
  datasetKey: string = "some-dataset"
) => {
  act(() => {
    result.current.setDataset(datasetKey, dataset);
  });
  await waitFor(() => {});
};

export enum MockFeatureKeys {
  FEATURE1 = "feature1",
  FEATURE2 = "feature2",
  FEATURE3 = "feature3",
}

export const MOCK_FEATURE_DATA: Record<MockFeatureKeys, ManifestFile["features"][0]> = {
  [MockFeatureKeys.FEATURE1]: {
    key: MockFeatureKeys.FEATURE1,
    name: "Feature1",
    data: "feature1.json",
    unit: "meters",
    type: "continuous",
    min: 0,
    max: 1,
  },
  [MockFeatureKeys.FEATURE2]: {
    key: MockFeatureKeys.FEATURE2,
    name: "Feature2",
    data: "feature2.json",
    unit: "(m)",
    type: "discrete",
    min: 0,
    max: 100,
  },
  [MockFeatureKeys.FEATURE3]: {
    key: MockFeatureKeys.FEATURE3,
    name: "feature3",
    data: "feature3.json",
    type: "categorical",
    unit: "",
    categories: ["small", "medium", "large"],
    min: 0,
    max: 2,
  },
};

export const DEFAULT_BACKDROP_KEY = "test_backdrop_key";
export const DEFAULT_INITIAL_FEATURE_KEY = MockFeatureKeys.FEATURE1;

const MOCK_DATASET_MANIFEST: AnyManifestFile = {
  features: [
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE1],
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE2],
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE3],
  ],
  frames: ["frame0.png", "frame1.png", "frame2.png", "frame3.png"],
  backdrops: [
    {
      name: DEFAULT_BACKDROP_KEY,
      key: DEFAULT_BACKDROP_KEY,
      frames: ["frame0.png", "frame1.png", "frame2.png", "frame3.png"],
    },
  ],
  times: "times.json",
  tracks: "tracks.json",
};

const mockArrayLoader = new MockArrayLoader({
  [DEFAULT_DATASET_DIR + "times.json"]: new MockArraySource(
    FeatureDataType.U32,
    new Uint32Array([0, 1, 2, 0, 1, 2, 0, 1, 2])
  ),
  [DEFAULT_DATASET_DIR + "tracks.json"]: new MockArraySource(
    FeatureDataType.U32,
    new Uint32Array([0, 0, 0, 1, 1, 1, 2, 2, 2])
  ),
  [DEFAULT_DATASET_DIR + "feature1.json"]: new MockArraySource(
    FeatureDataType.F32,
    new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
  ),
  [DEFAULT_DATASET_DIR + "feature2.json"]: new MockArraySource(
    FeatureDataType.F32,
    new Float32Array([0, 10, 20, 30, 40, 50, 60, 70, 80])
  ),
  [DEFAULT_DATASET_DIR + "feature3.json"]: new MockArraySource(
    FeatureDataType.F32,
    new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2])
  ),
});

export const MOCK_DATASET = await makeMockDataset(MOCK_DATASET_MANIFEST, mockArrayLoader);

export const MOCK_DATASET_WITHOUT_BACKDROP = await makeMockDataset({
  ...MOCK_DATASET_MANIFEST,
  backdrops: [],
});
