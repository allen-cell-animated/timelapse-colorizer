import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { KNOWN_CATEGORICAL_PALETTES, KNOWN_COLOR_RAMPS } from "../../../src/colorizer";
import { ANY_ERROR } from "../../test_utils";

import { useViewerStateStore } from "../../../src/colorizer/state/ViewerState";

describe("useViewerStateStore: ColorRampSlice", () => {
  describe("setColorRampKey", () => {
    it("can be set to any known color ramp", () => {
      const { result } = renderHook(() => useViewerStateStore());
      for (const key of KNOWN_COLOR_RAMPS.keys()) {
        act(() => {
          result.current.setColorRampKey(key);
        });
        expect(result.current.colorRampKey).toBe(key);
      }
    });

    it("throws error if color ramp key is invalid", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setColorRampKey("invalid-key");
        });
      }).toThrowError(ANY_ERROR);

      expect(() => {
        act(() => {
          result.current.setColorRampKey("");
        });
      }).toThrowError(ANY_ERROR);
    });

    it("resets reverse flag when new key is set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampReversed(true);
      });
      expect(result.current.isColorRampReversed).toBe(true);

      act(() => {
        result.current.setColorRampKey(Array.from(KNOWN_COLOR_RAMPS.keys())[2]);
      });
      expect(result.current.isColorRampReversed).toBe(false);
    });

    it("updates colorRamp when set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const originalColorRamp = result.current.colorRamp;
      const colorRampData = Array.from(KNOWN_COLOR_RAMPS.values())[2];
      act(() => {
        result.current.setColorRampKey(colorRampData.key);
      });
      expect(result.current.colorRamp).not.toStrictEqual(originalColorRamp);
      expect(result.current.colorRamp).toStrictEqual(colorRampData.colorRamp);
    });
  });

  describe("setColorRampReversed", () => {
    it("can be set", () => {
      const { result } = renderHook(() => useViewerStateStore());

      // Enable reverse
      act(() => {
        result.current.setColorRampReversed(true);
      });
      expect(result.current.isColorRampReversed).toBe(true);

      // Disable reverse
      act(() => {
        result.current.setColorRampReversed(false);
      });
      expect(result.current.isColorRampReversed).toBe(false);
    });

    it("updates colorRamp when set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const defaultColorRamp = result.current.colorRamp;
      act(() => {
        result.current.setColorRampReversed(true);
      });
      expect(result.current.colorRamp).not.toStrictEqual(defaultColorRamp);

      // Expect color ramp stops to be reversed from default
      for (let i = 0; i < defaultColorRamp.colorStops.length; i++) {
        expect(result.current.colorRamp.colorStops[i].getHex()).to.deep.equal(
          defaultColorRamp.colorStops[defaultColorRamp.colorStops.length - 1 - i].getHex()
        );
      }
    });
  });

  describe("setCategoricalPalette", () => {
    it("updates categoricalPaletteKey when set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const paletteData = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[2];
      const colorStops = paletteData.colors;
      act(() => {
        result.current.setCategoricalPalette(colorStops);
      });
      expect(result.current.categoricalPaletteKey).toBe(paletteData.key);

      // Change palette slightly
      const newColorStops = [...colorStops];
      newColorStops[0] = new Color("#ffffff");
      act(() => {
        result.current.setCategoricalPalette(newColorStops);
      });
      expect(result.current.categoricalPaletteKey).toBeNull();
    });
  });

  describe("set colorRampRange", () => {
    it("can set min and max", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampRange([0.2, 100]);
      });
      expect(result.current.colorRampRange).toStrictEqual([0.2, 100]);

      // Keeps sorted order
      act(() => {
        result.current.setColorRampRange([-40, -80]);
      });
      expect(result.current.colorRampRange).toStrictEqual([-80, -40]);
    });

    it("throws an error for NaN or Infinity values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setColorRampRange([0, Infinity]);
        });
      }).toThrowError(ANY_ERROR);
      expect(() => {
        act(() => {
          result.current.setColorRampRange([NaN, 0]);
        });
      }).toThrowError(ANY_ERROR);
    });
  });
});
