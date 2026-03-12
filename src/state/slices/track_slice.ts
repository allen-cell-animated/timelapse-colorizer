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
  /**
   * Adds one or more tracks to the current track selection.
   * @param tracks The track or array of tracks to add.
   */
  addTracks: (tracks: Track | Track[]) => void;
  /** Removes one or more tracks from the current track selection. */
  removeTracks: (trackIds: number | number[]) => void;
  /** Toggles the selection state of a track. */
  toggleTrack: (track: Track) => void;
  /**
   * Sets the current track selection to the specified tracks.
   * Use in place of `clearTracks() => addTracks(tracks)` to avoid
   * unnecessary state updates.
   */
  setTracks: (tracks: Track | Track[]) => void;
  /**
   * Removes all tracks from the current selection.
   * @param newLut For internal use when the dataset changes. Optional new
   * selection LUT to use; if not provided, uses a zero-filled LUT of the same
   * size as the current one to reset it.
   */
  clearTracks: (newLut?: Uint8Array) => void;
};

export type TrackSlice = TrackSliceState & TrackSliceActions;

function getDefaultTrack(tracks: Map<number, Track>): Track | null {
  const trackValues = Array.from(tracks.values());
  return trackValues[trackValues.length - 1] ?? null;
}

/** Marks a track as selected/deselected in the provided LUT. */
function applyTrackToSelectionLut(lut: Uint8Array, track: Track, selected: boolean): void {
  for (const id of track.ids) {
    lut[id] = selected ? 1 : 0;
  }
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set, get) => ({
  tracks: new Map<number, Track>(),
  track: null,
  isSelectedLut: new Uint8Array(0),

  addTracks: (tracks: Track | Track[]) => {
    set((state) => {
      // Note: Object references must be changed here to trigger state updates,
      // so the Map and LUT are copied.
      tracks = Array.isArray(tracks) ? tracks : [tracks];
      const willTracksBeAdded = tracks.some((track) => !state.tracks.has(track.trackId));
      if (!willTracksBeAdded) {
        return {};
      }
      const newTracks = new Map(state.tracks);
      const newSelectedLut = state.isSelectedLut.slice();
      for (const track of tracks) {
        if (newTracks.has(track.trackId)) {
          continue;
        }
        newTracks.set(track.trackId, track);
        applyTrackToSelectionLut(newSelectedLut, track, true);
      }
      return { tracks: newTracks, track: getDefaultTrack(newTracks), isSelectedLut: newSelectedLut };
    });
  },
  removeTracks: (trackIds: number | number[]) => {
    set((state) => {
      trackIds = Array.isArray(trackIds) ? trackIds : [trackIds];
      const willTracksBeRemoved = trackIds.some((trackId) => state.tracks.has(trackId));
      if (!willTracksBeRemoved) {
        return {};
      }
      const newTracks = new Map(state.tracks);
      const newSelectedLut = state.isSelectedLut.slice();
      for (const trackId of trackIds) {
        const track = newTracks.get(trackId);
        if (!track) {
          continue;
        }
        newTracks.delete(trackId);
        applyTrackToSelectionLut(newSelectedLut, track, false);
      }
      return { tracks: newTracks, track: getDefaultTrack(newTracks), isSelectedLut: newSelectedLut };
    });
  },
  toggleTrack: (track: Track) => {
    set((state) => {
      const hasTrack = state.tracks.has(track.trackId);
      hasTrack ? state.removeTracks(track.trackId) : state.addTracks(track);
      return {};
    });
  },
  clearTracks: (newLut?: Uint8Array) => {
    // Fill the selection LUT with zeros; because we also need to make a copy
    // of it to trigger relevant state updates, create a new Uint8Array to replace it.
    const newSelectedLut = newLut ?? new Uint8Array(get().isSelectedLut.length);
    set({ tracks: new Map<number, Track>(), track: null, isSelectedLut: newSelectedLut });
  },
  setTracks: (tracks: Track | Track[]) => {
    tracks = Array.isArray(tracks) ? tracks : [tracks];
    // Combines steps for `clearTracks` and `addTracks` into one state update
    // to prevent unnecessary re-rendering.
    const newTracks = new Map<number, Track>();
    const newSelectedLut = new Uint8Array(get().isSelectedLut.length);
    for (const track of tracks) {
      newTracks.set(track.trackId, track);
      applyTrackToSelectionLut(newSelectedLut, track, true);
    }
    set({ tracks: newTracks, track: getDefaultTrack(newTracks), isSelectedLut: newSelectedLut });
  },
});

export const addTrackDerivedStateSubscribers = (store: SubscribableStore<TrackSlice & DatasetSlice>): void => {
  // When the dataset changes, clear tracks if the dataset has a different
  // number of objects or if the selected tracks are not present in the new
  // dataset.
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
          if (!arrayElementsAreEqual(track.ids, newTrack.ids) || !arrayElementsAreEqual(track.times, newTrack.times)) {
            tracksNeedReset = true;
            break;
          }
        }
      }
      if (tracksNeedReset) {
        const newLut = new Uint8Array(dataset?.numObjects ?? 0);
        store.getState().clearTracks(newLut);
      }
      return {};
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
    const validatedTracks: Track[] = [];
    for (const trackId of trackIdsParam) {
      const track = dataset.getTrack(trackId);
      if (track) {
        validatedTracks.push(track);
      }
    }
    slice.addTracks(validatedTracks);
  }
};
