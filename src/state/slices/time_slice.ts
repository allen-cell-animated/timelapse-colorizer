import { StateCreator } from "zustand";

import { FrameLoadResult } from "../../colorizer";
import { decodeInt, UrlParam } from "../../colorizer/utils/url_utils";
import { DEFAULT_PLAYBACK_FPS } from "../../constants";
import { SerializedStoreData, SubscribableStore } from "../types";
import { clampWithNanCheck } from "../utils/data_validation";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";

import { IRenderCanvas } from "../../colorizer/IRenderCanvas";
import TimeControls from "../../colorizer/TimeControls";

export type TimeSliceState = {
  /**
   * The frame that is currently being loaded. If no load is happening,
   * `pendingFrame === currentFrame`.
   */
  pendingFrame: number;
  /** The currently loaded and displayed frame. */
  currentFrame: number;
  playbackFps: number;
  timeControls: TimeControls;
  frameLoadCallback: IRenderCanvas["setFrame"];
  /**
   * The `FrameLoadResult` from the last loaded frame. `null` at
   * initialization.
   */
  frameLoadResult: FrameLoadResult | null;
};

export type TimeSliceSerializableState = Pick<TimeSliceState, "currentFrame">;

export type TimeSliceActions = {
  /**
   * Attempts to set and load the given frame number, using the callback
   * provided by `setLoadCallback`. The frame number will be clamped between 0
   * and the number of frames in the dataset, if one is loaded.
   *
   * Note that `pendingFrame` will be set to the frame that is being loaded,
   * while `currentFrame` will not update until the promise returned by the
   * callback resolves.
   */
  setFrame: (frame: number) => Promise<void>;
  setPlaybackFps: (fps: number) => void;
  setFrameLoadCallback: (callback: IRenderCanvas["setFrame"]) => void;
  setFrameLoadResult: (result: FrameLoadResult) => void;
};

export type TimeSlice = TimeSliceState & TimeSliceActions;

export const createTimeSlice: StateCreator<TimeSlice & DatasetSlice, [], [], TimeSlice> = (set, get) => ({
  pendingFrame: 0,
  currentFrame: 0,
  playbackFps: DEFAULT_PLAYBACK_FPS,
  timeControls: new TimeControls(
    () => get().currentFrame,
    async (frame) => {
      set({ pendingFrame: frame });
      const result = await get().frameLoadCallback(frame);
      if (result !== null) {
        set({ currentFrame: frame });
      } else if (get().pendingFrame === frame) {
        // Reset pendingFrame if it hasn't changed. (e.g. no other calls to
        // setFrame were made while this one was loading)
        // TODO: More robust handling for requests? Request IDs?
        set({ pendingFrame: get().currentFrame });
      }
    }
  ),
  frameLoadCallback: (frame: number): Promise<FrameLoadResult> => {
    return Promise.resolve({ frame, isFrameLoaded: false, isBackdropLoaded: false, backdropKey: null });
  },
  frameLoadResult: null,

  setFrameLoadCallback: (callback) => set({ frameLoadCallback: callback }),
  setFrameLoadResult: (result) => set({ frameLoadResult: result }),
  setFrame: async (frame: number) => {
    if (!Number.isFinite(frame)) {
      throw new Error(`TimeSlice.setFrame: Invalid frame number: ${frame}`);
    }
    const dataset = get().dataset;
    if (dataset !== null) {
      frame = clampWithNanCheck(frame, 0, dataset.numberOfFrames - 1);
    } else {
      frame = Math.max(frame, 0);
    }

    const isPlaying = get().timeControls.isPlaying();
    if (isPlaying) {
      get().timeControls.pause();
    }
    set({ pendingFrame: frame });
    await get()
      .frameLoadCallback(frame)
      .then((result) => {
        if (result !== null) {
          set({ currentFrame: result.frame });
        } else if (get().pendingFrame === frame) {
          // Reset pendingFrame if it hasn't changed. (e.g. no other calls to
          // setFrame were made while this one was loading)
          set({ pendingFrame: get().currentFrame });
        }
      })
      .catch((error) => {
        console.error(`TimeSlice.setFrame: Failed to load frame ${frame}:`, error);
        set({ pendingFrame: get().currentFrame });
      })
      .finally(() => {
        if (isPlaying) {
          get().timeControls.play();
        }
      });
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

      // Reset last frame load result
      store.setState({ frameLoadResult: null });

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

export const serializeTimeSlice = (state: Partial<TimeSliceSerializableState>): SerializedStoreData => {
  return {
    [UrlParam.TIME]: state.currentFrame?.toString(),
  };
};

/** Selects state values that serialization depends on. */
export const selectTimeSliceSerializationDeps = (slice: TimeSlice): TimeSliceSerializableState => ({
  currentFrame: slice.currentFrame,
});

export const loadTimeSliceFromParams = (state: TimeSlice & DatasetSlice, params: URLSearchParams): void => {
  // Load time from URL. If no time is set but a track is, set the time to the
  // start of the track.
  const time = decodeInt(params.get(UrlParam.TIME));
  if (time !== undefined && Number.isFinite(time)) {
    state.setFrame(time);
  } else if (state.track !== null) {
    state.setFrame(state.track.startTime());
  }
};
