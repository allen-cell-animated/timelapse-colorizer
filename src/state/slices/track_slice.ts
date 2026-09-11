import type { Color } from "three";
import type { StateCreator } from "zustand";

import {
  type ColorRamp,
  type LineageData,
  type LineageDataRelationships,
  MAX_FEATURE_CATEGORIES,
  SelectionOutlineColorMode,
  type Track,
} from "src/colorizer";
import { arrayElementsAreEqual } from "src/colorizer/utils/data_utils";
import { getLineageData, getLineageRelationships, groupSelectedTracks } from "src/colorizer/utils/lineage_utils";
import { decodeBoolean, decodeTracks, encodeBoolean, encodeTracks, UrlParam } from "src/colorizer/utils/url_utils";
import type { ConfigSlice } from "src/state/slices/config_slice";
import type { DatasetSlice } from "src/state/slices/dataset_slice";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

const LUT_UNSELECTED = 0;
const LUT_OFFSET = 1;

const EMPTY_LINEAGE_DATA: LineageData = { trackIdToTrackInfo: new Map(), edges: [] };

export type TrackSliceState = {
  tracks: Map<number, Track>;
  trackToColorId: Map<number, number>;

  /**
   * If true, any groups of selected tracks that are related (parents/children)
   * will have the same color assignment in `trackColors` and `isSelectedLut`.
   */
  colorTracksByGroup: boolean;
  lineageData: LineageData;
  lineageRelationships: LineageDataRelationships;

  // Derived values
  /**
   * Map from track ID to its assigned color. When `colorTracksByGroup` is true
   * and lineage data is available, related tracks will share the same color.
   */
  trackColors: Map<number, Color>;
  /**
   * LUT that maps from an object ID to whether it is selected (>=1) or not (0).
   * Non-zero values represent the index of the track's color in the track path
   * palette ramp + 1 because zero is reserved to represent unselected objects.
   * Updated when tracks are added/removed from the selection.
   *
   * When `colorTracksByGroup` is true, related tracks will share the same color
   * index.
   */
  isSelectedLut: Uint8Array;
};

export type TrackSliceSerializableState = Pick<TrackSliceState, "tracks" | "trackToColorId" | "colorTracksByGroup">;

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
   * Sets the current track selection to the specified tracks. Use in place of
   * `clearTracks() => addTracks(tracks)` to avoid unnecessary state updates.
   * @param tracks The track or array of tracks to set as the current selection.
   * @param colorIdx Optional array of color indices to use for each track.
   * These are indices into the current `selectedTracksPaletteRamp`. If not
   * provided, the tracks will be assigned colors in ascending order starting
   * from index 0.
   */
  setTracks: (tracks: Track | Track[], colorIdx?: number[]) => void;
  /**
   * Removes all tracks from the current selection.
   * @param newLut For internal use when the dataset changes. Optional new
   * selection LUT to use; if not provided, uses a zero-filled LUT of the same
   * size as the current one to reset it.
   */
  clearTracks: (newLut?: Uint8Array) => void;

  setColorTracksByGroup: (colorTracksByGroup: boolean) => void;
};

export type TrackSlice = TrackSliceState & TrackSliceActions;

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
  return (lastColorId + 1) % MAX_FEATURE_CATEGORIES;
}

/**
 * Gets a map from track IDs to color IDs, where selected, related tracks share
 * the same color.
 */
function getColorIdsByGroup(selectedTracks: number[], relationships: LineageDataRelationships): Map<number, number> {
  const groups = groupSelectedTracks(selectedTracks, relationships);
  const idToColorId = new Map<number, number>();
  for (let i = 0; i < groups.length; i++) {
    const colorId = i % MAX_FEATURE_CATEGORIES;
    for (const id of groups[i]) {
      idToColorId.set(id, colorId);
    }
  }
  return idToColorId;
}

function getTrackColors(trackToColorId: Map<number, number>, palette: ColorRamp): Map<number, Color> {
  return new Map(
    Array.from(trackToColorId.entries()).map(([key, value]) => [
      key,
      palette.colorStops[value % palette.colorStops.length],
    ])
  );
}

/** Marks a track as selected/deselected in the provided LUT. */
function applyTrackToSelectionLut(lut: Uint8Array, track: Track, colorIdx: number): void {
  for (const id of track.ids) {
    lut[id] = colorIdx;
  }
}

/**
 * Computes derived values for the trackColors map and the selection LUT.
 * Reuses values where possible to avoid unnecessary recomputation.
 * @param state The current state containing tracks and configuration.
 * @param trackToColorId A map from track IDs to color IDs.
 * @param isSelectedLut The selection LUT to be updated; the same instance will be returned.
 * @returns An object containing the updated trackColors map and selection LUT.
 */
function getDerivedValues(
  state: TrackSlice & ConfigSlice,
  tracks: Map<number, Track>,
  trackToColorId: Map<number, number>,
  isSelectedLut: Uint8Array
): { trackColors: Map<number, Color>; isSelectedLut: Uint8Array } {
  // Replace trackToColorId mapping if coloring by related groups is enabled.
  if (state.colorTracksByGroup) {
    trackToColorId = getColorIdsByGroup(Array.from(tracks.keys()), state.lineageRelationships);
  }

  if (state.colorTracksByGroup) {
    // Override the selection LUT color assignment.
    for (const [trackId, colorId] of trackToColorId) {
      const track = tracks.get(trackId);
      if (track) {
        applyTrackToSelectionLut(isSelectedLut, track, colorId + LUT_OFFSET);
      }
    }
  }

  const trackColors = getTrackColors(trackToColorId, state.outlinePaletteRamp);

  return {
    trackColors,
    isSelectedLut,
  };
}

export const createTrackSlice: StateCreator<TrackSlice & ConfigSlice, [], [], TrackSlice> = (set, get) => ({
  tracks: new Map<number, Track>(),
  trackToColorId: new Map<number, number>(),
  trackColors: new Map<number, Color>(),
  isSelectedLut: new Uint8Array(0),

  colorTracksByGroup: false,
  lineageData: EMPTY_LINEAGE_DATA,
  lineageRelationships: getLineageRelationships(EMPTY_LINEAGE_DATA),

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
        nextColorId = (nextColorId + 1) % state.outlinePaletteRamp.colorStops.length;
      }

      const { trackColors, isSelectedLut } = getDerivedValues(state, newTracks, newTrackToColorId, newSelectedLut);
      return {
        tracks: newTracks,
        trackToColorId: newTrackToColorId,
        trackColors,
        isSelectedLut,
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

      const { trackColors, isSelectedLut } = getDerivedValues(get(), newTracks, newTrackToColorId, newSelectedLut);
      return {
        tracks: newTracks,
        trackToColorId: newTrackToColorId,
        trackColors,
        isSelectedLut,
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
      isSelectedLut: newSelectedLut,
      trackToColorId: new Map<number, number>(),
      trackColors: new Map<number, Color>(),
    });
  },
  setTracks: (tracks: Track | Track[], colors?: number[]) =>
    set((state) => {
      tracks = Array.isArray(tracks) ? tracks : [tracks];

      // Ensure colors array matches length of tracks
      colors = colors ?? [];
      while (colors.length < tracks.length) {
        // Fill with ascending indices; will be wrapped to the palette size
        colors.push(colors.length);
      }

      // Combines steps for `clearTracks` and `addTracks` into one state update
      // to prevent unnecessary re-rendering.
      const newTracks = new Map<number, Track>();
      const newSelectedLut = new Uint8Array(get().isSelectedLut.length);
      const newTrackToColorId = new Map<number, number>();
      const numStops = get().outlinePaletteRamp.colorStops.length;
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

      const { trackColors, isSelectedLut } = getDerivedValues(state, newTracks, newTrackToColorId, newSelectedLut);
      return {
        tracks: newTracks,
        trackToColorId: newTrackToColorId,
        trackColors,
        isSelectedLut,
      };
    }),
  setColorTracksByGroup: (colorTracksByGroup: boolean) => set({ colorTracksByGroup }),
});

export const addTrackDerivedStateSubscribers = (
  store: SubscribableStore<TrackSlice & DatasetSlice & ConfigSlice>
): void => {
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

  // Update lineage data and relationships when the dataset changes.
  addDerivedStateSubscriber(
    store,
    (state) => [state.dataset],
    ([dataset]) => {
      const lineageData = dataset ? getLineageData(dataset) : EMPTY_LINEAGE_DATA;
      const lineageRelationships = getLineageRelationships(lineageData);
      return {
        lineageData,
        lineageRelationships,
      };
    }
  );

  // Recalculate isSelectedLut when coloring by groups is enabled.
  addDerivedStateSubscriber(
    store,
    (state) => [state.colorTracksByGroup, state.lineageRelationships],
    ([colorTracksByGroup, lineageRelationships]) => {
      const { isSelectedLut, tracks } = store.getState();
      let { trackToColorId } = store.getState();
      if (colorTracksByGroup) {
        trackToColorId = getColorIdsByGroup(Array.from(tracks.keys()), lineageRelationships);
      }

      const lut = isSelectedLut.slice();
      lut.fill(LUT_UNSELECTED);

      for (const [trackId, colorId] of trackToColorId.entries()) {
        const track = tracks.get(trackId);
        if (track) {
          applyTrackToSelectionLut(lut, track, colorId + LUT_OFFSET);
        }
      }
      return {
        isSelectedLut: lut,
      };
    }
  );

  // Update track colors when config (coloring by groups and/or outline palette)
  // changes.
  addDerivedStateSubscriber(
    store,
    (state) => ({
      outlinePaletteRamp: state.outlinePaletteRamp,
      lineageRelationships: state.lineageRelationships,
      colorTracksByGroup: state.colorTracksByGroup,
    }),
    ({ outlinePaletteRamp, lineageRelationships, colorTracksByGroup }) => {
      let trackToColorId = store.getState().trackToColorId;
      if (colorTracksByGroup) {
        trackToColorId = getColorIdsByGroup(Array.from(store.getState().tracks.keys()), lineageRelationships);
      }

      return {
        trackColors: getTrackColors(trackToColorId, outlinePaletteRamp),
      };
    }
  );
};

export const serializeTrackSlice = (slice: Partial<TrackSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  if (slice.tracks && slice.tracks.size > 0) {
    const trackIds = Array.from(slice.tracks.keys());
    ret[UrlParam.TRACK] = encodeTracks(trackIds, slice.trackToColorId);
  }
  // Only serialize coloring track groups setting if enabled.
  if (slice.colorTracksByGroup) {
    ret[UrlParam.GROUP_TRACK_COLORS] = encodeBoolean(slice.colorTracksByGroup);
  }
  return ret;
};

export const selectTrackSliceSerializationDeps = (slice: TrackSlice): TrackSliceSerializableState => ({
  tracks: slice.tracks,
  trackToColorId: slice.trackToColorId,
  colorTracksByGroup: slice.colorTracksByGroup,
});

export const loadTrackSliceFromParams = (
  slice: TrackSlice & DatasetSlice & ConfigSlice,
  params: URLSearchParams
): void => {
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
    // For backwards compatibility, use a solid color outline in URLs likely
    // from legacy versions of TFE, when only one track could be selected at a
    // time.
    if (
      tracks.length === 1 &&
      params.get(UrlParam.OUTLINE_COLOR_MODE) === null &&
      params.get(UrlParam.OUTLINE_COLOR) !== null
    ) {
      slice.setOutlineColorMode(SelectionOutlineColorMode.USE_CUSTOM_COLOR);
    }
    slice.setTracks(tracks, colors);

    const colorTracksByGroup = decodeBoolean(params.get(UrlParam.GROUP_TRACK_COLORS));
    if (colorTracksByGroup !== undefined) {
      slice.setColorTracksByGroup(colorTracksByGroup);
    }
  }
};
