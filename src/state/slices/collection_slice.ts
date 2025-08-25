import { StateCreator } from "zustand";

import { UrlParam } from "../../colorizer/utils/url_utils";
import { SerializedStoreData } from "../types";

import Collection from "../../colorizer/Collection";

export type CollectionSliceState = {
  collection: Collection | null;
  /**
   * The name of the file that the current collection/dataset was loaded from.
   */
  sourceFilename: string | null;
};

export type CollectionSliceSerializableState = Pick<CollectionSliceState, "collection" | "sourceFilename">;

export type CollectionSliceActions = {
  setCollection: (collection: Collection) => void;
  setSourceFilename: (srcFilename: string) => void;
  clearSourceFilename: () => void;
};

export type CollectionSlice = CollectionSliceState & CollectionSliceActions;

export const createCollectionSlice: StateCreator<CollectionSlice, [], [], CollectionSlice> = (set, _get) => ({
  collection: null,
  sourceFilename: null,

  setCollection: (collection: Collection) => {
    set({ collection });
  },
  setSourceFilename: (sourceFilename: string) => {
    set({ sourceFilename });
  },
  clearSourceFilename: () => {
    set({ sourceFilename: null });
  },
});

export const serializeCollectionSlice = (slice: Partial<CollectionSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};

  const collection = slice.collection;
  const sourceFilename = slice.sourceFilename;

  if (sourceFilename !== null) {
    // Source file overrides collection parameter.
    ret[UrlParam.SOURCE_FILENAME] = sourceFilename;
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
  sourceFilename: slice.sourceFilename,
});
