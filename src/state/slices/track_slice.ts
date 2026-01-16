import type { StateCreator } from "zustand";

import type { Track } from "src/colorizer";
import { arrayElementsAreEqual } from "src/colorizer/utils/data_utils";
import { decodeTracks, UrlParam } from "src/colorizer/utils/url_utils";
import type { DatasetSlice } from "src/state/slices/dataset_slice";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

export type TrackSliceState = {
  tracks: Map<number, Track>;

  /** Derived values */
  /** @deprecated */
  track: Track | null;
  isSelectedLut: Uint8Array;
};

export type TrackSliceSerializableState = Pick<TrackSliceState, "tracks">;

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

function getDefaultTrack(tracks: Map<number, Track>): Track | null {
  const trackValues = Array.from(tracks.values());
  return trackValues[trackValues.length - 1] ?? null;
}

/** Returns a new copy of the selection LUT with the given track applied or removed. */
function applyTrackToSelectionLut(lut: Uint8Array, track: Track, selected: boolean): Uint8Array {
  const newLut = lut.slice();
  for (const id of track.ids) {
    newLut[id] = selected ? 1 : 0;
  }
  return newLut;
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set, get) => ({
  tracks: new Map<number, Track>(),
  track: null,
  isSelectedLut: new Uint8Array(0),

  addTrack: (track: Track) => {
    set((state) => {
      // Note: Object references must be changed here to trigger state updates, so the
      // Map and LUT are copied.
      const newTracks = new Map(state.tracks);
      newTracks.set(track.trackId, track);
      const newSelectedLut = applyTrackToSelectionLut(state.isSelectedLut, track, true);
      return { tracks: newTracks, track: getDefaultTrack(newTracks), isSelectedLut: newSelectedLut };
    });
  },
  removeTrack: (trackId: number) => {
    set((state) => {
      const newTracks = new Map(state.tracks);
      const track = newTracks.get(trackId);
      if (!track) {
        return {};
      }
      newTracks.delete(trackId);
      const newSelectedLut = applyTrackToSelectionLut(state.isSelectedLut, track, false);
      return { tracks: newTracks, track: getDefaultTrack(newTracks), isSelectedLut: newSelectedLut };
    });
  },
  clearTracks: () => {
    const newSelectedLut = new Uint8Array(get().isSelectedLut.length);
    set({ tracks: new Map<number, Track>(), track: null, isSelectedLut: newSelectedLut });
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
  // When the dataset changes, clear tracks if they are no longer valid.
  addDerivedStateSubscriber(
    store,
    (state) => ({
      dataset: state.dataset,
    }),
    ({ dataset }) => {
      let tracksNeedReset = true;
      if (dataset) {
        tracksNeedReset = false;
        // Check if the number of objects has changed.
        if (store.getState().isSelectedLut.length !== dataset.numObjects) {
          tracksNeedReset = true;
        }
        // Check if tracks are different in the dataset.
        for (const [trackId, track] of store.getState().tracks.entries()) {
          const newTrack = dataset.getTrack(trackId);
          if (!newTrack) {
            tracksNeedReset = true;
            break;
          }
          if (!arrayElementsAreEqual(track.ids, newTrack.ids)) {
            tracksNeedReset = true;
            break;
          }
        }
      }
      if (tracksNeedReset) {
        store.getState().clearTracks();
        return {
          isSelectedLut: new Uint8Array(dataset?.numObjects ?? 0),
        };
      } else {
        // Keep existing tracks.
        return {};
      }
    }
  );
};

export const serializeTrackSlice = (slice: Partial<TrackSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};

  if (slice.tracks && slice.tracks.size > 0) {
    ret[UrlParam.TRACK] = Array.from(slice.tracks.keys()).join(",");
  }
  return ret;
};

export const selectTrackSliceSerializationDeps = (slice: TrackSlice): TrackSliceSerializableState => ({
  tracks: slice.tracks,
});

export const loadTrackSliceFromParams = (slice: TrackSlice & DatasetSlice, params: URLSearchParams): void => {
  const dataset = slice.dataset;
  if (!dataset) {
    return;
  }
  const trackIdsParam = decodeTracks(params.get(UrlParam.TRACK));
  if (trackIdsParam !== undefined) {
    for (const trackId of trackIdsParam) {
      const track = dataset.getTrack(trackId);
      if (track) {
        // TODO: If there are many tracks, this may incur a large number of state updates.
        slice.addTrack(track);
      }
    }
  }
};
