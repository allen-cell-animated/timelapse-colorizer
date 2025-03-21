import { StateCreator } from "zustand";

import { UrlParam } from "../../colorizer/utils/url_utils";
import { SerializedStoreData } from "../types";

import Collection from "../../colorizer/Collection";

type CollectionSliceState = {
  collection: Collection | null;
};

type CollectionSliceActions = {
  setCollection: (collection: Collection) => void;
};

export type CollectionSlice = CollectionSliceState & CollectionSliceActions;

export const createCollectionSlice: StateCreator<CollectionSlice, [], [], CollectionSlice> = (set, _get) => ({
  collection: null,

  setCollection: (collection: Collection) => {
    set({ collection });
  },
});

export const serializeCollectionSlice = (slice: CollectionSlice): SerializedStoreData => {
  const collection = slice.collection;
  // Collection URL is null if a single dataset was loaded directly.
  // In this case, the collection doesn't need to be included in the URL.
  if (collection === null || collection.url === null) {
    return {};
  }
  return {
    [UrlParam.COLLECTION]: collection.url,
  };
};
