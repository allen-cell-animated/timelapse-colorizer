import { StateCreator } from "zustand";

import { Track } from "../../colorizer";
import { BackdropSlice } from "./backdrop_slice";
import { CollectionSlice } from "./collection_slice";

import Dataset from "../../colorizer/Dataset";

type DatasetSliceState =
  | {
      datasetKey: null;
      dataset: null;
      featureKey: null;
      track: null;
      /** The key of the backdrop image set in the current dataset. `null` if there
       * is no Dataset loaded or if the dataset does not have backdrops. */
      backdropKey: null;
    }
  | {
      datasetKey: string;
      dataset: Dataset;
      featureKey: string;
      track: Track | null;
      /** The key of the backdrop image set in the current dataset. `null` if there
       * is no Dataset loaded or if the dataset does not have backdrops. */
      backdropKey: string | null;
    };

type DatasetSliceActions = {
  setDataset: (key: string, dataset: Dataset) => void;
  clearDataset: () => void;
  /** Sets the current feature key.
   * @throws {Error} If the feature key is not found in the dataset.
   * @throws {Error} If no dataset is loaded.
   */
  setFeatureKey: (featureKey: string) => void;
  setTrack: (track: Track) => void;
  clearTrack: () => void;
  setBackdropKey: (key: string) => void;
};

export type DatasetSlice = DatasetSliceState & DatasetSliceActions;

export const createDatasetSlice: StateCreator<CollectionSlice & DatasetSlice & BackdropSlice, [], [], DatasetSlice> = (
  set,
  get
) => ({
  datasetKey: null,
  dataset: null,
  featureKey: null,
  track: null,
  backdropKey: null,

  setBackdropKey: (key: string) => {
    const dataset = get().dataset;
    if (dataset === null) {
      throw new Error("DatasetSlice.setBackdropKey: Cannot set backdrop key when no dataset loaded");
    }
    if (!dataset.hasBackdrop(key)) {
      // Ignore if key is not in the dataset
      throw new Error(
        `Backdrop key "${key}" could not be found in dataset. (Available keys: ${Array.from(
          dataset.getBackdropData().keys()
        )})`
      );
    }
    set({ backdropKey: key });
  },
  setFeatureKey: (featureKey: string) => {
    const dataset = get().dataset;
    if (!dataset) {
      throw new Error("DatasetSlice.setFeatureKey: Cannot set feature key when no dataset loaded");
    } else if (dataset.hasFeatureKey(featureKey)) {
      set({ featureKey });
    } else {
      throw new Error(`ViewerStateStore.setFeatureKey: Feature key '${featureKey}' was not found in the dataset.`);
    }
  },
  setTrack: (track: Track) => {
    if (!get().dataset) {
      throw new Error("DatasetSlice.setTrack: Cannot set track when no dataset loaded");
    }
    // TODO: Validate whether the track is in the dataset?
    set({ track });
  },
  clearTrack: () => {
    set({ track: null });
  },

  setDataset: (key: string, dataset: Dataset) => {
    // TODO: Clear/dispose of old dataset here?

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
    set({ datasetKey: key, dataset, track: null, featureKey, backdropKey, backdropVisible });
  },

  clearDataset: () =>
    set({ datasetKey: null, dataset: null, track: null, featureKey: null, backdropKey: null, backdropVisible: false }),
});
