import type { Color } from "three";
import type { StateCreator } from "zustand";

import { ColorRamp, ColorRampType, KNOWN_CATEGORICAL_PALETTES, type Track } from "src/colorizer";
import { arrayElementsAreEqual } from "src/colorizer/utils/data_utils";
import { decodeTracks, encodeTracks, UrlParam } from "src/colorizer/utils/url_utils";
import type { DatasetSlice } from "src/state/slices/dataset_slice";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

const DEFAULT_TRACK_PALETTE_KEY = "adobe";
const DEFAULT_TRACK_PALETTE = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_TRACK_PALETTE_KEY)!;

const LUT_UNSELECTED = 0;
const LUT_OFFSET = 1;

export type TrackSliceState = {
  tracks: Map<number, Track>;
  trackToColorId: Map<number, number>;
  tracksPaletteKey: string;

  /** Derived values */
  /** @deprecated */
  track: Track | null;
  trackColors: Map<number, Color>;
  /**
   * Current color palette for the track path. Currently static; can be made
   * serializable + editable in the future.
   */
  tracksPaletteRamp: ColorRamp;
  /**
   * LUT that maps from an object ID to whether it is selected (>=1) or not (0).
   * Non-zero values represent the index of the track's color in the track path
   * palette ramp + 1 because zero is reserved to represent unselected objects.
   * Updated when tracks are added/removed from the selection.
   */
  isSelectedLut: Uint8Array;
};

export type TrackSliceSerializableState = Pick<TrackSliceState, "tracks" | "trackToColorId" | "tracksPaletteKey">;

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
  setTracks: (tracks: Track | Track[], colorIdx?: number[]) => void;
  /**
   * Removes all tracks from the current selection.
   * @param newLut For internal use when the dataset changes. Optional new
   * selection LUT to use; if not provided, uses a zero-filled LUT of the same
   * size as the current one to reset it.
   */
  clearTracks: (newLut?: Uint8Array) => void;
  setTrackPaletteKey: (key: string) => void;
};

export type TrackSlice = TrackSliceState & TrackSliceActions;

function getDefaultTrack(tracks: Map<number, Track>): Track | null {
  const trackValues = Array.from(tracks.values());
  return trackValues[trackValues.length - 1] ?? null;
}

/**
 * Gets the next color ID to assign. Chooses the next color after the color of
 * the track that was last selected (e.g. the last track added to the Map).
 *
 * This behavior is deterministic based on the current state of track selection.
 * This is so, if a user who opens a shared URL with tracks already selected
 * makes a new selection, they will get the same color sequence as the user who
 * created the URL.
 */
function getNextColorId(tracks: Map<number, Track>, trackToColorId: Map<number, number>): number {
  const trackValues = Array.from(tracks.values());
  const lastTrack = trackValues[trackValues.length - 1];
  const lastColorId = lastTrack ? trackToColorId.get(lastTrack.trackId) ?? -1 : -1;
  return (lastColorId + 1) % DEFAULT_TRACK_PALETTE.colorStops.length;
}

/** Marks a track as selected/deselected in the provided LUT. */
function applyTrackToSelectionLut(lut: Uint8Array, track: Track, colorIdx: number): void {
  for (const id of track.ids) {
    lut[id] = colorIdx;
  }
}

function getTrackColors(trackToColorId: Map<number, number>, palette: ColorRamp): Map<number, Color> {
  return new Map(Array.from(trackToColorId.entries()).map(([key, value]) => [key, palette.colorStops[value]]));
}

export const createTrackSlice: StateCreator<TrackSlice, [], [], TrackSlice> = (set, get) => ({
  tracks: new Map<number, Track>(),
  trackToColorId: new Map<number, number>(),
  trackColors: new Map<number, Color>(),
  tracksPaletteRamp: new ColorRamp(DEFAULT_TRACK_PALETTE.colorStops, ColorRampType.CATEGORICAL),
  track: null,
  tracksPaletteKey: DEFAULT_TRACK_PALETTE_KEY,
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
      const newTrackToColorId = new Map(state.trackToColorId);
      let nextColorId = getNextColorId(state.tracks, state.trackToColorId);
      for (const track of tracks) {
        if (newTracks.has(track.trackId)) {
          continue;
        }
        newTracks.set(track.trackId, track);
        applyTrackToSelectionLut(newSelectedLut, track, nextColorId + LUT_OFFSET);
        newTrackToColorId.set(track.trackId, nextColorId);
        nextColorId = (nextColorId + 1) % state.tracksPaletteRamp.colorStops.length;
      }
      return {
        tracks: newTracks,
        track: getDefaultTrack(newTracks),
        isSelectedLut: newSelectedLut,
        trackToColorId: newTrackToColorId,
        trackColors: getTrackColors(newTrackToColorId, state.tracksPaletteRamp),
      };
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
      const newTrackToColorId = new Map(state.trackToColorId);
      for (const trackId of trackIds) {
        const track = newTracks.get(trackId);
        if (!track) {
          continue;
        }
        newTracks.delete(trackId);
        newTrackToColorId.delete(trackId);
        applyTrackToSelectionLut(newSelectedLut, track, LUT_UNSELECTED);
      }
      return {
        tracks: newTracks,
        track: getDefaultTrack(newTracks),
        isSelectedLut: newSelectedLut,
        trackToColorId: newTrackToColorId,
        trackColors: getTrackColors(newTrackToColorId, state.tracksPaletteRamp),
      };
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
    set({
      tracks: new Map<number, Track>(),
      track: null,
      isSelectedLut: newSelectedLut,
      trackToColorId: new Map<number, number>(),
      trackColors: new Map<number, Color>(),
    });
  },
  setTracks: (tracks: Track | Track[], colors?: number[]) => {
    tracks = Array.isArray(tracks) ? tracks : [tracks];

    // Ensure colors array matches length of tracks
    colors = colors ?? [];
    while (colors.length < tracks.length) {
      colors.push(colors.length);
    }

    // Combines steps for `clearTracks` and `addTracks` into one state update
    // to prevent unnecessary re-rendering.
    const newTracks = new Map<number, Track>();
    const newSelectedLut = new Uint8Array(get().isSelectedLut.length);
    const newTrackToColorId = new Map<number, number>();
    const numStops = get().tracksPaletteRamp.colorStops.length;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      newTracks.set(track.trackId, track);

      // Resolve color index value-- handle edge case of very large negative
      // input numbers by adding multiples of numStops to make it positive
      // before modulo operation.
      let colorIdx = (Math.floor(colors[i]) + Math.ceil(Math.abs(colors[i] / numStops)) * numStops) % numStops;
      colorIdx = Number.isInteger(colorIdx) ? colorIdx : i % numStops;
      applyTrackToSelectionLut(newSelectedLut, track, colorIdx + LUT_OFFSET);
      newTrackToColorId.set(track.trackId, colorIdx);
    }
    set((state) => ({
      tracks: newTracks,
      track: getDefaultTrack(newTracks),
      isSelectedLut: newSelectedLut,
      trackToColorId: newTrackToColorId,
      trackColors: getTrackColors(newTrackToColorId, state.tracksPaletteRamp),
    }));
  },
  setTrackPaletteKey: (key: string) => {
    set((state) => {
      if (state.tracksPaletteKey === key) {
        return {};
      }
      const palette = KNOWN_CATEGORICAL_PALETTES.get(key);
      if (!palette) {
        return {};
      }
      // Clear original color ramp
      state.tracksPaletteRamp.dispose();
      const newTracksPaletteRamp = new ColorRamp(palette.colorStops, ColorRampType.CATEGORICAL);
      return {
        tracksPaletteRamp: newTracksPaletteRamp,
        tracksPaletteKey: key,
        trackColors: getTrackColors(state.trackToColorId, newTracksPaletteRamp),
      };
    });
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
    const trackIds = Array.from(slice.tracks.keys());
    ret[UrlParam.TRACK] = encodeTracks(trackIds, slice.trackToColorId);
  }
  if (slice.tracksPaletteKey) {
    ret[UrlParam.TRACK_PALETTE] = slice.tracksPaletteKey;
  }
  return ret;
};

export const selectTrackSliceSerializationDeps = (slice: TrackSlice): TrackSliceSerializableState => ({
  tracks: slice.tracks,
  trackToColorId: slice.trackToColorId,
  tracksPaletteKey: slice.tracksPaletteKey,
});

export const loadTrackSliceFromParams = (slice: TrackSlice & DatasetSlice, params: URLSearchParams): void => {
  const dataset = slice.dataset;
  if (!dataset) {
    return;
  }
  const trackInfo = decodeTracks(params.get(UrlParam.TRACK));
  if (trackInfo !== undefined) {
    const tracks: Track[] = [];
    const colors: number[] = [];

    const { trackIds, colorIdx: colorIdxFromParams } = trackInfo;
    for (let i = 0; i < trackIds.length; i++) {
      const trackId = trackIds[i];
      const track = dataset.getTrack(trackId);
      if (track) {
        tracks.push(track);
        colors.push(colorIdxFromParams?.[i] ?? i);
      }
    }
    slice.setTracks(tracks, colors);
  }
  const trackPaletteKey = params.get(UrlParam.TRACK_PALETTE);
  if (trackPaletteKey) {
    slice.setTrackPaletteKey(trackPaletteKey);
  }
};
