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

  describe("setTracks", () => {
    it("can set a single track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTracks(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.tracks.size).toBe(1);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 0, 0, 1, 0, 0, 1, 0, 0]));
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
    });

    it("can set multiple tracks", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTracks([MOCK_DATASET_TRACK_2, MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1]);
      });
      expect(result.current.tracks.size).toBe(3);
      // Preserves ordering
      expect(Array.from(result.current.tracks.keys())).toEqual([
        MOCK_DATASET_TRACK_2.trackId,
        MOCK_DATASET_DEFAULT_TRACK.trackId,
        MOCK_DATASET_TRACK_1.trackId,
      ]);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_1.trackId)).toBe(MOCK_DATASET_TRACK_1);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_2.trackId)).toBe(MOCK_DATASET_TRACK_2);
      // Color index matches order of addition
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(1);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(2);
      // lut = color index + 1
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([2, 3, 1, 2, 3, 1, 2, 3, 1]));
    });

    it("clears and replaces existing tracks", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks([MOCK_DATASET_TRACK_2]);
        result.current.setTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1]);
      });
      expect(result.current.tracks.size).toBe(2);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_1.trackId)).toBe(MOCK_DATASET_TRACK_1);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_2.trackId)).toBeUndefined();
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(1);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 2, 0, 1, 2, 0, 1, 2, 0]));
    });

    it("can assign color IDs", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1, MOCK_DATASET_TRACK_2], [11, 0, 4]);
      });
      expect(result.current.tracks.size).toBe(3);
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(11);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(4);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([12, 1, 5, 12, 1, 5, 12, 1, 5]));
    });
  });

  describe("addTrack, removeTrack, setTracks, & clearTracks", () => {
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
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
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
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
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
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(1);
      // Updates selected LUT
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([1, 2, 0, 1, 2, 0, 1, 2, 0]));
    });

    it("can add and remove track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.addTracks(MOCK_DATASET_DEFAULT_TRACK);
        result.current.removeTracks(MOCK_DATASET_DEFAULT_TRACK.trackId);
      });
      expect(result.current.tracks.size).toBe(0);
      expect(result.current.trackToColorId.size).toBe(0);
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
      expect(result.current.trackToColorId.size).toBe(0);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0]));
    });

    it("assigns next color based on last track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1], [0, 8]);
        result.current.addTracks(MOCK_DATASET_TRACK_2);
      });
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(8);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(9);

      act(() => {
        result.current.removeTracks([MOCK_DATASET_TRACK_1.trackId, MOCK_DATASET_TRACK_2.trackId]);
        result.current.addTracks(MOCK_DATASET_TRACK_2);
      });
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(1);
    });

    it("loops color ID assignment", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTracks([MOCK_DATASET_DEFAULT_TRACK, MOCK_DATASET_TRACK_1], [0, 11]);
        result.current.addTracks(MOCK_DATASET_TRACK_2);
      });
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(11);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(0);
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
        [UrlParam.TRACK]: `${MOCK_DATASET_DEFAULT_TRACK.trackId}:0`,
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
        [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId}:0,${MOCK_DATASET_TRACK_2.trackId}:1,${MOCK_DATASET_DEFAULT_TRACK.trackId}:2`,
      });
    });

    it("preserves track color ID", () => {
      const result = serializeTrackSlice({
        tracks: new Map([
          [MOCK_DATASET_TRACK_1.trackId, MOCK_DATASET_TRACK_1],
          [MOCK_DATASET_TRACK_2.trackId, MOCK_DATASET_TRACK_2],
          [MOCK_DATASET_DEFAULT_TRACK.trackId, MOCK_DATASET_DEFAULT_TRACK],
        ]),
        trackToColorId: new Map([
          [MOCK_DATASET_TRACK_1.trackId, 2],
          [MOCK_DATASET_TRACK_2.trackId, 5],
          [MOCK_DATASET_DEFAULT_TRACK.trackId, 3],
        ]),
      });
      expect(result).toEqual({
        [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId}:2,${MOCK_DATASET_TRACK_2.trackId}:5,${MOCK_DATASET_DEFAULT_TRACK.trackId}:3`,
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
      expect(Array.from(result.current.tracks.keys())).toEqual([
        MOCK_DATASET_TRACK_1.trackId,
        MOCK_DATASET_TRACK_2.trackId,
        MOCK_DATASET_DEFAULT_TRACK.trackId,
      ]);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_1.trackId)).toBe(MOCK_DATASET_TRACK_1);
      expect(result.current.tracks.get(MOCK_DATASET_TRACK_2.trackId)).toBe(MOCK_DATASET_TRACK_2);
      expect(result.current.tracks.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(MOCK_DATASET_DEFAULT_TRACK);
    });

    it("deserializes tracks with color information", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId}:7,${MOCK_DATASET_TRACK_2.trackId}:5,${MOCK_DATASET_DEFAULT_TRACK.trackId}:2`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(3);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(7);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(5);
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(2);
    });

    it("handles bad track color indices", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId}:blabla,${MOCK_DATASET_TRACK_2.trackId}:Infinity,${MOCK_DATASET_DEFAULT_TRACK.trackId}:NaN`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(3);
      // Invalid color IDs default to ascending index
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(0);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(1);
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(2);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([3, 1, 2, 3, 1, 2, 3, 1, 2]));
    });

    it("handles bad track color indices", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTrackSliceFromParams(
          result.current,
          new URLSearchParams({
            [UrlParam.TRACK]: `${MOCK_DATASET_TRACK_1.trackId}:150,${MOCK_DATASET_TRACK_2.trackId}:-16,${MOCK_DATASET_DEFAULT_TRACK.trackId}:5.5`,
          })
        );
      });
      expect(result.current.tracks.size).toBe(3);
      // Numbers are modded
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_1.trackId)).toBe(6);
      expect(result.current.trackToColorId.get(MOCK_DATASET_TRACK_2.trackId)).toBe(8);
      expect(result.current.trackToColorId.get(MOCK_DATASET_DEFAULT_TRACK.trackId)).toBe(5);
      expect(result.current.isSelectedLut).deep.equals(new Uint8Array([6, 7, 9, 6, 7, 9, 6, 7, 9]));
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
