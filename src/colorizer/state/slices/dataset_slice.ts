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
    // Validate dataset-dependent state values
    let backdropKey = get().backdropKey;
    backdropKey = backdropKey !== null && dataset.hasBackdrop(backdropKey) ? backdropKey : null;

    set({ datasetKey: key, dataset, backdropKey });
  },
  clearDataset: () => set({ datasetKey: null, dataset: null, backdropKey: null }),
});
