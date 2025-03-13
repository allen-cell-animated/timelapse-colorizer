import { StateCreator } from "zustand";

import { DEFAULT_PLAYBACK_FPS } from "../../constants";
import { SubscribableStore } from "../types";
import { clampWithNanCheck } from "../utils/data_validation";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

import TimeControls from "../../colorizer/TimeControls";

type TimeSliceState = {
  /** The frame that is currently being loaded. If no load is happening,
   * `pendingFrame === currentFrame`.
   */
  pendingFrame: number;
  /** The currently loaded and displayed frame. */
  currentFrame: number;
  playbackFps: number;
  timeControls: TimeControls;
  loadFrameCallback: (frame: number) => Promise<void>;
};

type TimeSliceActions = {
  /**
   * Attempts to set and load the given frame number, using the callback
   * provided by `setLoadCallback`.
   *
   * Note that `pendingFrame` will be set to the frame that is being loaded,
   * while `currentFrame` will not update until the promise returned by the
   * callback resolves.
   */
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
      await get().loadFrameCallback(frame);
      set({ currentFrame: frame });
    }
  ),
  loadFrameCallback: (_frame: number) => {
    return Promise.resolve();
  },

  setLoadFrameCallback: (callback) => {
    set({ loadFrameCallback: callback });
  },
  setFrame: async (frame: number) => {
    const isPlaying = get().timeControls.isPlaying();
    if (isPlaying) {
      get().timeControls.pause();
    }
    set({ pendingFrame: frame });
    await get().loadFrameCallback(frame);
    set({ currentFrame: frame });
    if (isPlaying) {
      get().timeControls.play();
    }
  },
  setPlaybackFps: (fps: number) => {
    set({ playbackFps: clampWithNanCheck(fps, 0, Number.MAX_SAFE_INTEGER) });
    get().timeControls.setPlaybackFps(fps);
  },
});

export const addTimeDerivedStateSubscribers = (store: SubscribableStore<DatasetSlice & TimeSlice>): void => {
  // When dataset changes:
  addDerivedStateSubscriber(
    store,
    (state) => [state.dataset],
    () => {
      const dataset = store.getState().dataset;

      // Pause playback when switching any dataset
      store.getState().timeControls.pause();

      // Update total frames in timeControls
      const totalFrames = dataset?.numberOfFrames ?? 1;
      store.getState().timeControls.setTotalFrames(totalFrames);

      // Clamp and reload the frame
      const newFrame = Math.min(store.getState().currentFrame, totalFrames - 1);
      store.setState({ currentFrame: newFrame, pendingFrame: newFrame });
      if (dataset !== null) {
        // TODO: This may cause a race condition since ColorizeCanvas already
        // loads the frame when the dataset is set.
        store.getState().setFrame(newFrame);
      }
    }
  );
};
