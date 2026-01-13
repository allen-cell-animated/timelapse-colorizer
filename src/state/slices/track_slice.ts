import { StateCreator } from "zustand";

import { Track } from "src/colorizer";
import { decodeInt, UrlParam } from "src/colorizer/utils/url_utils";
import { DatasetSlice } from "src/state/slices/dataset_slice";

import { SerializedStoreData, SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";

export type TrackSliceState = {
  tracks: Map<number, Track>;
  /** @deprecated */
  track: Track | null;

  /** Derived values */
  isSelectedLut: Uint8Array;
};

export type TrackSliceSerializableState = Pick<TrackSliceState, "track" | "tracks">;

export type TrackSliceActions = {
  addTrack: (track: Track) => void;
  removeTrack: (trackId: number) => void;
  clearTracks: () => void;

  /** @deprecated */
  setTrack: (track: Track) => void;
  /** @deprecated */
  clearTrack: () => void;
};

export type TrackSlice = TrackSliceState & TrackSliceActions;

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set, get) => ({
  tracks: new Map<number, Track>(),
  track: null,
  isSelectedLut: new Uint8Array(0),

  addTrack: (track: Track) => {
    set((state) => {
      const newTracks = new Map(state.tracks);
      newTracks.set(track.trackId, track);
      const trackValues = Array.from(newTracks.values());
      const defaultTrack = trackValues[trackValues.length - 1] ?? null;
      return { tracks: newTracks, track: defaultTrack };
    });
  },
  removeTrack: (trackId: number) => {
    set((state) => {
      const newTracks = new Map(state.tracks);
      newTracks.delete(trackId);
      const trackValues = Array.from(newTracks.values());
      const defaultTrack = trackValues[trackValues.length - 1] ?? null;
      return { tracks: newTracks, track: defaultTrack };
    });
  },
  clearTracks: () => {
    set({ tracks: new Map<number, Track>(), track: null });
  },

  // Deprecated -- to be removed once no code uses single selected track
  setTrack: (track: Track) => {
    get().addTrack(track);
  },
  clearTrack: () => {
    get().clearTracks();
  },
});

export const addTrackDerivedStateSubscribers = (store: SubscribableStore<TrackSlice & DatasetSlice>): void => {
  // TODO: Auto-populate isSelectedLut based on selected track(s)
  // TODO: Clear tracks when dataset changes if tracks are not in the new dataset
  addDerivedStateSubscriber(
    store,
    (state) => ({
      dataset: state.dataset,
    }),
    ({ dataset }) => {
      store.getState().clearTracks();
      // Update selected LUT length
      return {
        isSelectedLut: new Uint8Array(dataset?.numObjects ?? 0),
      };
    }
  );
};

export const serializeTrackSlice = (slice: Partial<TrackSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};

  if (slice.track) {
    ret[UrlParam.TRACK] = slice.track.trackId.toString();
  }
  return ret;
};

export const selectTrackSliceSerializationDeps = (slice: TrackSlice): TrackSliceSerializableState => ({
  track: slice.track,
  tracks: slice.tracks,
});

export const loadTrackSliceFromParams = (slice: TrackSlice & DatasetSlice, params: URLSearchParams): void => {
  const dataset = slice.dataset;
  if (!dataset) {
    return;
  }
  const trackIdParam = decodeInt(params.get(UrlParam.TRACK));
  if (trackIdParam !== undefined) {
    const track = dataset.getTrack(trackIdParam);
    if (track) {
      slice.setTrack(track);
    }
  }
};
