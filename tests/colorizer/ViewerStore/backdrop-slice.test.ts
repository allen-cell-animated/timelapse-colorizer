import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dataset } from "../../../src/colorizer";

import { useViewerStateStore } from "../../../src/colorizer/state/ViewerState";

describe("useViewerStateStore: BackdropSlice", () => {
  describe("setBackdropKey", () => {
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

    it("allows sets backdrop keys that are in the dataset.", () => {
      const mockDataset = {
        hasBackdrop: (key: string) => key === "test1" || key === "test2",
        getDefaultBackdropKey: () => "test1",
      } as unknown as Dataset;
      const { result } = renderHook(() => useViewerStateStore());

      act(() => {
        result.current.setDataset("some-key", mockDataset);
      });

      // Should initialize to default backdrop key
      expect(result.current.backdropKey).toBe("test1");

      // Can set another valid backdrop key
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
});
