import { Color } from "three";
import type { StateCreator } from "zustand";

import type { Backdrop3dData } from "src/colorizer/Dataset";
import type { ChannelRangePreset, ChannelSetting } from "src/colorizer/types";
import { decodeMaybeChannelSetting, encodeChannelSetting, isChannelKey } from "src/colorizer/utils/url_utils";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

import type { CollectionSlice } from "./collection_slice";
import type { DatasetSlice } from "./dataset_slice";

const WHITE = new Color(1, 1, 1);
const MAGENTA = new Color(1, 0, 1);
const CYAN = new Color(0, 1, 1);
const YELLOW = new Color(1, 1, 0);
const GREEN = new Color(0, 1, 0);

const ONE_CHANNEL_PALETTE = [WHITE];
const TWO_CHANNEL_PALETTE = [MAGENTA, GREEN];
const THREE_CHANNEL_PALETTE = [MAGENTA, CYAN, YELLOW];

function getDefaultColorForChannel(index: number, totalChannels: number): Color {
  if (totalChannels <= 1) {
    return ONE_CHANNEL_PALETTE[0];
  } else if (totalChannels === 2) {
    return TWO_CHANNEL_PALETTE[index] ?? WHITE;
  } else {
    return THREE_CHANNEL_PALETTE[index] ?? WHITE;
  }
}

function getDefaultChannelSetting(index: number, totalChannels: number, backdropData?: Backdrop3dData): ChannelSetting {
  return {
    visible: index < 3,
    color: getDefaultColorForChannel(index, totalChannels),
    opacity: 1,
    min: backdropData?.min ?? 0,
    max: backdropData?.max ?? 255,
    dataMin: backdropData?.min ?? 0,
    dataMax: backdropData?.max ?? 255,
  };
}

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

export const addChannelDerivedStateSubscribers = (
  store: SubscribableStore<ChannelSlice & DatasetSlice & CollectionSlice>
): void => {
  // When the collection changes, reset the channel settings.
  addDerivedStateSubscriber(
    store,
    (state) => state.collection,
    () => {
      const backdropData = store.getState().dataset?.frames3d?.backdrops ?? [];
      const newChannelSettings = backdropData.map((backdrop, index) => {
        return getDefaultChannelSetting(index, backdropData.length, backdrop);
      });
      return {
        channelSettings: newChannelSettings,
      };
    }
  );

  // When the dataset updates, create a number of default channel settings equal
  // to the number of backdrop channels in the dataset. Preserve existing settings
  // for channels that currently exist.
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset }),
    ({ dataset }) => {
      const backdropData = dataset?.frames3d?.backdrops ?? [];
      const newChannelSettings = backdropData.map((backdrop, index) => {
        const defaultSettings = getDefaultChannelSetting(index, backdropData.length, backdrop);
        const currentSettings = store.getState().channelSettings[index] ?? {};
        return { ...defaultSettings, ...currentSettings };
      });

      return { channelSettings: newChannelSettings };
    }
  );
};

export const serializeChannelSlice = (slice: Partial<ChannelSliceSerializableState>): SerializedStoreData => {
  const channelSettings = slice.channelSettings;
  const ret: SerializedStoreData = {};
  channelSettings?.forEach((setting, index) => {
    ret[`c${index}`] = encodeChannelSetting(setting);
  });
  return ret;
};

export const selectChannelSliceSerializationDeps = (slice: ChannelSlice): ChannelSliceSerializableState => ({
  channelSettings: slice.channelSettings,
});

export const loadChannelSliceFromParams = (slice: ChannelSlice, params: URLSearchParams): void => {
  // Find all params matching channel format
  const channelSettings: Partial<ChannelSetting>[] = [];
  for (const [key, value] of params.entries()) {
    if (isChannelKey(key) && value) {
      const channelIndex = parseInt(key.slice(1), 10);
      if (Number.isNaN(channelIndex)) {
        channelSettings.push({});
        continue;
      }
      const decodedChannel = decodeMaybeChannelSetting(value) ?? {};
      slice.updateChannelSettings(channelIndex, decodedChannel);
    }
  }
};
