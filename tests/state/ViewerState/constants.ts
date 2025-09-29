import { FeatureDataType } from "@/colorizer";
import Collection from "@/colorizer/Collection";
import { CollectionFile } from "@/colorizer/utils/collection_utils";
import { AnyManifestFile, ManifestFile } from "@/colorizer/utils/dataset_utils";

import { DEFAULT_DATASET_DIR, makeMockDataset, MockArrayLoader, MockArraySource } from "../../test_utils";

// TODO: Move to /tests/constants.ts so other tests can use these constants

export enum MockFeatureKeys {
  FEATURE1 = "feature1",
  FEATURE2 = "feature2",
  FEATURE3 = "feature3",
  FEATURE4_ILLEGAL_CHARS = "feature$&%20^4",
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
  [MockFeatureKeys.FEATURE4_ILLEGAL_CHARS]: {
    key: MockFeatureKeys.FEATURE4_ILLEGAL_CHARS,
    name: "Feature$&%20^4",
    data: "feature4.json",
    unit: "meters",
    type: "continuous",
    min: 0,
    max: 1,
  },
};

export enum MockBackdropKeys {
  BACKDROP1 = "backdrop1",
  BACKDROP2 = "backdrop2",
}

export const DEFAULT_INITIAL_FEATURE_KEY = MockFeatureKeys.FEATURE1;

export const MOCK_DATASET_MANIFEST: AnyManifestFile = {
  features: [
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE1],
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE2],
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE3],
    MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE4_ILLEGAL_CHARS],
  ],
  frames: ["frame0.png", "frame1.png", "frame2.png", "frame3.png"],
  backdrops: [
    {
      name: MockBackdropKeys.BACKDROP1,
      key: MockBackdropKeys.BACKDROP1,
      frames: ["frame0.png", "frame1.png", "frame2.png", "frame3.png"],
    },
    {
      name: MockBackdropKeys.BACKDROP2,
      key: MockBackdropKeys.BACKDROP2,
      frames: ["frame0.png", "frame1.png", "frame2.png", "frame3.png"],
    },
  ],
  times: "times.json",
  tracks: "tracks.json",
  segIds: "seg_ids.json",
};

/**
 * Summary of the mock dataset:
 * | Index | Times | Seg IDs | Tracks | Feature 1 | Feature 2 | Feature 3 | Feature 4 |
 * |-------|-------|---------|--------|-----------|-----------|-----------|-----------|
 * | 0     | 0     | 0       | 0      | 0.1       | 0         | 0         | 0.1       |
 * | 1     | 0     | 1       | 1      | 0.2       | 10        | 0         | 0.2       |
 * | 2     | 0     | 2       | 2      | 0.3       | 20        | 0         | 0.3       |
 * | 3     | 1     | 3       | 3      | 0.4       | 30        | 1         | 0.4       |
 * | 4     | 1     | 4       | 4      | 0.5       | 40        | 1         | 0.5       |
 * | 5     | 1     | 5       | 5      | 0.6       | 50        | 1         | 0.6       |
 * | 6     | 2     | 6       | 6      | 0.7       | 60        | 2         | 0.7       |
 * | 7     | 2     | 7       | 7      | 0.8       | 70        | 2         | 0.8       |
 * | 8     | 3     | 8       | 8      | 0.9       | 80        | 2         | 0.9       |
 */

export const MOCK_DATASET_TIMES = [0, 0, 0, 1, 1, 1, 2, 2, 3];
export const MOCK_DATASET_SEG_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const MOCK_DATASET_TRACKS = [0, 1, 2, 0, 1, 2, 0, 1, 2];
export const MOCK_DATASET_FEATURE_1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
export const MOCK_DATASET_FEATURE_2 = [0, 10, 20, 30, 40, 50, 60, 70, 80];
export const MOCK_DATASET_FEATURE_3 = [0, 0, 0, 1, 1, 1, 2, 2, 2];
export const MOCK_DATASET_FEATURE_4 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

export const makeMockDatasetArrayLoader = (basePath: string): Record<string, MockArraySource<FeatureDataType>> => ({
  [basePath + "times.json"]: new MockArraySource(FeatureDataType.U32, new Uint32Array(MOCK_DATASET_TIMES)),
  [basePath + "seg_ids.json"]: new MockArraySource(FeatureDataType.U32, new Uint32Array(MOCK_DATASET_SEG_IDS)),
  [basePath + "tracks.json"]: new MockArraySource(FeatureDataType.U32, new Uint32Array(MOCK_DATASET_TRACKS)),
  [basePath + "feature1.json"]: new MockArraySource(FeatureDataType.F32, new Float32Array(MOCK_DATASET_FEATURE_1)),
  [basePath + "feature2.json"]: new MockArraySource(FeatureDataType.F32, new Float32Array(MOCK_DATASET_FEATURE_2)),
  [basePath + "feature3.json"]: new MockArraySource(FeatureDataType.F32, new Float32Array(MOCK_DATASET_FEATURE_3)),
  [basePath + "feature4.json"]: new MockArraySource(FeatureDataType.F32, new Float32Array(MOCK_DATASET_FEATURE_4)),
});

export const MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE = makeMockDatasetArrayLoader(DEFAULT_DATASET_DIR);

export const MOCK_DATASET_ARRAY_LOADER = new MockArrayLoader(MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE);

export const MOCK_DATASET = await makeMockDataset(MOCK_DATASET_MANIFEST, MOCK_DATASET_ARRAY_LOADER);

export const MOCK_DATASET_WITH_TWO_FRAMES = await makeMockDataset({
  ...MOCK_DATASET_MANIFEST,
  frames: ["frame0.png", "frame1.png"],
  backdrops: [],
});

export const MOCK_DATASET_WITHOUT_BACKDROP = await makeMockDataset({
  ...MOCK_DATASET_MANIFEST,
  backdrops: [],
});

export const MOCK_DATASET_DEFAULT_TRACK = MOCK_DATASET.getTrack(0)!;

export const MOCK_DATASET_KEY = "some-dataset";
export const MOCK_COLLECTION_PATH = "https://some-url.com/collection.json";
export const MOCK_DATASET_PATH = "https://some-url.com/data/dataset.json";

export const MOCK_COLLECTION_MANIFEST: CollectionFile = {
  datasets: [{ path: MOCK_DATASET_PATH, name: MOCK_DATASET_KEY }],
  metadata: {},
};

export const MOCK_COLLECTION = new Collection(
  new Map([[MOCK_DATASET_KEY, { path: MOCK_DATASET_PATH, name: MOCK_DATASET_KEY }]]),
  { sourcePath: MOCK_COLLECTION_PATH }
);
