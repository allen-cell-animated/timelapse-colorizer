import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  BACKDROP_BRIGHTNESS_MAX,
  BACKDROP_BRIGHTNESS_MIN,
  BACKDROP_OBJECT_OPACITY_MAX,
  BACKDROP_OBJECT_OPACITY_MIN,
  BACKDROP_SATURATION_MAX,
  BACKDROP_SATURATION_MIN,
} from "../../../src/constants";
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
});
