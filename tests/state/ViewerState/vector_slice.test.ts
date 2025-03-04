import { act, renderHook } from "@testing-library/react";
import { Color } from "three";
import { describe, expect, it } from "vitest";

import { VECTOR_KEY_MOTION_DELTA, VectorTooltipMode } from "../../../src/colorizer";
import { useViewerStateStore } from "../../../src/state";
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

    it("round to integers", () => {
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
});
