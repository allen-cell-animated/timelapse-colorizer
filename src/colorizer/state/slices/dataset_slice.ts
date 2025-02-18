import { StateCreator } from "zustand";

import { BackdropSlice } from "./backdrop_slice";
import { CollectionSlice } from "./collection_slice";

import Dataset from "../../Dataset";

type DatasetSliceState = {
  datasetKey: string | null;
  dataset: Dataset | null;
};

type DatasetSliceActions = {
  setDataset: (key: string, dataset: Dataset) => void;
  clearDataset: () => void;
};

export type DatasetSlice = DatasetSliceState & DatasetSliceActions;

export const createDatasetSlice: StateCreator<CollectionSlice & DatasetSlice & BackdropSlice, [], [], DatasetSlice> = (
  set,
  get
) => ({
  datasetKey: null,
  dataset: null,

  setDataset: (key: string, dataset: Dataset) => {
    ///// Validate dataset-dependent state values /////

    // Switch to new dataset's default backdrop if the current one is not in the new dataset.
    let backdropKey = get().backdropKey;
    if (backdropKey === null || !dataset.hasBackdrop(backdropKey)) {
      backdropKey = dataset.getDefaultBackdropKey();
    }

    // TODO: Dispose of old dataset?
    set({ datasetKey: key, dataset, backdropKey });
  },
  clearDataset: () => set({ datasetKey: null, dataset: null, backdropKey: null }),
});
