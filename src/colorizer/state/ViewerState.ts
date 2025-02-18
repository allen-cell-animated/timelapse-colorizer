import { create } from "zustand";
import { StateCreator } from "zustand";

import { BackdropSlice, createBackdropSlice } from "./slices/backdrop_slice";
import { CollectionSlice, createCollectionSlice } from "./slices/collection_slice";
import { createDatasetSlice, DatasetSlice } from "./slices/dataset_slice";

// See https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#slices-pattern
export type ViewerState = CollectionSlice & DatasetSlice & BackdropSlice;

export const viewerStateStoreCreator: StateCreator<ViewerState> = (...a) => ({
  ...createCollectionSlice(...a),
  ...createDatasetSlice(...a),
  ...createBackdropSlice(...a),
});

// TODO: Add documentation on usage here
export const useViewerStateStore = create<ViewerState>()(viewerStateStoreCreator);

// Adds compatibility with hot module reloading.
// Adapted from https://github.com/pmndrs/zustand/discussions/827#discussioncomment-9843290
declare global {
  interface Window {
    __store: ViewerState;
  }
}

if (import.meta.hot) {
  useViewerStateStore.subscribe((state) => {
    if (typeof window !== "undefined") {
      window.__store = state;
    }
  });
  import.meta.hot!.accept((newModule) => {
    if (!newModule) return;
    const newStore = newModule.useViewerStateStore;
    if (!newStore) return;
    if (window.__store) {
      newStore.setState(window.__store, true);
    }
  });
}
