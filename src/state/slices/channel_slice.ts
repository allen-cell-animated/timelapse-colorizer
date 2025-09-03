import { Color } from "three";
import { StateCreator } from "zustand";

import { ChannelRangePreset } from "../../colorizer/types";
import { SerializedStoreData, SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

export type ChannelSettings = {
  visible: boolean;
  color: Color;
  opacity: number;
  min: number;
  max: number;
  // TODO: Move these outside, since they don't affect rendering?
  dataMin: number;
  dataMax: number;
};

export type ChannelSliceState = {
  channelSettings: ChannelSettings[];
  syncChannelDataRange: (channelIndex: number) => void;
  applyChannelRangePreset: (channelIndex: number, preset: ChannelRangePreset) => void;
};

export type ChannelSliceSerializableState = Pick<ChannelSliceState, "channelSettings">;

export type ChannelSliceActions = {
  updateChannelSettings: (index: number, settings: Partial<ChannelSettings>) => void;
  setSyncChannelDataRangeCallback: (callback: (channelIndex: number) => void) => void;
  setApplyChannelRangePresetCallback: (callback: (channelIndex: number, preset: ChannelRangePreset) => void) => void;
};

export type ChannelSlice = ChannelSliceState & ChannelSliceActions;

export const createChannelSlice: StateCreator<ChannelSlice, [], [], ChannelSlice> = (set, _get) => ({
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

  // Callbacks
  syncChannelDataRange: () => {},
  setSyncChannelDataRangeCallback: (callback) => set({ syncChannelDataRange: callback }),
  applyChannelRangePreset: () => {},
  setApplyChannelRangePresetCallback: (callback) => set({ applyChannelRangePreset: callback }),
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
          color: new Color(0.5, 0.5, 0.5),
          opacity: 1,
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
export const serializeChannelSlice = (_slice: Partial<ChannelSliceSerializableState>): SerializedStoreData => ({});

export const selectChannelSliceSerializationDeps = (slice: ChannelSlice): ChannelSliceSerializableState => ({
  channelSettings: slice.channelSettings,
});

export const loadChannelSliceFromParams = (_slice: ChannelSlice, _params: URLSearchParams): void => {};
