import { describe, expect, it, vi } from "vitest";

import { UrlParam } from "src/colorizer/utils/url_utils";
import { loadInitialCollectionAndDataset } from "src/utils/dataset_load_utils";

import {
  MOCK_COLLECTION,
  MOCK_COLLECTION_MANIFEST,
  MOCK_COLLECTION_PATH,
  MOCK_DATASET_ARRAY_LOADER,
  MOCK_DATASET_KEY,
  MOCK_DATASET_MANIFEST,
  MOCK_DATASET_PATH,
} from "../state/ViewerState/constants";
import { makeMockAsyncLoader, makeMockFetchMethod, MockFrameLoader } from "../test_utils";

describe("loadInitialCollectionAndDataset", () => {
  it("reports missing dataset if no params are provided", async () => {
    const reportMissingDataset = vi.fn();
    const result = await loadInitialCollectionAndDataset(new URLSearchParams(), null, { reportMissingDataset });
    expect(result).toBeNull();
    expect(reportMissingDataset).toBeCalledTimes(1);
  });

  it("reports load error if only non-url dataset is provided", async () => {
    const reportLoadError = vi.fn();
    const result = await loadInitialCollectionAndDataset(
      new URLSearchParams(),
      { datasetKey: "non-url-dataset" },
      { reportLoadError }
    );
    expect(result).toBeNull();
    expect(reportLoadError).toBeCalledTimes(1);
  });

  it("accepts collection override", async () => {
    const result = await loadInitialCollectionAndDataset(
      new URLSearchParams(),
      { collection: MOCK_COLLECTION },
      {
        arrayLoader: MOCK_DATASET_ARRAY_LOADER,
        frameLoader: new MockFrameLoader(),
        manifestLoader: makeMockAsyncLoader(MOCK_DATASET_PATH, MOCK_DATASET_MANIFEST),
      }
    );
    expect(result).not.toBeNull();
    expect(result?.collection).toBe(MOCK_COLLECTION);
    expect(result?.datasetKey).toBe(MOCK_DATASET_KEY);
  });

  it("loads collection and dataset", async () => {
    const params = new URLSearchParams();
    params.set(UrlParam.COLLECTION, MOCK_COLLECTION_PATH);
    const result = await loadInitialCollectionAndDataset(params, null, {
      collectionFetchMethod: makeMockFetchMethod(MOCK_COLLECTION_PATH, MOCK_COLLECTION_MANIFEST),
      arrayLoader: MOCK_DATASET_ARRAY_LOADER,
      frameLoader: new MockFrameLoader(),
      manifestLoader: makeMockAsyncLoader(MOCK_DATASET_PATH, MOCK_DATASET_MANIFEST),
    });
    expect(result).not.toBeNull();
    expect(result?.collection).toStrictEqual(MOCK_COLLECTION);
    expect(result?.datasetKey).toBe(MOCK_DATASET_KEY);
    expect(result?.dataset).not.toBeNull();
  });
});
