import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { VECTOR_KEY_MOTION_DELTA, VectorTooltipMode } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { useViewerStateStore } from "../../../src/state";
import { loadVectorSliceFromParams, serializeVectorSlice } from "../../../src/state/slices";
import { ANY_ERROR } from "../../test_utils";

describe("VectorSlice", () => {
  it("can set vector properties", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setVectorVisible(true);
      result.current.setVectorKey(VECTOR_KEY_MOTION_DELTA);
      result.current.setVectorMotionTimeIntervals(1);
      result.current.setVectorColor(new Color("#aa00aa"));
      result.current.setVectorScaleFactor(2);
      result.current.setVectorTooltipMode(VectorTooltipMode.COMPONENTS);
    });

    expect(result.current.vectorVisible).toBe(true);
    expect(result.current.vectorKey).toBe(VECTOR_KEY_MOTION_DELTA);
    expect(result.current.vectorMotionTimeIntervals).toBe(1);
    expect(result.current.vectorColor.getHexString()).toBe("aa00aa");
    expect(result.current.vectorScaleFactor).toBe(2);
    expect(result.current.vectorTooltipMode).toBe(VectorTooltipMode.COMPONENTS);

    act(() => {
      result.current.setVectorVisible(false);
      result.current.setVectorMotionTimeIntervals(2);
      result.current.setVectorColor(new Color("#00aa00"));
      result.current.setVectorScaleFactor(3);
      result.current.setVectorTooltipMode(VectorTooltipMode.MAGNITUDE);
    });
    expect(result.current.vectorVisible).toBe(false);
    expect(result.current.vectorMotionTimeIntervals).toBe(2);
    expect(result.current.vectorColor.getHexString()).toBe("00aa00");
    expect(result.current.vectorScaleFactor).toBe(3);
    expect(result.current.vectorTooltipMode).toBe(VectorTooltipMode.MAGNITUDE);
  });

  describe("setVectorScaleFactor", () => {
    it("throws an error on NaN values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        result.current.setVectorScaleFactor(NaN);
      }).toThrowError(ANY_ERROR);
    });
  });

  describe("setVectorMotionTimeIntervals", () => {
    it("clamps negative numbers", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setVectorMotionTimeIntervals(0);
      });
      expect(result.current.vectorMotionTimeIntervals).toBe(1);
      act(() => {
        result.current.setVectorMotionTimeIntervals(-1);
      });
      expect(result.current.vectorMotionTimeIntervals).toBe(1);
      act(() => {
        result.current.setVectorMotionTimeIntervals(-100);
      });
      expect(result.current.vectorMotionTimeIntervals).toBe(1);
    });

    it("rounds to integers", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setVectorMotionTimeIntervals(100.4);
      });
      expect(result.current.vectorMotionTimeIntervals).toBe(100);
      act(() => {
        result.current.setVectorMotionTimeIntervals(1.5);
      });
      expect(result.current.vectorMotionTimeIntervals).toBe(2);
    });

    it("throws an error on NaN values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        result.current.setVectorMotionTimeIntervals(NaN);
      }).toThrowError(ANY_ERROR);
    });
  });

  describe("serializeVectorSlice", () => {
    it("serializes vector slice", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setVectorVisible(true);
        result.current.setVectorKey(VECTOR_KEY_MOTION_DELTA);
        result.current.setVectorMotionTimeIntervals(1);
        result.current.setVectorColor(new Color("#ff0000"));
        result.current.setVectorScaleFactor(2);
        result.current.setVectorTooltipMode(VectorTooltipMode.COMPONENTS);
      });
      let serializedData = serializeVectorSlice(result.current);
      expect(serializedData[UrlParam.SHOW_VECTOR]).toBe("1");
      expect(serializedData[UrlParam.VECTOR_KEY]).toBe(VECTOR_KEY_MOTION_DELTA);
      expect(serializedData[UrlParam.VECTOR_TIME_INTERVALS]).toBe("1");
      expect(serializedData[UrlParam.VECTOR_COLOR]).toBe("ff0000");
      expect(serializedData[UrlParam.VECTOR_SCALE]).toBe("2");
      expect(serializedData[UrlParam.VECTOR_TOOLTIP_MODE]).toBe(VectorTooltipMode.COMPONENTS);

      act(() => {
        result.current.setVectorVisible(false);
        // Currently there are no other valid vector keys.
        result.current.setVectorKey(VECTOR_KEY_MOTION_DELTA);
        result.current.setVectorMotionTimeIntervals(15);
        result.current.setVectorColor(new Color("#ffffff"));
        result.current.setVectorScaleFactor(12);
        result.current.setVectorTooltipMode(VectorTooltipMode.MAGNITUDE);
      });
      serializedData = serializeVectorSlice(result.current);
      expect(serializedData[UrlParam.SHOW_VECTOR]).toBe("0");
      expect(serializedData[UrlParam.VECTOR_KEY]).toBe(VECTOR_KEY_MOTION_DELTA);
      expect(serializedData[UrlParam.VECTOR_TIME_INTERVALS]).toBe("15");
      expect(serializedData[UrlParam.VECTOR_COLOR]).toBe("ffffff");
      expect(serializedData[UrlParam.VECTOR_SCALE]).toBe("12");
      expect(serializedData[UrlParam.VECTOR_TOOLTIP_MODE]).toBe(VectorTooltipMode.MAGNITUDE);
    });
  });

  describe("loadVectorSliceFromParams", () => {
    it("loads basic vector settings", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();

      params.set(UrlParam.SHOW_VECTOR, "1");
      params.set(UrlParam.VECTOR_KEY, VECTOR_KEY_MOTION_DELTA);
      params.set(UrlParam.VECTOR_TIME_INTERVALS, "1");
      params.set(UrlParam.VECTOR_COLOR, "ff0000");
      params.set(UrlParam.VECTOR_SCALE, "2");
      params.set(UrlParam.VECTOR_TOOLTIP_MODE, VectorTooltipMode.COMPONENTS);
      act(() => {
        loadVectorSliceFromParams(result.current, params);
      });
      expect(result.current.vectorVisible).toBe(true);
      expect(result.current.vectorKey).toBe(VECTOR_KEY_MOTION_DELTA);
      expect(result.current.vectorMotionTimeIntervals).toBe(1);
      expect(result.current.vectorColor.getHexString()).toBe("ff0000");
      expect(result.current.vectorScaleFactor).toBe(2);
      expect(result.current.vectorTooltipMode).toBe(VectorTooltipMode.COMPONENTS);

      params.set(UrlParam.SHOW_VECTOR, "0");
      // TODO: Do validation for vector keys if added to Dataset
      // params.set(UrlParam.VECTOR_KEY, VECTOR_KEY_MOTION_DELTA);
      params.set(UrlParam.VECTOR_TIME_INTERVALS, "15");
      params.set(UrlParam.VECTOR_COLOR, "ffffff");
      params.set(UrlParam.VECTOR_SCALE, "12");
      params.set(UrlParam.VECTOR_TOOLTIP_MODE, VectorTooltipMode.MAGNITUDE);
      act(() => {
        loadVectorSliceFromParams(result.current, params);
      });
      expect(result.current.vectorVisible).toBe(false);
      expect(result.current.vectorKey).toBe(VECTOR_KEY_MOTION_DELTA);
      expect(result.current.vectorMotionTimeIntervals).toBe(15);
      expect(result.current.vectorColor.getHexString()).toBe("ffffff");
      expect(result.current.vectorScaleFactor).toBe(12);
      expect(result.current.vectorTooltipMode).toBe(VectorTooltipMode.MAGNITUDE);
    });

    it("ignores invalid vector keys", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.VECTOR_KEY, "invalid_key");
      act(() => {
        loadVectorSliceFromParams(result.current, params);
      });
      expect(result.current.vectorKey).not.toBe("invalid_key");
    });

    it("ignores infinite or NaN scale values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();

      const initialScale = result.current.vectorScaleFactor;
      const invalidValues = ["NaN", "Infinity"];
      for (const value of invalidValues) {
        params.set(UrlParam.VECTOR_SCALE, value);
        act(() => {
          loadVectorSliceFromParams(result.current, params);
        });
        expect(result.current.vectorScaleFactor).toBe(initialScale);
      }
    });

    it("ignores infinite, NaN, or negative time intervals", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setVectorMotionTimeIntervals(1);
      });
      const initialTimeIntervals = result.current.vectorMotionTimeIntervals;

      const params = new URLSearchParams();
      const invalidValues = ["NaN", "Infinity", "-1"];
      for (const value of invalidValues) {
        params.set(UrlParam.VECTOR_TIME_INTERVALS, value);
        act(() => {
          loadVectorSliceFromParams(result.current, params);
        });
        expect(result.current.vectorMotionTimeIntervals).toBe(initialTimeIntervals);
      }
    });

    it("ignores invalid vector tooltip keys", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.VECTOR_TOOLTIP_MODE, "invalid");
      act(() => {
        loadVectorSliceFromParams(result.current, params);
      });
      expect(result.current.vectorTooltipMode).not.toBe("invalid");
    });
  });
});
