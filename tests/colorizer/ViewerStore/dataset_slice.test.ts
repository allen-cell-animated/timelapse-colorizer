import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dataset } from "../../../src/colorizer";

import { useViewerStateStore } from "../../../src/colorizer/state/ViewerState";

const DEFAULT_BACKDROP_KEY = "test";

// TODO: This will likely need to be an actual dataset object at some point
// as changing the dataset has more side effects.
const MOCK_DATASET_WITH_BACKDROP = {
  getDefaultBackdropKey: () => DEFAULT_BACKDROP_KEY,
  hasBackdrop: (key: string) => key === DEFAULT_BACKDROP_KEY,
} as unknown as Dataset;

const MOCK_DATASET_WITHOUT_BACKDROP = {
  getDefaultBackdropKey: () => null,
  hasBackdrop: () => false,
} as unknown as Dataset;

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
