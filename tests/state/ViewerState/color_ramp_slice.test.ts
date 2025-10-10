import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { FeatureThreshold, KNOWN_CATEGORICAL_PALETTES, KNOWN_COLOR_RAMPS, ThresholdType } from "src/colorizer";
import { UrlParam } from "src/colorizer/utils/url_utils";
import { MAX_FEATURE_CATEGORIES } from "src/constants";
import { loadColorRampSliceFromParams, serializeColorRampSlice } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";
import { MOCK_DATASET, MOCK_FEATURE_DATA, MockFeatureKeys } from "tests/constants";
import { ANY_ERROR } from "tests/utils";

import { setDatasetAsync } from "./utils";

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

    it("updates categoricalPaletteRamp when set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const paletteData = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[2];
      const colorStops = paletteData.colors;
      act(() => {
        result.current.setCategoricalPalette(colorStops);
      });
      expect(result.current.categoricalPaletteRamp.colorStops).toStrictEqual(colorStops);
    });
  });

  describe("setColorRampRange", () => {
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

  describe("range reset behavior", () => {
    it("ignores changes to feature and dataset when keepColorRampRange is enabled", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampRange([12, 34]);
        result.current.setKeepColorRampRange(true);
      });
      expect(result.current.colorRampRange).toStrictEqual([12, 34]);

      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.colorRampRange).toStrictEqual([12, 34]);

      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
      });
      expect(result.current.colorRampRange).toStrictEqual([12, 34]);
    });

    it("resets color ramp range to feature range when feature changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE1);
        result.current.setColorRampRange([56, 78]);
      });

      // Should reset to feature range
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
      });
      expect(result.current.colorRampRange).not.toStrictEqual([56, 78]);
      const featureData = result.current.dataset?.getFeatureData(result.current.featureKey!)!;
      expect(result.current.colorRampRange).toStrictEqual([featureData!.min, featureData!.max!]);
    });

    it("preferentially resets to threshold instead of feature range when feature changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const threshold: FeatureThreshold = {
        featureKey: MockFeatureKeys.FEATURE2,
        unit: MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE2].unit!,
        type: ThresholdType.NUMERIC,
        min: 56.5,
        max: 23.3,
      };
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE1);
        result.current.setThresholds([threshold]);
        result.current.setColorRampRange([12, 34]);
      });
      expect(result.current.colorRampRange).toStrictEqual([12, 34]);

      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE2);
      });
      expect(result.current.colorRampRange).toStrictEqual([threshold.min, threshold.max]);
    });

    it("resets color ramp range to threshold when threshold changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const threshold: FeatureThreshold = {
        featureKey: MockFeatureKeys.FEATURE1,
        unit: MOCK_FEATURE_DATA[MockFeatureKeys.FEATURE1].unit!,
        type: ThresholdType.NUMERIC,
        min: 10,
        max: 20,
      };

      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setFeatureKey(MockFeatureKeys.FEATURE1);
        result.current.setThresholds([threshold]);
        result.current.setColorRampRange([56, 78]);
      });
      expect(result.current.colorRampRange).toStrictEqual([56, 78]);

      act(() => {
        result.current.setThresholds([{ ...threshold, min: 11, max: 20 }]);
      });
      expect(result.current.colorRampRange).toStrictEqual([11, 20]);

      act(() => {
        result.current.setThresholds([{ ...threshold, min: 100, max: 180 }]);
      });
      expect(result.current.colorRampRange).toStrictEqual([100, 180]);
    });

    it("resets color ramp range to feature range when dataset changes", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampRange([1234, 5678]);
      });

      // Should reset to feature range
      await setDatasetAsync(result, MOCK_DATASET);
      const featureData = result.current.dataset?.getFeatureData(result.current.featureKey!)!;
      expect(result.current.colorRampRange).toStrictEqual([featureData.min, featureData.max!]);
    });
  });

  describe("serializeColorRampSlice", () => {
    it("adds reverse prefix to color ramp key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampKey("matplotlib-viridis");
        result.current.setColorRampReversed(false);
      });
      let serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.COLOR_RAMP]).toBe("matplotlib-viridis");
      act(() => {
        result.current.setColorRampReversed(true);
      });
      serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.COLOR_RAMP]).toBe("matplotlib-viridis!");
    });

    it("serializes all color ramp keys", () => {
      const { result } = renderHook(() => useViewerStateStore());
      for (const key of KNOWN_COLOR_RAMPS.keys()) {
        act(() => {
          result.current.setColorRampKey(key);
          result.current.setColorRampReversed(false);
        });
        let serializedData = serializeColorRampSlice(result.current);
        expect(serializedData[UrlParam.COLOR_RAMP]).toBe(key);
        act(() => {
          result.current.setColorRampReversed(true);
        });
        serializedData = serializeColorRampSlice(result.current);
        expect(serializedData[UrlParam.COLOR_RAMP]).toBe(key + "!");
      }
    });

    it("serializes palette key only when palette matches", () => {
      const { result } = renderHook(() => useViewerStateStore());
      for (const palette of KNOWN_CATEGORICAL_PALETTES.values()) {
        act(() => {
          result.current.setCategoricalPalette(palette.colors);
        });
        const serializedData = serializeColorRampSlice(result.current);
        expect(serializedData[UrlParam.PALETTE_KEY]).toBe(palette.key);
        expect(serializedData[UrlParam.PALETTE]).toBeUndefined();
      }
    });

    it("uses categorical palette instead of key if palette does not match", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const palette = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[3];
      act(() => {
        result.current.setCategoricalPalette(palette.colors);
      });
      let serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.PALETTE_KEY]).toEqual(palette.key);
      expect(serializedData[UrlParam.PALETTE]).toBeUndefined();

      // Change palette slightly
      const newPalette = [...palette.colors];
      newPalette[0] = new Color("#ffffff");
      act(() => {
        result.current.setCategoricalPalette(newPalette);
      });
      serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.PALETTE_KEY]).toBeUndefined();
      expect(serializedData[UrlParam.PALETTE]).toStrictEqual(newPalette.map((color) => color.getHexString()).join("-"));
    });

    it("serializes range, keepRange flag", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setColorRampRange([0.2002, 100]);
        result.current.setKeepColorRampRange(true);
      });
      let serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.RANGE]).toBe("0.200,100"); // Will be encoded
      expect(serializedData[UrlParam.KEEP_RANGE]).toBe("1");

      act(() => {
        result.current.setColorRampRange([-412, -20]);
        result.current.setKeepColorRampRange(false);
      });
      serializedData = serializeColorRampSlice(result.current);
      expect(serializedData[UrlParam.RANGE]).toBe("-412,-20");
      expect(serializedData[UrlParam.KEEP_RANGE]).toBe("0");
    });
  });

  describe("loadColorRampSliceFromParams", () => {
    it("deserializes values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      let ramp = Array.from(KNOWN_COLOR_RAMPS.values())[2];
      const palette = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[3];

      let params = new URLSearchParams();
      params.set(UrlParam.COLOR_RAMP, ramp.key);
      params.set(UrlParam.PALETTE_KEY, palette.key);
      params.set(UrlParam.RANGE, "0.200,100");
      params.set(UrlParam.KEEP_RANGE, "1");
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.colorRampKey).toBe(ramp.key);
      expect(result.current.isColorRampReversed).toBe(false);
      expect(result.current.categoricalPaletteKey).toBe(palette.key);
      expect(result.current.categoricalPalette).toStrictEqual(palette.colors);
      expect(result.current.colorRampRange).toStrictEqual([0.2, 100]);
      expect(result.current.keepColorRampRange).toBe(true);

      const customPalette = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[4].colors;
      customPalette[0] = new Color("#ffffff");
      ramp = Array.from(KNOWN_COLOR_RAMPS.values())[6];

      params = new URLSearchParams();
      params.set(UrlParam.COLOR_RAMP, ramp.key + "!");
      params.set(UrlParam.PALETTE, customPalette.map((color) => color.getHexString()).join("-"));
      params.set(UrlParam.RANGE, "-412,-20");
      params.set(UrlParam.KEEP_RANGE, "0");
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.colorRampKey).toBe(ramp.key);
      expect(result.current.isColorRampReversed).toBe(true);
      expect(result.current.categoricalPaletteKey).toBeNull();
      expect(result.current.categoricalPalette).toStrictEqual(customPalette);
      expect(result.current.colorRampRange).toStrictEqual([-412, -20]);
      expect(result.current.keepColorRampRange).toBe(false);
    });

    it("ignores invalid color ramp keys", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initalColorRampKey = result.current.colorRampKey;

      const params = new URLSearchParams();
      params.set(UrlParam.COLOR_RAMP, "invalid-key!");
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.colorRampKey).toBe(initalColorRampKey);
      expect(result.current.isColorRampReversed).toBe(false);
    });

    it("ignores invalid color palette keys", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialKey = result.current.categoricalPaletteKey;
      const initialPalette = result.current.categoricalPalette;
      const params = new URLSearchParams();
      params.set(UrlParam.PALETTE_KEY, "invalid-key");
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.categoricalPaletteKey).toBe(initialKey);
      expect(result.current.categoricalPalette).toStrictEqual(initialPalette);
    });

    it("backfills missing categorical palette colors to meet 12 total", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const defaultPalette = result.current.categoricalPalette;
      const incompletePalette = [new Color("#ff0000"), new Color("#00ff00")];
      const expectedPalette = incompletePalette.concat(defaultPalette.slice(incompletePalette.length));
      const params = new URLSearchParams();
      params.set(UrlParam.PALETTE, incompletePalette.map((color) => color.getHexString()).join("-"));
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.categoricalPalette.length).toBe(MAX_FEATURE_CATEGORIES);
      expect(result.current.categoricalPalette).toStrictEqual(expectedPalette);
    });

    it("uses palette key instead of palette if both are provided", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const palette = Array.from(KNOWN_CATEGORICAL_PALETTES.values())[3];

      const params = new URLSearchParams();
      params.set(UrlParam.PALETTE_KEY, palette.key);
      // Custom palette values should be ignored
      params.set(UrlParam.PALETTE, "ff0000-00ff00");
      act(() => {
        loadColorRampSliceFromParams(result.current, params);
      });
      expect(result.current.categoricalPaletteKey).toBe(palette.key);
      expect(result.current.categoricalPalette).toStrictEqual(palette.colors);
    });
  });
});
