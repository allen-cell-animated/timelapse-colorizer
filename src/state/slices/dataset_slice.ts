import { StateCreator } from "zustand";

import { BackdropSlice } from "./backdrop_slice";
import { CollectionSlice } from "./collection_slice";

import Dataset from "../../colorizer/Dataset";

type DatasetSliceState =
  | {
      datasetKey: null;
      dataset: null;
      featureKey: null;
      // track: null;
    }
  | {
      datasetKey: string;
      dataset: Dataset;
      featureKey: string;
      // track: Track | null;
    };

type DatasetSliceActions = {
  setDataset: (key: string, dataset: Dataset) => void;
  clearDataset: () => void;
  /** Sets the current feature key.
   * @throws {Error} If the feature key is not found in the dataset.
   * @throws {Error} If no dataset is loaded.
   */
  setFeatureKey: (featureKey: string) => void;
};

export type DatasetSlice = DatasetSliceState & DatasetSliceActions;

export const createDatasetSlice: StateCreator<CollectionSlice & DatasetSlice & BackdropSlice, [], [], DatasetSlice> = (
  set,
  get
) => ({
  datasetKey: null,
  dataset: null,
  featureKey: null,

  setFeatureKey: (featureKey: string) => {
    const dataset = get().dataset;
    if (!dataset) {
      throw new Error("No dataset loaded");
    } else if (dataset.hasFeatureKey(featureKey)) {
      set({ featureKey });
    } else {
      throw new Error(`ViewerStateStore.setFeatureKey: Feature key '${featureKey}' was not found in the dataset.`);
    }
  },

  setDataset: (key: string, dataset: Dataset) => {
    ///// Validate dataset-dependent state values /////

    // Use new dataset's default feature key if current key is not present
    let featureKey = get().featureKey;
    if (featureKey === null || !dataset.hasFeatureKey(featureKey)) {
      // Set to default feature key of the new dataset
      featureKey = dataset.featureKeys[0];
    }

    // Switch to new dataset's default backdrop if the current one is not in the new dataset.
    let backdropKey = get().backdropKey;
    if (backdropKey === null || !dataset.hasBackdrop(backdropKey)) {
      backdropKey = dataset.getDefaultBackdropKey();
    }
    const backdropVisible = get().backdropVisible && backdropKey !== null;

    // TODO: Dispose of old dataset?
    set({ datasetKey: key, dataset, featureKey, backdropKey, backdropVisible });
  },

  clearDataset: () =>
    set({ datasetKey: null, dataset: null, featureKey: null, backdropKey: null, backdropVisible: false }),
});
