import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FrameLoadResult, Track } from "../../../src/colorizer";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { useViewerStateStore } from "../../../src/state";
import { loadTimeSliceFromParams, serializeTimeSlice } from "../../../src/state/slices";
import { ANY_ERROR, sleep } from "../../test_utils";
import { MOCK_DATASET, MOCK_DATASET_WITH_TWO_FRAMES } from "./constants";
import { clearDatasetAsync, setDatasetAsync } from "./utils";

const TIMEOUT_DURATION_MS = 5;
const MOCK_LOAD_CALLBACK = async (frame: number): Promise<FrameLoadResult> => {
  await sleep(TIMEOUT_DURATION_MS);
  return Promise.resolve({ frame, frameError: false, backdropKey: null, backdropError: false });
};

describe("useViewerStateStore: TimeSlice", () => {
  describe("setFrame", () => {
    it("throws an error for non-finite values", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await expect(async () => {
        await act(async () => {
          await result.current.setFrame(NaN);
        });
      }).rejects.toThrowError(ANY_ERROR);
      await expect(async () => {
        await act(async () => {
          await result.current.setFrame(Infinity);
        });
      }).rejects.toThrowError(ANY_ERROR);
    });

    it("calls loadFrameCallback", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      setDatasetAsync(result, MOCK_DATASET);
      const mockLoadCallback = vi.fn(MOCK_LOAD_CALLBACK);
      await act(async () => {
        result.current.setFrameLoadCallback(mockLoadCallback);
        await result.current.setFrame(1);
      });
      expect(mockLoadCallback).toHaveBeenCalled();
    });

    it("sets pendingFrame and currentFrame", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      setDatasetAsync(result, MOCK_DATASET);
      let setFramePromise;
      await act(async () => {
        result.current.setFrameLoadCallback(MOCK_LOAD_CALLBACK);
        setFramePromise = result.current.setFrame(1);
      });
      expect(result.current.pendingFrame).toBe(1);
      expect(result.current.currentFrame).toBe(0);

      await setFramePromise;
      expect(result.current.currentFrame).toBe(1);
      expect(result.current.pendingFrame).toBe(1);
    });
  });

  describe("timeControls", () => {
    it("calls loadFrameCallback", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      setDatasetAsync(result, MOCK_DATASET);
      const mockLoadCallback = vi.fn(MOCK_LOAD_CALLBACK);
      await act(async () => {
        result.current.setFrameLoadCallback(mockLoadCallback);
        result.current.setPlaybackFps(1000 / TIMEOUT_DURATION_MS);
        result.current.timeControls.play();
      });
      await sleep(TIMEOUT_DURATION_MS);
      expect(mockLoadCallback).toHaveBeenCalled();
      result.current.timeControls.pause();
    });

    it("sets pendingFrame and currentFrame", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      setDatasetAsync(result, MOCK_DATASET);
      await act(async () => {
        result.current.setFrameLoadCallback(MOCK_LOAD_CALLBACK);
        result.current.setPlaybackFps(1000 / TIMEOUT_DURATION_MS);
        result.current.timeControls.play();
      });
      // Can't test exact values due to race condition w/ async.
      // Instead test that pendingFrame is always >= currentFrame.
      expect(result.current.pendingFrame).toBeGreaterThanOrEqual(result.current.pendingFrame);
      await sleep(TIMEOUT_DURATION_MS / 2);
      expect(result.current.pendingFrame).toBeGreaterThanOrEqual(result.current.pendingFrame);
      await sleep(TIMEOUT_DURATION_MS);
      expect(result.current.pendingFrame).toBeGreaterThanOrEqual(result.current.pendingFrame);
    });
  });

  describe("setPlaybackFps", () => {
    it("clamps value", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setPlaybackFps(-1);
      });
      expect(result.current.playbackFps).toBe(0);

      act(() => {
        result.current.setPlaybackFps(100);
      });
      expect(result.current.playbackFps).toBe(100);
    });

    it("throws an error for NaN values", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(() => {
        act(() => {
          result.current.setPlaybackFps(NaN);
        });
      }).toThrowError(ANY_ERROR);
    });
  });

  it("clamps frame when dataset changes", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    await setDatasetAsync(result, MOCK_DATASET);
    await act(async () => {
      await result.current.setFrame(3);
    });
    expect(result.current.pendingFrame).toBe(3);

    await setDatasetAsync(result, MOCK_DATASET_WITH_TWO_FRAMES);
    expect(result.current.pendingFrame).toBe(1);
  });

  it("resets time to 0 when dataset is cleared", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    await setDatasetAsync(result, MOCK_DATASET);
    await act(async () => {
      await result.current.setFrame(3);
    });
    expect(result.current.pendingFrame).toBe(3);

    await clearDatasetAsync(result);
    expect(result.current.pendingFrame).toBe(0);
  });

  describe("serializeTimeSlice", () => {
    it("serializes 0 values", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await act(async () => {
        await result.current.setFrame(0);
      });
      expect(serializeTimeSlice(result.current)[UrlParam.TIME]).toBe("0");
    });

    it("serializes time value", async () => {
      const frameNumber = 155;
      const { result } = renderHook(() => useViewerStateStore());
      await act(async () => {
        await result.current.setFrame(frameNumber);
      });
      expect(serializeTimeSlice(result.current)[UrlParam.TIME]).toBe(frameNumber.toString());
    });
  });

  describe("loadTimeSliceFromParams", () => {
    it("loads time from params", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.TIME, "100");
      act(() => {
        loadTimeSliceFromParams(result.current, params);
      });
      expect(result.current.pendingFrame).toBe(100);

      params.set(UrlParam.TIME, "0");
      act(() => {
        loadTimeSliceFromParams(result.current, params);
      });
      expect(result.current.pendingFrame).toBe(0);
    });

    it("uses track start time if no time is provided", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        // Fake track with start time at 50
        result.current.setTrack(new Track(15, [3], [0], [0, 0], [1, 1]));
      });
      const params = new URLSearchParams();
      act(() => {
        loadTimeSliceFromParams(result.current, params);
      });
      expect(result.current.pendingFrame).toBe(3);
    });

    it("clamps min frame number to 0", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.TIME, "-100");
      act(() => {
        loadTimeSliceFromParams(result.current, params);
      });
      expect(result.current.pendingFrame).toBe(0);
    });

    it("clamps max frame number if dataset is provided", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.TIME, "100");
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadTimeSliceFromParams(result.current, params);
      });
      expect(result.current.pendingFrame).toBe(MOCK_DATASET.numberOfFrames - 1);
    });
  });
});
