import { renderHook } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";

import { PlotRangeType } from "../../../src/colorizer";
import { SCATTERPLOT_TIME_FEATURE } from "../../../src/components/Tabs/scatter_plot_data_utils";
import { useViewerStateStore } from "../../../src/state";
import { ANY_ERROR } from "../../test_utils";
import { MOCK_DATASET, MockFeatureKeys } from "./constants";
import { setDatasetAsync } from "./utils";

describe("ScatterplotSlice", () => {
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
        result.current.setScatterXAxis(SCATTERPLOT_TIME_FEATURE.value);
        result.current.setScatterYAxis(SCATTERPLOT_TIME_FEATURE.value);
      });
      expect(result.current.scatterXAxis).toBe(SCATTERPLOT_TIME_FEATURE.value);
      expect(result.current.scatterYAxis).toBe(SCATTERPLOT_TIME_FEATURE.value);

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
        result.current.setScatterXAxis(SCATTERPLOT_TIME_FEATURE.value);
        result.current.setScatterYAxis(SCATTERPLOT_TIME_FEATURE.value);
      });
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.scatterXAxis).toBe(SCATTERPLOT_TIME_FEATURE.value);
      expect(result.current.scatterYAxis).toBe(SCATTERPLOT_TIME_FEATURE.value);
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
});
