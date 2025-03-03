import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_BACKDROP_KEY, MOCK_DATASET_WITH_BACKDROP, MOCK_DATASET_WITHOUT_BACKDROP } from "./constants";

import { useViewerStateStore } from "../../../src/state/ViewerState";

describe("useViewerStateStore: DatasetSlice", () => {
  describe("setDataset", () => {
    it("initializes backdrop keys to default", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-key", MOCK_DATASET_WITH_BACKDROP);
      });

      expect(result.current.dataset).toBe(MOCK_DATASET_WITH_BACKDROP);
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
        result.current.setDataset("some-key", MOCK_DATASET_WITH_BACKDROP);
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
        result.current.setDataset("some-key", MOCK_DATASET_WITH_BACKDROP);
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
  });
});
