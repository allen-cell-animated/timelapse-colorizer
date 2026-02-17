import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViewMode } from "src/colorizer";
import { UrlParam } from "src/colorizer/utils/url_utils";
import { loadDatasetSliceFromParams, serializeDatasetSlice } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";
import {
  DEFAULT_INITIAL_FEATURE_KEY,
  MOCK_DATASET,
  MOCK_DATASET_2D_ONLY,
  MOCK_DATASET_DEFAULT_TRACK,
  MOCK_DATASET_WITHOUT_BACKDROP,
  MockBackdropKeys,
  MockFeatureKeys,
} from "tests/constants";
import { ANY_ERROR } from "tests/utils";

import { setDatasetAsync } from "./utils";

describe("useViewerStateStore: DatasetSlice", () => {
  describe("setDataset", () => {
    it("initializes feature key to default", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.dataset).toBe(MOCK_DATASET);
      expect(result.current.featureKey).toBe(DEFAULT_INITIAL_FEATURE_KEY);
    });

    it("initializes backdrop keys to default", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET, "some-key");
      expect(result.current.dataset).toBe(MOCK_DATASET);
      expect(result.current.backdropKey).toBe(MockBackdropKeys.BACKDROP1);

      // Change dataset to one without default backdrop, backdropKey should
      // be reset to null.
      await setDatasetAsync(result, MOCK_DATASET_WITHOUT_BACKDROP, "some-other-key");
      expect(result.current.dataset).toBe(MOCK_DATASET_WITHOUT_BACKDROP);
      expect(result.current.backdropKey).toBeNull();
    });

    it("disables backdrop visibility if enabled when the incoming dataset has no backdrops", async () => {
      const { result } = renderHook(() => useViewerStateStore());

      await setDatasetAsync(result, MOCK_DATASET, "some-key");
      act(() => {
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropVisible).toBe(true);

      await setDatasetAsync(result, MOCK_DATASET_WITHOUT_BACKDROP, "some-other-key");
      expect(result.current.backdropVisible).toBe(false);
    });

    it("updates the viewMode based on the dataset type", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      // Default is 2D
      expect(result.current.viewMode).equals(ViewMode.VIEW_2D);

      await setDatasetAsync(result, MOCK_DATASET, "some-key");
      expect(result.current.viewMode).equals(ViewMode.VIEW_3D);

      await setDatasetAsync(result, MOCK_DATASET_2D_ONLY, "some-other-key");
      expect(result.current.viewMode).equals(ViewMode.VIEW_2D);
    });
  });

  describe("clearDataset", () => {
    it("clears backdrop key and visibility", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropKey).toBe(MockBackdropKeys.BACKDROP1);
      expect(result.current.backdropVisible).toBe(true);

      act(() => {
        result.current.clearDataset();
      });
      expect(result.current.dataset).toBeNull();
      expect(result.current.backdropKey).toBeNull();
      expect(result.current.backdropVisible).toBe(false);
    });

    it("nulls dependent state", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
        result.current.setTracks(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.featureKey).toBe(MockFeatureKeys.FEATURE2);
      expect(Array.from(result.current.tracks.keys())).toEqual([MOCK_DATASET_DEFAULT_TRACK.trackId]);

      act(() => {
        result.current.clearDataset();
      });
      expect(result.current.featureKey).toBeNull();
      expect(result.current.tracks.size).toBe(0);
    });
  });

  describe("setFeatureKey", () => {
    it("sets the feature key", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);

      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
      });
      expect(result.current.featureKey).toBe(MockFeatureKeys.FEATURE2);
    });

    it("throws error if no dataset is loaded", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setFeatureKey(MockFeatureKeys.FEATURE1);
        });
      }).toThrowError(ANY_ERROR);
    });

    it("throws error if dataset does not have the feature key", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);

      expect(() => {
        act(() => {
          result.current.setFeatureKey("non-existent-key");
        });
      }).toThrowError(ANY_ERROR);
    });
  });

  describe("setBackdropKey", () => {
    it("does not allow backdrop slice to be set when provided Dataset has no backdrops", () => {
      const { result } = renderHook(() => useViewerStateStore());

      // Initialized as null
      expect(result.current.backdropKey).toBeNull();
      expect(() => {
        act(() => {
          result.current.setBackdropKey("test");
        });
      }).toThrowError(ANY_ERROR);
      expect(result.current.backdropKey).toBeNull();
    });

    it("allows setting backdrop keys that are in the dataset.", async () => {
      const { result } = renderHook(() => useViewerStateStore());

      // Should initialize to default backdrop key
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setBackdropKey(MockBackdropKeys.BACKDROP1);
      });
      expect(result.current.backdropKey).toBe(MockBackdropKeys.BACKDROP1);

      // Can set another valid backdrop key
      act(() => {
        result.current.setBackdropKey(MockBackdropKeys.BACKDROP2);
      });
      expect(result.current.backdropKey).toBe(MockBackdropKeys.BACKDROP2);
    });
  });

  describe("serializeDatasetSlice", () => {
    it("serializes DatasetSlice values", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET, "some-key");
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
        result.current.setBackdropKey(MockBackdropKeys.BACKDROP2);
      });
      const serializedData = serializeDatasetSlice(result.current);
      expect(serializedData[UrlParam.DATASET]).toBe("some-key");
      expect(serializedData[UrlParam.FEATURE]).toBe(MockFeatureKeys.FEATURE2);
      expect(serializedData[UrlParam.BACKDROP_KEY]).toBe(MockBackdropKeys.BACKDROP2);
    });

    it("does not serialize null values", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const serializedData = serializeDatasetSlice(result.current);
      expect(serializedData).toStrictEqual({});
    });
  });

  describe("loadDatasetSliceFromParams", () => {
    it("ignores values when dataset slice is not set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.FEATURE, MockFeatureKeys.FEATURE1);
      params.set(UrlParam.BACKDROP_KEY, MockBackdropKeys.BACKDROP1);
      act(() => {
        loadDatasetSliceFromParams(result.current, params);
      });
      expect(result.current.featureKey).toBeNull();
      expect(result.current.backdropKey).toBeNull();
    });

    it("loads DatasetSlice values from params", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.FEATURE, MockFeatureKeys.FEATURE3);
      params.set(UrlParam.BACKDROP_KEY, MockBackdropKeys.BACKDROP2);

      await setDatasetAsync(result, MOCK_DATASET);

      act(() => {
        loadDatasetSliceFromParams(result.current, params);
      });
      expect(result.current.featureKey).toBe(MockFeatureKeys.FEATURE3);
      expect(result.current.backdropKey).toBe(MockBackdropKeys.BACKDROP2);
    });

    it("decodes characters in keys", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams(
        `?${UrlParam.FEATURE}=${encodeURIComponent(MockFeatureKeys.FEATURE4_ILLEGAL_CHARS)}`
      );
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadDatasetSliceFromParams(result.current, params);
      });
      expect(result.current.featureKey).toBe(MockFeatureKeys.FEATURE4_ILLEGAL_CHARS);
    });

    it("ignores param keys that are not in the dataset.", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.FEATURE, "non-existent-key");
      params.set(UrlParam.BACKDROP_KEY, "non-existent-backdrop");
      await setDatasetAsync(result, MOCK_DATASET);
      const defaultFeatureKey = result.current.featureKey;
      const defaultBackdropKey = result.current.backdropKey;
      act(() => {
        loadDatasetSliceFromParams(result.current, params);
      });
      expect(result.current.featureKey).toBe(defaultFeatureKey);
      expect(result.current.backdropKey).toBe(defaultBackdropKey);
    });
  });
});
