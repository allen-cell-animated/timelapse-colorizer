import { Color } from "three";
import { StateCreator } from "zustand";

import { SerializedStoreData, SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

export type ChannelSettings = {
  visible: boolean;
  color: Color;
  min: number;
  max: number;
  dataMin: number;
  dataMax: number;
};

export type ChannelSliceState = {
  channelSettings: ChannelSettings[];
};

export type ChannelSliceSerializableState = Pick<ChannelSliceState, "channelSettings">;

export type ChannelSliceActions = {
  updateChannelSettings: (index: number, settings: Partial<ChannelSettings>) => void;
};

export type ChannelSlice = ChannelSliceState & ChannelSliceActions;

export const createChannelSlice: StateCreator<ChannelSlice, [], [], ChannelSlice> = (set, get) => ({
  channelSettings: [],
  updateChannelSettings: (index, settings) => {
    set((state) => {
      const newSettings = [...state.channelSettings];
      if (newSettings[index]) {
        newSettings[index] = { ...newSettings[index], ...settings };
      }
      return { channelSettings: newSettings };
    });
  },
});

export const addChannelDerivedStateSubscribers = (store: SubscribableStore<ChannelSlice & DatasetSlice>): void => {
  // Listen for changes in dataset, reset non-matching channels
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset }),
    ({ dataset }) => {
      if (dataset && dataset.frames3d && dataset.frames3d.backdrops) {
        const newChannelSettings = dataset.frames3d.backdrops.map((backdrop) => ({
          visible: true,
          color: new Color(1, 0, 0),
          min: backdrop.min ?? 0,
          max: backdrop.max ?? 255,
          dataMin: backdrop.min ?? 0,
          dataMax: backdrop.max ?? 255,
        }));
        return { channelSettings: newChannelSettings };
      }
      return {};
    }
  );
};

// TODO: Implement serialization
export const serializeChannelSlice = (slice: Partial<ChannelSliceSerializableState>): SerializedStoreData => ({});

export const selectChannelSliceSerializationDeps = (slice: ChannelSlice): ChannelSliceSerializableState => ({
  channelSettings: slice.channelSettings,
});

export const loadChannelSliceFromParams = (slice: ChannelSlice, params: URLSearchParams): void => {};
