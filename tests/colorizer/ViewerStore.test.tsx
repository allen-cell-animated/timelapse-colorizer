import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dataset } from "../../src/colorizer";

import { useViewerStateStore } from "../../src/colorizer/state/ViewerState";

describe("useViewerStateStore", () => {
  describe("Dataset Slice", () => {
    it("initializes backdrop keys to default when dataset is set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const DEFAULT_BACKDROP_KEY = "test";

      // TODO: This will likely need to be an actual dataset at some point
      // as more slices depend on Dataset.
      let mockDataset = {
        getDefaultBackdropKey: () => DEFAULT_BACKDROP_KEY,
        hasBackdrop: (key: string) => key === DEFAULT_BACKDROP_KEY,
      } as unknown as Dataset;
      act(() => {
        result.current.setDataset("some-key", mockDataset);
      });

      expect(result.current.dataset).toBe(mockDataset);
      expect(result.current.backdropKey).toBe(DEFAULT_BACKDROP_KEY);

      // Change dataset to one without default backdrop, backdropKey should
      // be reset to null.
      mockDataset = {
        getDefaultBackdropKey: () => null,
        hasBackdrop: () => false,
      } as unknown as Dataset;
      act(() => {
        result.current.setDataset("some-other-key", mockDataset);
      });
      expect(result.current.dataset).toBe(mockDataset);
      expect(result.current.backdropKey).toBeNull();
    });
  });

  describe("Backdrop Slice", () => {
    it("does not allow backdrop slice to be set when Dataset is null", () => {
      const { result } = renderHook(() => useViewerStateStore());

      // Initialized as null
      expect(result.current.dataset).toBeNull();
      expect(result.current.backdropKey).toBeNull();

      act(() => {
        result.current.setBackdropKey("test");
      });
      expect(result.current.backdropKey).toBeNull();
    });
  });

  it("allows only backdrop keys that are in the dataset.", () => {
    const mockDataset = {
      hasBackdrop: (key: string) => key === "test1" || key === "test2",
      getDefaultBackdropKey: () => "test1",
    } as unknown as Dataset;
    const { result } = renderHook(() => useViewerStateStore());

    // Directly setting state bypasses default initialization behavior
    act(() => {
      useViewerStateStore.setState({ dataset: mockDataset });
      result.current.setDataset("some-key", mockDataset);
    });

    // Should initialize to default backdrop key
    expect(result.current.backdropKey).toBe("test1");

    act(() => {
      result.current.setBackdropKey("test2");
    });
    expect(result.current.backdropKey).toBe("test2");

    // Ignores keys that do not exist
    act(() => {
      result.current.setBackdropKey("test3");
    });
    expect(result.current.backdropKey).toBe("test2");
  });
});
