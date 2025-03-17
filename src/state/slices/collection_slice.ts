import { StateCreator } from "zustand";

import { UrlParam } from "../../colorizer/utils/url_utils";
import { SerializedStoreData } from "../types";

import Collection from "../../colorizer/Collection";

export type CollectionSliceState = {
  collection: Collection | null;
};

export type CollectionSliceSerializableState = Pick<CollectionSliceState, "collection">;

export type CollectionSliceActions = {
  setCollection: (collection: Collection) => void;
};

export type CollectionSlice = CollectionSliceState & CollectionSliceActions;

export const createCollectionSlice: StateCreator<CollectionSlice, [], [], CollectionSlice> = (set, _get) => ({
  collection: null,

  setCollection: (collection: Collection) => {
    set({ collection });
  },
});

export const serializeCollectionSlice = (slice: Partial<CollectionSliceSerializableState>): SerializedStoreData => {
  const collection = slice.collection;
  // Collection URL is null if a single dataset was loaded directly.
  // In this case, the collection doesn't need to be included in the URL.
  if (!collection || collection.url === null) {
    return {};
  }
  return {
    [UrlParam.COLLECTION]: collection.url,
  };
};

/** Selects state values that serialization depends on. */
export const collectionSliceSerializationDependencies = (slice: CollectionSlice): CollectionSliceSerializableState => ({
  collection: slice.collection,
});
