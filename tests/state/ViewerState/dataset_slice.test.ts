import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ANY_ERROR } from "../../test_utils";
import {
  DEFAULT_BACKDROP_KEY,
  DEFAULT_INITIAL_FEATURE_KEY,
  MOCK_DATASET,
  MOCK_DATASET_WITHOUT_BACKDROP,
  MOCK_FEATURE_KEYS,
} from "./constants";

import { useViewerStateStore } from "../../../src/state/ViewerState";

describe("useViewerStateStore: DatasetSlice", () => {
  describe("setDataset", () => {
    it("initializes feature key to default", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
      });
      expect(result.current.dataset).toBe(MOCK_DATASET);
      expect(result.current.featureKey).toBe(DEFAULT_INITIAL_FEATURE_KEY);
    });

    it("initializes backdrop keys to default", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
      });
      expect(result.current.dataset).toBe(MOCK_DATASET);
      expect(result.current.backdropKey).toBe(DEFAULT_BACKDROP_KEY);

      // Change dataset to one without default backdrop, backdropKey should
      // be reset to null.
      act(() => {
        result.current.setDataset("some-other-key", MOCK_DATASET_WITHOUT_BACKDROP);
      });
      expect(result.current.dataset).toBe(MOCK_DATASET_WITHOUT_BACKDROP);
      expect(result.current.backdropKey).toBeNull();
    });

    it("disables backdrop visibility if enabled when the incoming dataset has no backdrops", () => {
      const { result } = renderHook(() => useViewerStateStore());

      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropVisible).toBe(true);

      act(() => {
        result.current.setDataset("some-other-key", MOCK_DATASET_WITHOUT_BACKDROP);
      });
      expect(result.current.backdropVisible).toBe(false);
    });
  });

  describe("clearDataset", () => {
    it("clears backdrop key and visibility", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
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

    it("nulls dependent state", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
        result.current.setFeatureKey(MOCK_FEATURE_KEYS.FEATURE2);
      });
      expect(result.current.featureKey).toBe(MOCK_FEATURE_KEYS.FEATURE2);

      act(() => {
        result.current.clearDataset();
      });
      expect(result.current.featureKey).toBeNull();
    });
  });

  describe("setFeatureKey", () => {
    it("sets the feature key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
      });

      act(() => {
        result.current.setFeatureKey(MOCK_FEATURE_KEYS.FEATURE2);
      });
      expect(result.current.featureKey).toBe(MOCK_FEATURE_KEYS.FEATURE2);
    });

    it("throws error if no dataset is loaded", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setFeatureKey("test");
        });
      }).toThrowError(ANY_ERROR);
    });

    it("throws error if dataset does not have the feature key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET);
      });

      expect(() => {
        act(() => {
          result.current.setFeatureKey("non-existent-key");
        });
      }).toThrowError(ANY_ERROR);
    });
  });
});
