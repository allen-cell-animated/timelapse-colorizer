import { Color } from "three";
import { type StateCreator } from "zustand";

import { type ChannelRangePreset, type ChannelSetting } from "src/colorizer/types";
import { type SerializedStoreData, type SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

import { type DatasetSlice } from "./dataset_slice";

export type ChannelSliceState = {
  channelSettings: ChannelSetting[];

  // Stored callbacks:
  getChannelDataRange: (channelIndex: number) => null | [number, number];
  applyChannelRangePreset: (channelIndex: number, preset: ChannelRangePreset) => void;
};

export type ChannelSliceSerializableState = Pick<ChannelSliceState, "channelSettings">;

export type ChannelSliceActions = {
  updateChannelSettings: (index: number, settings: Partial<ChannelSetting>) => void;
  setGetChannelDataRangeCallback: (callback: (channelIndex: number) => null | [number, number]) => void;
  setApplyChannelRangePresetCallback: (callback: (channelIndex: number, preset: ChannelRangePreset) => void) => void;
};

export type ChannelSlice = ChannelSliceState & ChannelSliceActions;

export const createChannelSlice: StateCreator<ChannelSlice, [], [], ChannelSlice> = (set, _get) => ({
  channelSettings: [],
  getChannelDataRange: () => {
    return null;
  },
  applyChannelRangePreset: () => {},

  // Actions
  updateChannelSettings: (index, settings) => {
    set((state) => {
      const newSettings = [...state.channelSettings];
      if (newSettings[index]) {
        newSettings[index] = { ...newSettings[index], ...settings };
      }
      return { channelSettings: newSettings };
    });
  },
  // Callback setters
  setGetChannelDataRangeCallback: (callback) => set({ getChannelDataRange: callback }),
  setApplyChannelRangePresetCallback: (callback) => set({ applyChannelRangePreset: callback }),
});

export const addChannelDerivedStateSubscribers = (store: SubscribableStore<ChannelSlice & DatasetSlice>): void => {
  // When the dataset updates, create a number of default channel settings equal
  // to the number of backdrop channels in the dataset.
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset }),
    ({ dataset }) => {
      if (dataset && dataset.frames3d && dataset.frames3d.backdrops) {
        // TODO: Add a color palette for channels. Ask scientists about
        // suggested default behavior.
        // TODO: Preserve colors when switching between datasets.
        const newChannelSettings = dataset.frames3d.backdrops.map((backdrop) => ({
          // TODO: Once controls are added for channel settings, update initial
          // visibility settings. Consider only showing the first 3 channels by
          // default.
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
