import { waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import { Dataset } from "../../../src/colorizer";
import { ViewerState } from "../../../src/state";

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
