import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { addStoreStateSubscribers, viewerStateStoreCreator, type ViewerStore } from "./slices";
import type { SubscribableStore } from "./types";

/**
 * Hook for accessing the global viewer state store. If used with selectors,
 * components will only rerender when the selected state changes.
 *
 * NOTE: If you are experiencing a re-render loop while selecting multiple
 * values from the store, make sure to use the `useShallow` hook from
 * `zustand/shallow` to prevent unnecessary re-renders.
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
export const useViewerStateStore: SubscribableStore<ViewerStore> = create<ViewerStore>()(
  subscribeWithSelector(viewerStateStoreCreator)
);

addStoreStateSubscribers(useViewerStateStore);

// Adds compatibility with hot module reloading.
// Adapted from https://github.com/pmndrs/zustand/discussions/827#discussioncomment-9843290
declare global {
  interface Window {
    _store: ViewerStore;
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
