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

    it("allows setting backdrop keys that are in the dataset.", () => {
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

  describe("setBackdropVisible", () => {
    it("does not allow visibility to be enabled when backdrop key is null", () => {
      const { result } = renderHook(() => useViewerStateStore());

      // Does not allow visibility to be enabled when backdrop key is null
      act(() => {
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropKey).toBeNull();
      expect(result.current.backdropVisible).toBe(false);
    });

    it("toggles visibility", () => {
      // Directly set state
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        useViewerStateStore.setState({ backdropKey: "test" });
      });

      act(() => {
        result.current.setBackdropVisible(true);
      });
      expect(result.current.backdropVisible).toBe(true);
      act(() => {
        result.current.setBackdropVisible(false);
      });
      expect(result.current.backdropVisible).toBe(false);
    });
  });

  describe("setBackdropBrightness", () => {
    it("sets brightness", () => {
      const { result } = renderHook(() => useViewerStateStore());

      act(() => {
        result.current.setBackdropBrightness(75);
      });
      expect(result.current.backdropBrightness).toBe(75);
      act(() => {
        result.current.setBackdropBrightness(220);
      });
      expect(result.current.backdropBrightness).toBe(200);
      act(() => {
        result.current.setBackdropBrightness(-10);
      });
      expect(result.current.backdropBrightness).toBe(0);
    });

    describe("setBackdropSaturation", () => {
      it("sets saturation", () => {
        const { result } = renderHook(() => useViewerStateStore());

        act(() => {
          result.current.setBackdropSaturation(75);
        });
        expect(result.current.backdropSaturation).toBe(75);
        act(() => {
          result.current.setBackdropSaturation(220);
        });
        expect(result.current.backdropSaturation).toBe(100);
        act(() => {
          result.current.setBackdropSaturation(-10);
        });
        expect(result.current.backdropSaturation).toBe(0);
      });
    });

    describe("setObjectOpacity", () => {
      it("sets object opacity", () => {
        const { result } = renderHook(() => useViewerStateStore());

        act(() => {
          result.current.setObjectOpacity(100);
        });
        expect(result.current.objectOpacity).toBe(100);
        act(() => {
          result.current.setObjectOpacity(45.5);
        });
        expect(result.current.objectOpacity).toBe(45.5);
        act(() => {
          result.current.setObjectOpacity(0);
        });
        expect(result.current.objectOpacity).toBe(0);
      });

      it("clamps object opacity", () => {
        const { result } = renderHook(() => useViewerStateStore());

        act(() => {
          result.current.setObjectOpacity(120);
        });
        expect(result.current.objectOpacity).toBe(100);
        act(() => {
          result.current.setObjectOpacity(-1.5);
        });
        expect(result.current.objectOpacity).toBe(0);
      });
    });
  });
});
