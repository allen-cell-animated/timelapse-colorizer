import { create } from "zustand";
import { StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { Spread } from "../colorizer/utils/type_utils";
import { BackdropSlice, createBackdropSlice } from "./slices/backdrop_slice";
import { CollectionSlice, createCollectionSlice } from "./slices/collection_slice";
import { addColorRampDerivedStateSubscribers, ColorRampSlice, createColorRampSlice } from "./slices/color_ramp_slice";
import { createDatasetSlice, DatasetSlice } from "./slices/dataset_slice";

// The ViewerState is composed of many smaller slices, modules of related state,
// actions, and selectors. See
// https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md#slices-pattern
// for more details on the pattern.
export type ViewerState = Spread<CollectionSlice & DatasetSlice & BackdropSlice & ColorRampSlice>;

export const viewerStateStoreCreator: StateCreator<ViewerState> = (...a) => ({
  ...createCollectionSlice(...a),
  ...createDatasetSlice(...a),
  ...createBackdropSlice(...a),
  ...createColorRampSlice(...a),
});

/**
 * Hook for accessing the global viewer state store. If used with selectors,
 * components will only rerender when the selected state changes.
 *
 * @example
 * ```tsx
 * // Selecting a single value or action from the store:
 * const dataset = useViewerStateStore((state) => state.dataset);
 * const setDataset = useViewerStateStore((state) => state.setDataset);
 *
 * // Selecting multiple values or actions from the store:
 * import { useShallow } from "zustand/shallow";
 *
 * const store = useViewerStateStore(
 *   useShallow((state) => ({
 *     dataset: state.dataset,
 *     datasetKey: state.datasetKey,
 *     collection: state.collection,
 *     setDataset: state.setDataset,
 *   }))
 * );
 * console.log(store.dataset);
 *
 * // Selecting the entire store state (not recommended as it
 * // will rerender on any state change):
 * const store = useViewerStateStore();
 * console.log(store.dataset);
 *
 * // Subscribing to changes in the store:
 * useViewerStateStore.subscribe(
 *   (state) => [state.dataset, state.collection],
 *   ([dataset, collection]): void => {
 *    console.log("Dataset or collection changed:", dataset, collection);
 *   }
 * );
 * ```
 */
export const useViewerStateStore = create<ViewerState>()(subscribeWithSelector(viewerStateStoreCreator));

addColorRampDerivedStateSubscribers(useViewerStateStore);

// Adds compatibility with hot module reloading.
// Adapted from https://github.com/pmndrs/zustand/discussions/827#discussioncomment-9843290
declare global {
  interface Window {
    _store: ViewerState;
  }
}

if (import.meta.hot) {
  useViewerStateStore.subscribe((state) => {
    if (typeof window !== "undefined") {
      window._store = state;
    }
  });
  import.meta.hot!.accept((newModule) => {
    if (!newModule) return;
    const newStore = newModule.useViewerStateStore;
    if (!newStore) return;
    if (window._store) {
      newStore.setState(window._store, true);
    }
  });
}
