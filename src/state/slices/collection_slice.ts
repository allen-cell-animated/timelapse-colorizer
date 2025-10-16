import { type StateCreator } from "zustand";

import type Collection from "src/colorizer/Collection";
import { UrlParam } from "src/colorizer/utils/url_utils";
import { type SerializedStoreData } from "src/state/types";

export type CollectionSliceState = {
  collection: Collection | null;
  /**
   * The name of the zip file that the current collection/dataset was loaded from.
   */
  sourceZipName: string | null;
};

export type CollectionSliceSerializableState = Pick<CollectionSliceState, "collection" | "sourceZipName">;

export type CollectionSliceActions = {
  setCollection: (collection: Collection) => void;
  setSourceZipName: (zipName: string) => void;
  clearSourceZipName: () => void;
};

export type CollectionSlice = CollectionSliceState & CollectionSliceActions;

export const createCollectionSlice: StateCreator<CollectionSlice, [], [], CollectionSlice> = (set, _get) => ({
  collection: null,
  sourceZipName: null,

  setCollection: (collection: Collection) => {
    set({ collection });
  },
  setSourceZipName: (sourceZipName: string) => {
    set({ sourceZipName });
  },
  clearSourceZipName: () => {
    set({ sourceZipName: null });
  },
});

export const serializeCollectionSlice = (slice: Partial<CollectionSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};

  const collection = slice.collection;
  const sourceZipName = slice.sourceZipName;

  if (sourceZipName !== null) {
    // Source file overrides collection parameter.
    ret[UrlParam.SOURCE_ZIP] = sourceZipName;
  } else {
    // Collection URL is null if a single dataset was loaded directly.
    // In this case, the collection doesn't need to be included in the URL.
    if (collection && collection.sourcePath !== null) {
      ret[UrlParam.COLLECTION] = collection.sourcePath;
    }
  }

  return ret;
};

/** Selects state values that serialization depends on. */
export const selectCollectionSliceSerializationDeps = (slice: CollectionSlice): CollectionSliceSerializableState => ({
  collection: slice.collection,
  sourceZipName: slice.sourceZipName,
});
