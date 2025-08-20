import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import {
  BACKDROP_BRIGHTNESS_MAX,
  BACKDROP_BRIGHTNESS_MIN,
  BACKDROP_OBJECT_OPACITY_MAX,
  BACKDROP_OBJECT_OPACITY_MIN,
  BACKDROP_SATURATION_MAX,
  BACKDROP_SATURATION_MIN,
} from "../../../src/constants";
import { loadBackdropSliceFromParams, serializeBackdropSlice } from "../../../src/state/slices";
import { ANY_ERROR } from "../../test_utils";
import { MOCK_DATASET, MockBackdropKeys } from "./constants";
import { setDatasetAsync } from "./utils";

import { useViewerStateStore } from "../../../src/state/ViewerState";

describe("useViewerStateStore: BackdropSlice", () => {
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

  it("can set backdrop properties with clamping", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setBackdropBrightness(75);
      result.current.setBackdropSaturation(50);
      result.current.setObjectOpacity(25);
    });
    expect(result.current.backdropBrightness).toBe(75);
    expect(result.current.backdropSaturation).toBe(50);
    expect(result.current.objectOpacity).toBe(25);

    act(() => {
      result.current.setBackdropBrightness(BACKDROP_BRIGHTNESS_MAX + 10);
      result.current.setBackdropSaturation(BACKDROP_SATURATION_MAX + 20);
      result.current.setObjectOpacity(BACKDROP_OBJECT_OPACITY_MAX + 30);
    });
    expect(result.current.backdropBrightness).toBe(BACKDROP_BRIGHTNESS_MAX);
    expect(result.current.backdropSaturation).toBe(BACKDROP_SATURATION_MAX);
    expect(result.current.objectOpacity).toBe(BACKDROP_OBJECT_OPACITY_MAX);

    act(() => {
      result.current.setBackdropBrightness(BACKDROP_BRIGHTNESS_MIN - 10);
      result.current.setBackdropSaturation(BACKDROP_SATURATION_MIN - 20);
      result.current.setObjectOpacity(BACKDROP_OBJECT_OPACITY_MIN - 30);
    });
    expect(result.current.backdropBrightness).toBe(BACKDROP_BRIGHTNESS_MIN);
    expect(result.current.backdropSaturation).toBe(BACKDROP_SATURATION_MIN);
    expect(result.current.objectOpacity).toBe(BACKDROP_OBJECT_OPACITY_MIN);
  });

  it("throws error if NaN passed to backdrop property setters", () => {
    const { result } = renderHook(() => useViewerStateStore());
    expect(() => {
      result.current.setBackdropBrightness(NaN);
    }).toThrowError(ANY_ERROR);
    expect(() => {
      result.current.setBackdropSaturation(NaN);
    }).toThrowError(ANY_ERROR);
    expect(() => {
      result.current.setObjectOpacity(NaN);
    }).toThrowError(ANY_ERROR);
  });

  it("disables backdrop visibility if key is set to null", async () => {
    const { result } = renderHook(() => useViewerStateStore());

    await setDatasetAsync(result, MOCK_DATASET);
    act(() => {
      result.current.setBackdropKey(MockBackdropKeys.BACKDROP1);
      result.current.setBackdropVisible(true);
    });
    expect(result.current.backdropVisible).toBe(true);

    act(() => {
      useViewerStateStore.setState({ backdropKey: null });
    });
    expect(result.current.backdropVisible).toBe(false);
  });

  describe("serializeBackdropSlice", () => {
    it("serializes backdrop values", async () => {
      const { result } = renderHook(() => useViewerStateStore());

      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        result.current.setBackdropVisible(true);
        result.current.setBackdropBrightness(75);
        result.current.setBackdropSaturation(50);
        result.current.setObjectOpacity(25);
      });
      const serialized = serializeBackdropSlice(result.current);
      expect(serialized[UrlParam.SHOW_BACKDROP]).toBe("1");
      expect(serialized[UrlParam.BACKDROP_BRIGHTNESS]).toBe("75");
      expect(serialized[UrlParam.BACKDROP_SATURATION]).toBe("50");
      expect(serialized[UrlParam.OBJECT_OPACITY]).toBe("25");
    });
  });

  describe("loadBackdropSliceFromParams", () => {
    it("loads backdrop data from params", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.SHOW_BACKDROP, "1");
      params.set(UrlParam.BACKDROP_BRIGHTNESS, "75");
      params.set(UrlParam.BACKDROP_SATURATION, "50");
      params.set(UrlParam.OBJECT_OPACITY, "25");
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadBackdropSliceFromParams(result.current, params);
      });
      expect(result.current.backdropVisible).toBe(true);
      expect(result.current.backdropBrightness).toBe(75);
      expect(result.current.backdropSaturation).toBe(50);
      expect(result.current.objectOpacity).toBe(25);
    });

    it("ignores NaN/Infinity values for numeric fields", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialBackdropBrightness = result.current.backdropBrightness;
      const initialBackdropSaturation = result.current.backdropSaturation;
      const initialObjectOpacity = result.current.objectOpacity;

      const illegalValues = ["NaN", "Infinity", "-Infinity"];
      for (const value of illegalValues) {
        const params = new URLSearchParams();
        params.set(UrlParam.BACKDROP_BRIGHTNESS, value);
        params.set(UrlParam.BACKDROP_SATURATION, value);
        params.set(UrlParam.OBJECT_OPACITY, value);
        act(() => {
          loadBackdropSliceFromParams(result.current, params);
        });
        expect(result.current.backdropBrightness).toBe(initialBackdropBrightness);
        expect(result.current.backdropSaturation).toBe(initialBackdropSaturation);
        expect(result.current.objectOpacity).toBe(initialObjectOpacity);
      }
    });
  });
});
