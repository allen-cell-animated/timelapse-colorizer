import { waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { expect } from "vitest";

import { Dataset } from "@/colorizer";
import { ViewerStore } from "@/state/slices";

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
export const compareRecord = <T extends Record<string, unknown>>(actual: T, expected: Partial<T>): void => {
  for (const key in expected) {
    expect(actual[key], `compareRecord: Found different values for field '${key}'.`).toEqual(expected[key]);
  }
};
