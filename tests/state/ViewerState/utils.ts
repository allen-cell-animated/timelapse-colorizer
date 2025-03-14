import { waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { expect } from "vitest";

import { Dataset } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { ViewerState } from "../../../src/state";
import { SerializedStoreData } from "../../../src/state/types";

/**
 * Wrapper around `store.setDataset()`. Allows for async operations to complete
 * after a Dataset is set in the store.
 */

export const setDatasetAsync = async (
  result: { current: ViewerState },
  dataset: Dataset,
  datasetKey: string = "some-dataset"
): Promise<void> => {
  act(() => {
    result.current.setDataset(datasetKey, dataset);
  });
  await waitFor(() => {});
};

export const clearDatasetAsync = async (result: { current: ViewerState }): Promise<void> => {
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
export const compareSlice = (actual: Partial<ViewerState>, expected: Partial<ViewerState>): void => {
  for (const key in expected) {
    expect(actual[key as keyof ViewerState]).toEqual(expected[key as keyof ViewerState]);
  }
};

/**
 * Checks whether all key-value pairs in `expected` are present in `actual`.
 * Note that `actual` may contain additional key-value pairs not present in
 * `expected` and still pass this check.
 */
export const compareSerializedData = (actual: SerializedStoreData, expected: SerializedStoreData): void => {
  for (const key in expected) {
    expect(actual[key as UrlParam]).toEqual(expected[key as UrlParam]);
  }
};
