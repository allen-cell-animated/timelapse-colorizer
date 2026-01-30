import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UrlParam } from "src/colorizer/utils/url_utils";
import { useViewerStateStore } from "src/state";
import { loadTrackSliceFromParams, serializeTrackSlice } from "src/state/slices";
import {
  MOCK_DATASET,
  MOCK_DATASET_DEFAULT_TRACK,
  MOCK_DATASET_TRACK_1,
  MOCK_DATASET_TRACK_2,
  MOCK_DATASET_WITH_ALT_TRACKS,
  MOCK_DATASET_WITHOUT_BACKDROP,
} from "tests/constants";

import { setDatasetAsync } from "./utils";

describe("useViewerStateStore: TrackSlice", () => {
  describe("state subscribers", () => {
    it("does not clear selected tracks when datasets are identical", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK]);
      });
      expect(result.current.tracks.size).toBe(1);
      await setDatasetAsync(result, MOCK_DATASET_WITHOUT_BACKDROP);
      expect(result.current.tracks.size).toBe(1);
    });

    it("clears selected tracks when dataset is changed", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK]);
      });
      expect(result.current.tracks.size).toBe(1);
      await setDatasetAsync(result, MOCK_DATASET_WITH_ALT_TRACKS);
      expect(result.current.tracks.size).toBe(0);
    });

    it("clears selected tracks when dataset is cleared", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK]);
      });
      expect(result.current.tracks.size).toBe(1);
      act(() => {
        result.current.clearDataset();
      });
      expect(result.current.tracks.size).toBe(0);
    });

    it("sets the selectedLut to the length of the dataset on change", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.isSelectedLut.length).toBe(MOCK_DATASET.numObjects);
    });
  });

  describe("addTrack, removeTrack, & clearTracks", () => {
    it("can add track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.tracks.size).toBe(1);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      // Updates selected LUT
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 0, 0, 1, 0, 0, 1, 0, 0]));
    });

    it("adding a track repeatedly does not cause changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks(MOCK_DATASET_DEFAULT_TRACK);
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_DEFAULT_TRACK]);
      });
      expect(result.current.tracks.size).toBe(1);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 0, 0, 1, 0, 0, 1, 0, 0]));
    });

    it("can add multiple tracks", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1]);
      });
      expect(result.current.tracks.size).toBe(2);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_1.trackId)).toBe(MOCK_DATASET_TRACK_1);
      // Updates selected LUT
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 1, 0, 1, 1, 0, 1, 1, 0]));
    });

    it("can add and remove track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks(MOCK_DATASET_DEFAULT_TRACK);
        result.current.removeTracks(MOCK_DATASET_DEFAULT_TRACK.trackId);
      });
      expect(result.current.tracks.size).toBe(0);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0]));
    });

    it("ignores request to remove track that is not in dataset", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.removeTracks(1_000_000);
      });
      expect(result.current.tracks.size).toBe(0);
    });

    it("clears tracks", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1]);
        result.current.clearTracks();
      });
      expect(result.current.tracks.size).toBe(0);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0]));
    });
  });

  describe("serializeTrackSlice", () => {
    it("returns empty when no tracks are selected", () => {
      const result = serializeTrackSlice({ tracks: new Map() });
      expect(result).toEqual({});
    });

    it("serializes a single track", () => {
      const result = serializeTrackSlice({
        tracks: new Map([[MOCK_DATASET_DEFAULT_TRACK.trackId, MOCK_DATASET_DEFAULT_TRACK]]),
      });
      expect(result).toEqual({
        [UrlParam.TRACK]: `${MOCK_DATASET_DEFAULT_TRACK.trackId}`,
      });
    });

    it("serializes multiple tracks", () => {
      const result = serializeTrackSlice({
        tracks: new Map([
          [MOCK_DATASET_TRACK_1.trackId, MOCK_DATASET_TRACK_1],
          [MOCK_DATASET_TRACK_2.trackId, MOCK_DATASET_TRACK_2],
          [MOCK_DATASET_DEFAULT_TRACK.trackId, MOCK_DATASET_DEFAULT_TRACK],
        ]),
      });
      // Note that order should be preserved
      expect(result).toEqual({
        [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId},${MOCK_DATASET_TRACK_2.trackId},${MOCK_DATASET_DEFAULT_TRACK.trackId}`,
      });
    });
  });

  describe("deserializeTrackSlice", () => {
    it("deserializes single track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `${MOCK_DATASET_DEFAULT_TRACK.trackId}`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(1);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
    });

    it("deserializes multiple tracks in order", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId},${MOCK_DATASET_TRACK_2.trackId},${MOCK_DATASET_DEFAULT_TRACK.trackId}`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(3);
      expect(Array.from(result.current.tracks.keys())).toEqual([
        MOCK_DATASET_TRACK_1.trackId,
        MOCK_DATASET_TRACK_2.trackId,
        MOCK_DATASET_DEFAULT_TRACK.trackId,
      ]);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_1.trackId)).toBe(MOCK_DATASET_TRACK_1);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_2.trackId)).toBe(MOCK_DATASET_TRACK_2);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
    });

    it("handles non-integer tracks", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.TRACK, "bad-track-value(notint)");
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(result.current, params);
      });
      expect(result.current.tracks.size).toBe(0);

      params.set(UrlParam.TRACK, "NaN");
      act(() => {
        loadTrackSliceFromParams(result.current, params);
      });
      expect(result.current.tracks.size).toBe(0);

      params.set(UrlParam.TRACK, "19.434");
      act(() => {
        loadTrackSliceFromParams(result.current, params);
      });
      expect(result.current.tracks.size).toBe(0);
    });

    it("ignores track IDs that are not in the dataset", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `999,${MOCK_DATASET_DEFAULT_TRACK.trackId},888`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(1);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
    });
  });
});
