import { create } from "zustand";
import { StateCreator } from "zustand";

import { BackdropSlice, createBackdropSlice } from "./slices/backdrop_slice";
import { CollectionSlice, createCollectionSlice } from "./slices/collection_slice";
import { ColorRampSlice, createColorRampSlice } from "./slices/color_ramp_slice";
import { createDatasetSlice, DatasetSlice } from "./slices/dataset_slice";

export type ViewerState = CollectionSlice & DatasetSlice & BackdropSlice & ColorRampSlice;

export const viewerStateStoreCreator: StateCreator<ViewerState> = (...a) => ({
  ...createCollectionSlice(...a),
  ...createDatasetSlice(...a),
  ...createBackdropSlice(...a),
  ...createColorRampSlice(...a),
});

// TODO: Add documentation on usage here
export const useViewerStateStore = create<ViewerState>()(viewerStateStoreCreator);
