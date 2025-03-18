import { waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { expect } from "vitest";

import { Dataset } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { ViewerStore } from "../../../src/state/slices";
import { SerializedStoreData } from "../../../src/state/types";

/**
 * Wrapper around `store.setDataset()`. Allows for async operations to complete
 * after a Dataset is set in the store.
 */

export const setDatasetAsync = async (
  result: { current: ViewerStore },
  dataset: Dataset,
  datasetKey: string = "some-dataset"
): Promise<void> => {
  act(() => {
    result.current.setDataset(datasetKey, dataset);
  });
  await waitFor(() => {});
};

export const clearDatasetAsync = async (result: { current: ViewerStore }): Promise<void> => {
  act(() => {
    result.current.clearDataset();
  });
  await waitFor(() => {});
};

/**
 * Checks whether all key-value pairs in `expected` are present in `actual`.
 * Note that `actual` may contain additional key-value pairs not present in
 * `expected` and still pass this check.
 */
export const compareSlice = (actual: Partial<ViewerStore>, expected: Partial<ViewerStore>): void => {
  for (const key in expected) {
    const actualValue = actual[key as keyof ViewerStore];
    const expectedValue = expected[key as keyof ViewerStore];
    expect(actualValue, "Different slice value for field '" + key + "'").toEqual(expectedValue);
  }
};

/**
 * Checks whether all key-value pairs in `expected` are present in `actual`.
 * Note that `actual` may contain additional key-value pairs not present in
 * `expected` and still pass this check.
 */
export const compareSerializedData = (actual: SerializedStoreData, expected: SerializedStoreData): void => {
  for (const key in expected) {
    const actualValue = actual[key as UrlParam];
    const expectedValue = expected[key as UrlParam];
    expect(actualValue, "Different serialized value for field '" + key + "'").toEqual(expectedValue);
  }
};
