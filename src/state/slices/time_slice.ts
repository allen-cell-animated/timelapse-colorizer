import { StateCreator } from "zustand";

import { DEFAULT_PLAYBACK_FPS } from "../../constants";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

import TimeControls from "../../colorizer/TimeControls";

type TimeSliceState = {
  pendingFrame: number;
  currentFrame: number;
  playbackFps: number;
  timeControls: TimeControls;
  _loadFrameCallback: (frame: number) => Promise<void>;
};

type TimeSliceActions = {
  setFrame: (frame: number) => Promise<void>;
  setPlaybackFps: (fps: number) => void;
  setLoadFrameCallback: (callback: (frame: number) => Promise<void>) => void;
};

export type TimeSlice = TimeSliceState & TimeSliceActions;

export const createTimeSlice: StateCreator<TimeSlice, [], [], TimeSlice> = (set, get) => ({
  pendingFrame: 0,
  currentFrame: 0,
  playbackFps: DEFAULT_PLAYBACK_FPS,
  timeControls: new TimeControls(
    () => get().currentFrame,
    async (frame) => {
      set({ pendingFrame: frame });
      await get()._loadFrameCallback(frame);
      set({ currentFrame: frame });
    }
  ),
  _loadFrameCallback: (_frame: number) => {
    throw new Error("TimeSlice._loadFrameCallback is not set. Did you forget to call setLoadFrameCallback()?");
  },

  setLoadFrameCallback: (callback) => {
    set({ _loadFrameCallback: callback });
  },
  setFrame: async (frame: number) => {
    const isPlaying = get().timeControls.isPlaying();
    if (isPlaying) {
      get().timeControls.pause();
    }
    set({ pendingFrame: frame });
    await get()._loadFrameCallback(frame);
    set({ currentFrame: frame });
    if (isPlaying) {
      get().timeControls.play();
    }
  },
  setPlaybackFps: (fps: number) => {
    set({ playbackFps: fps });
    get().timeControls.setPlaybackFps(fps);
  },
});

export const addTimeDerivedStateSubscribers = (store: SubscribableStore<DatasetSlice & TimeSlice>): void => {
  // Update total frames in timecontrols when dataset changes
  addDerivedStateSubscriber(
    store,
    (state) => [state.dataset],
    () => {
      const dataset = store.getState().dataset;
      if (dataset) {
        store.getState().timeControls.setTotalFrames(dataset.numberOfFrames);
      } else {
        store.getState().timeControls.setTotalFrames(1);
      }
    }
  );
};
