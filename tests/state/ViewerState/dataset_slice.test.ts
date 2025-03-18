import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ANY_ERROR } from "../../test_utils";
import {
  DEFAULT_BACKDROP_KEY,
  DEFAULT_INITIAL_FEATURE_KEY,
  MOCK_DATASET,
  MOCK_DATASET_DEFAULT_TRACK,
  MOCK_DATASET_WITHOUT_BACKDROP,
  MockFeatureKeys,
} from "./constants";
import { setDatasetAsync } from "./utils";

import { useViewerStateStore } from "../../../src/state/ViewerState";

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
      expect(result.current.backdropKey).toBe(DEFAULT_BACKDROP_KEY);

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

    it("clears dependent state", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET, "some-key");
      act(() => {
        result.current.setTrack(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.track).toBe(MOCK_DATASET_DEFAULT_TRACK);

      await setDatasetAsync(result, MOCK_DATASET, "some-other-key");
      expect(result.current.track).toBeNull();
    });
  });

  describe("clearDataset", () => {
    it("clears backdrop key and visibility", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropKey).toBe(DEFAULT_BACKDROP_KEY);
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
        result.current.setTrack(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.featureKey).toBe(MockFeatureKeys.FEATURE2);
      expect(result.current.track).toBe(MOCK_DATASET_DEFAULT_TRACK);

      act(() => {
        result.current.clearDataset();
      });
      expect(result.current.featureKey).toBeNull();
      expect(result.current.track).toBeNull();
    });
  });

  describe("setTrack & clearTrack", () => {
    it("throws an error if no dataset is loaded", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setTrack(MOCK_DATASET_DEFAULT_TRACK);
        });
      }).toThrowError(ANY_ERROR);
    });

    it("sets and clears the track", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setTrack(MOCK_DATASET_DEFAULT_TRACK);
      });
      expect(result.current.track).toBe(MOCK_DATASET_DEFAULT_TRACK);

      act(() => {
        result.current.clearTrack();
      });
      expect(result.current.track).toBeNull();
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
});
