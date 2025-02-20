import { StateCreator } from "zustand";

import { DatasetSlice } from "./dataset_slice";

import Collection from "../../Collection";

type CollectionSliceState = {
  collection: Collection | null;
};

type CollectionSliceActions = {
  setCollection: (collection: Collection) => void;
  // TODO: Add action for loading and setting a dataset here
};

export type CollectionSlice = CollectionSliceState & CollectionSliceActions;

export const createCollectionSlice: StateCreator<CollectionSlice & DatasetSlice, [], [], CollectionSlice> = (
  set,
  _get
) => ({
  collection: null,

  setCollection: (collection: Collection) => {
    set({ collection });
  },
});
