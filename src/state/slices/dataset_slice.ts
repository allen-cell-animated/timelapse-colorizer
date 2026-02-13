import type { StateCreator } from "zustand";

import type Dataset from "src/colorizer/Dataset";
import { ViewMode } from "src/colorizer/types";
import { UrlParam } from "src/colorizer/utils/url_utils";
import type { SerializedStoreData } from "src/state/types";

import type { CollectionSlice } from "./collection_slice";

export type DatasetSliceState = {
  datasetKey: string | null;
  dataset: Dataset | null;
  featureKey: string | null;
  /** The key of the backdrop image set in the current dataset. `null` if there
   * is no Dataset loaded or if the dataset does not have backdrops. */
  backdropKey: string | null;

  // Derived state flags
  /**
   * Current view mode, either 2D or 3D. Updates based on the currently loaded
   * dataset.
   */
  viewMode: ViewMode;
};

export type DatasetSliceSerializableState = Pick<DatasetSliceState, "datasetKey" | "featureKey" | "backdropKey">;

export type DatasetSliceActions = {
  setDataset: (key: string, dataset: Dataset) => void;
  clearDataset: () => void;
  /** Sets the current feature key.
   * @throws {Error} If the feature key is not found in the dataset.
   * @throws {Error} If no dataset is loaded.
   */
  setFeatureKey: (featureKey: string) => void;
  setBackdropKey: (key: string) => void;
};

export type DatasetSlice = DatasetSliceState & DatasetSliceActions;

export const createDatasetSlice: StateCreator<CollectionSlice & DatasetSlice, [], [], DatasetSlice> = (set, get) => ({
  datasetKey: null,
  dataset: null,
  featureKey: null,
  backdropKey: null,
  viewMode: ViewMode.VIEW_2D,

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

    // Prefer 3D mode if the dataset supports it.
    let viewMode = ViewMode.VIEW_2D;
    if (dataset.has3dFrames()) {
      viewMode = ViewMode.VIEW_3D;
    }

    set({ datasetKey: key, dataset, featureKey, backdropKey, viewMode });
  },

  clearDataset: () =>
    set({ datasetKey: null, dataset: null, featureKey: null, backdropKey: null, viewMode: ViewMode.VIEW_2D }),
});

export const serializeDatasetSlice = (slice: Partial<DatasetSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (slice.datasetKey !== undefined && slice.datasetKey !== null) {
    ret[UrlParam.DATASET] = slice.datasetKey;
  }
  if (slice.featureKey !== undefined && slice.featureKey !== null) {
    ret[UrlParam.FEATURE] = slice.featureKey;
  }
  if (slice.backdropKey !== undefined && slice.backdropKey !== null) {
    ret[UrlParam.BACKDROP_KEY] = slice.backdropKey;
  }
  return ret;
};

/** Selects state values that serialization depends on. */
export const selectDatasetSliceSerializationDeps = (slice: DatasetSlice): DatasetSliceSerializableState => ({
  datasetKey: slice.datasetKey,
  featureKey: slice.featureKey,
  backdropKey: slice.backdropKey,
});

export const loadDatasetSliceFromParams = (slice: DatasetSlice, params: URLSearchParams): void => {
  const dataset = slice.dataset;
  if (!dataset) {
    // TODO: Throw error here?
    return;
  }
  const featureKeyParam = params.get(UrlParam.FEATURE);
  const backdropKeyParam = params.get(UrlParam.BACKDROP_KEY);

  if (featureKeyParam !== null) {
    const featureKey = dataset.findFeatureByKeyOrName(featureKeyParam);
    if (featureKey) {
      slice.setFeatureKey(featureKey);
    }
  }
  if (backdropKeyParam !== null && dataset.hasBackdrop(backdropKeyParam)) {
    slice.setBackdropKey(backdropKeyParam);
  }
};
