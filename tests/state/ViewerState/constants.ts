import { Dataset } from "../../../src/colorizer";

export const DEFAULT_BACKDROP_KEY = "test_backdrop_key";

// TODO: This will likely need to be an actual dataset object at some point
// as changing the dataset has more side effects.
export const MOCK_DATASET_WITH_BACKDROP = {
  getDefaultBackdropKey: () => DEFAULT_BACKDROP_KEY,
  hasBackdrop: (key: string) => key === DEFAULT_BACKDROP_KEY,
} as unknown as Dataset;

export const MOCK_DATASET_WITHOUT_BACKDROP = {
  getDefaultBackdropKey: () => null,
  hasBackdrop: () => false,
} as unknown as Dataset;
