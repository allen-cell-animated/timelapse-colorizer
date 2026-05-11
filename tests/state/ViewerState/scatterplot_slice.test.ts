import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";

import { PlotRangeType } from "src/colorizer";
import { TIME_FEATURE_KEY } from "src/colorizer/Dataset";
import { UrlParam } from "src/colorizer/utils/url_utils";
import { DEPRECATED_SCATTERPLOT_TIME_KEY } from "src/constants";
import { useViewerStateStore } from "src/state";
import { loadScatterPlotSliceFromParams, serializeScatterPlotSlice } from "src/state/slices";
import { MOCK_DATASET, MockFeatureKeys } from "tests/constants";
import { ANY_ERROR } from "tests/utils";

import { setDatasetAsync } from "./utils";

describe("ScatterplotSlice", () => {
  describe("setScatterShowHistograms", () => {
    it("can set show histograms", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterShowHistograms(false);
      });
      expect(result.current.scatterShowHistograms).toBe(false);

      act(() => {
        result.current.setScatterShowHistograms(true);
      });
      expect(result.current.scatterShowHistograms).toBe(true);
    });
  });

  it("can set range type", () => {
    const { result } = renderHook(() => useViewerStateStore());
    const types = [PlotRangeType.ALL_TIME, PlotRangeType.CURRENT_FRAME, PlotRangeType.CURRENT_TRACK];
    for (const type of types) {
      act(() => {
        result.current.setScatterRangeType(type);
      });
      expect(result.current.scatterRangeType).toBe(type);
    }
  });

  describe("setScatterHistogramBins", () => {
    it("can set histogram bin count", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterHistogramBins(10);
      });
      expect(result.current.scatterHistogramBins).toBe(10);
    });

    it("ignores non-finite or negative bin counts", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const defaultBins = result.current.scatterHistogramBins;
      act(() => {
        result.current.setScatterHistogramBins(-1);
        result.current.setScatterHistogramBins(NaN);
        result.current.setScatterHistogramBins(Infinity);
      });
      expect(result.current.scatterHistogramBins).toBe(defaultBins);
    });
  });

  describe("contour settings", () => {
    it("can set contour visibility", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterShowContours(true);
      });
      expect(result.current.scatterShowContours).toBe(true);
    });

    it("can set contour colormap key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterContourColorRampKey("matplotlib-viridis");
      });
      expect(result.current.scatterContourColorRampKey).toBe("matplotlib-viridis");
    });

    it("can set contour colormap key reversed", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterContourColorRampReversed(true);
      });
      expect(result.current.scatterContourColorRampReversed).toBe(true);

      act(() => {
        result.current.setScatterContourColorRampReversed(false);
      });
      expect(result.current.scatterContourColorRampReversed).toBe(false);
    });

    it("can set contour bin count", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterContourCount(50);
      });
      expect(result.current.scatterContourCount).toBe(50);
    });

    it("ignores non-finite or negative contour bin counts", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const defaultCount = result.current.scatterContourCount;
      act(() => {
        result.current.setScatterContourCount(-1);
        result.current.setScatterContourCount(NaN);
        result.current.setScatterContourCount(Infinity);
      });
      expect(result.current.scatterContourCount).toBe(defaultCount);
    });

    it("resets reversed state when setting a new contour colormap key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterContourColorRampReversed(true);
        result.current.setScatterContourColorRampKey("matplotlib-viridis");
      });
      expect(result.current.scatterContourColorRampReversed).toBe(false);
    });

    it("throws on unknown contour colormap key", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        expect(() => result.current.setScatterContourColorRampKey("unknown-colormap-key")).toThrowError(ANY_ERROR);
      });
    });
  });

  describe("setScatterAxes", () => {
    it("can set axes to any value when dataset is not set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterXAxis("some-feature-x");
        result.current.setScatterYAxis("some-feature-y");
      });
      expect(result.current.scatterXAxis).toBe("some-feature-x");
      expect(result.current.scatterYAxis).toBe("some-feature-y");
    });

    it("throws an error if an axis key is not in the current dataset", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        expect(() => result.current.setScatterXAxis("some-feature-x")).toThrowError(ANY_ERROR);
      });
      act(() => {
        expect(() => result.current.setScatterYAxis("some-feature-y")).toThrowError(ANY_ERROR);
      });
    });

    it("allows axes to be set to feature keys in the current dataset, time, or null", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      // Features in current dataset
      act(() => {
        result.current.setScatterXAxis(MockFeatureKeys.FEATURE1);
        result.current.setScatterYAxis(MockFeatureKeys.FEATURE2);
      });
      expect(result.current.scatterXAxis).toBe(MockFeatureKeys.FEATURE1);
      expect(result.current.scatterYAxis).toBe(MockFeatureKeys.FEATURE2);

      // Custom time feature
      act(() => {
        result.current.setScatterXAxis(TIME_FEATURE_KEY);
        result.current.setScatterYAxis(TIME_FEATURE_KEY);
      });
      expect(result.current.scatterXAxis).toBe(TIME_FEATURE_KEY);
      expect(result.current.scatterYAxis).toBe(TIME_FEATURE_KEY);

      // Null
      act(() => {
        result.current.setScatterXAxis(null);
        result.current.setScatterYAxis(null);
      });
      expect(result.current.scatterXAxis).toBe(null);
      expect(result.current.scatterYAxis).toBe(null);
    });
  });

  describe("on dataset change", () => {
    it("allows axes to keep feature keys in the new dataset", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterXAxis(MockFeatureKeys.FEATURE1);
        result.current.setScatterYAxis(MockFeatureKeys.FEATURE2);
      });
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.scatterXAxis).toBe(MockFeatureKeys.FEATURE1);
      expect(result.current.scatterYAxis).toBe(MockFeatureKeys.FEATURE2);
    });

    it("allows axes to keep time value on dataset change", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterXAxis(TIME_FEATURE_KEY);
        result.current.setScatterYAxis(TIME_FEATURE_KEY);
      });
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.scatterXAxis).toBe(TIME_FEATURE_KEY);
      expect(result.current.scatterYAxis).toBe(TIME_FEATURE_KEY);
    });

    it("nulls axes with feature keys that do not exist in the new dataset", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterXAxis("some-feature-x");
        result.current.setScatterYAxis("some-feature-y");
      });
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.scatterXAxis).toBe(null);
      expect(result.current.scatterYAxis).toBe(null);
    });
  });

  describe("serializeScatterPlotSlice", () => {
    it("serializes slice data", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setScatterXAxis(null);
        result.current.setScatterYAxis(null);
        result.current.setScatterShowHistograms(true);
        result.current.setScatterRangeType(PlotRangeType.ALL_TIME);
        result.current.setScatterShowContours(false);
        result.current.setScatterContourColorRampKey("matplotlib-cool");
        result.current.setScatterContourColorRampReversed(false);
      });
      let serializedData = serializeScatterPlotSlice(result.current);
      expect(serializedData[UrlParam.SCATTERPLOT_X_AXIS]).toBeUndefined();
      expect(serializedData[UrlParam.SCATTERPLOT_Y_AXIS]).toBeUndefined();
      expect(serializedData[UrlParam.SCATTERPLOT_SHOW_HISTOGRAMS]).toBe("1");
      expect(serializedData[UrlParam.SCATTERPLOT_RANGE_MODE]).toBe("all");
      expect(serializedData[UrlParam.SCATTERPLOT_SHOW_CONTOUR]).toBe("0");
      expect(serializedData[UrlParam.SCATTERPLOT_CONTOUR_COLOR_MAP]).toBe("matplotlib-cool");

      act(() => {
        result.current.setScatterXAxis(MockFeatureKeys.FEATURE1);
        result.current.setScatterYAxis(MockFeatureKeys.FEATURE2);
        result.current.setScatterShowHistograms(false);
        result.current.setScatterRangeType(PlotRangeType.CURRENT_FRAME);
        result.current.setScatterShowContours(true);
        result.current.setScatterContourCount(40);
        result.current.setScatterContourColorRampKey("matplotlib-viridis");
        result.current.setScatterContourColorRampReversed(true);
      });
      serializedData = serializeScatterPlotSlice(result.current);
      expect(serializedData[UrlParam.SCATTERPLOT_X_AXIS]).toBe(MockFeatureKeys.FEATURE1);
      expect(serializedData[UrlParam.SCATTERPLOT_Y_AXIS]).toBe(MockFeatureKeys.FEATURE2);
      expect(serializedData[UrlParam.SCATTERPLOT_SHOW_HISTOGRAMS]).toBe("0");
      expect(serializedData[UrlParam.SCATTERPLOT_RANGE_MODE]).toBe("frame");
      expect(serializedData[UrlParam.SCATTERPLOT_SHOW_CONTOUR]).toBe("1");
      expect(serializedData[UrlParam.SCATTERPLOT_CONTOUR_COUNT]).toBe("40");
      expect(serializedData[UrlParam.SCATTERPLOT_CONTOUR_COLOR_MAP]).toBe("matplotlib-viridis!");
    });
  });

  describe("loadScatterPlotSliceFromParams", () => {
    it("loads slice data", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.SCATTERPLOT_X_AXIS, MockFeatureKeys.FEATURE1);
      params.set(UrlParam.SCATTERPLOT_Y_AXIS, MockFeatureKeys.FEATURE2);
      params.set(UrlParam.SCATTERPLOT_SHOW_HISTOGRAMS, "0");
      params.set(UrlParam.SCATTERPLOT_RANGE_MODE, "frame");
      params.set(UrlParam.SCATTERPLOT_SHOW_CONTOUR, "1");
      params.set(UrlParam.SCATTERPLOT_CONTOUR_COUNT, "40");
      params.set(UrlParam.SCATTERPLOT_CONTOUR_COLOR_MAP, "matplotlib-viridis!");

      act(() => {
        loadScatterPlotSliceFromParams(result.current, params);
      });

      expect(result.current.scatterXAxis).toBe(MockFeatureKeys.FEATURE1);
      expect(result.current.scatterYAxis).toBe(MockFeatureKeys.FEATURE2);
      expect(result.current.scatterShowHistograms).toBe(false);
      expect(result.current.scatterRangeType).toBe(PlotRangeType.CURRENT_FRAME);
      expect(result.current.scatterShowContours).toBe(true);
      expect(result.current.scatterContourCount).toBe(40);
      expect(result.current.scatterContourColorRampKey).toBe("matplotlib-viridis");
      expect(result.current.scatterContourColorRampReversed).toBe(true);
    });

    it("ignores axes that are not in the dataset when dataset is loaded", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.SCATTERPLOT_X_AXIS, "invalid-feature-x");
      params.set(UrlParam.SCATTERPLOT_Y_AXIS, "invalid-feature-y");
      await setDatasetAsync(result, MOCK_DATASET);
      act(() => {
        loadScatterPlotSliceFromParams(result.current, params);
      });
      expect(result.current.scatterXAxis).toBe(null);
      expect(result.current.scatterYAxis).toBe(null);
    });

    it("ignores missing axes", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialXAxis = result.current.scatterXAxis;
      const initialYAxis = result.current.scatterYAxis;
      act(() => {
        loadScatterPlotSliceFromParams(result.current, new URLSearchParams());
      });
      expect(result.current.scatterXAxis).toBe(initialXAxis);
      expect(result.current.scatterYAxis).toBe(initialYAxis);
    });

    it("ignores invalid range types", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const initialRangeType = result.current.scatterRangeType;

      const params = new URLSearchParams();
      params.set(UrlParam.SCATTERPLOT_RANGE_MODE, "invalid-range-type");
      act(() => {
        loadScatterPlotSliceFromParams(result.current, params);
      });
      expect(result.current.scatterRangeType).toBe(initialRangeType);
    });

    it("replaces the deprecated scatterplot time feature", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.SCATTERPLOT_X_AXIS, DEPRECATED_SCATTERPLOT_TIME_KEY);
      params.set(UrlParam.SCATTERPLOT_Y_AXIS, DEPRECATED_SCATTERPLOT_TIME_KEY);
      act(() => {
        loadScatterPlotSliceFromParams(result.current, params);
      });
      expect(result.current.scatterXAxis).toBe(TIME_FEATURE_KEY);
      expect(result.current.scatterYAxis).toBe(TIME_FEATURE_KEY);
    });
  });
});
