import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureThreshold, ThresholdType } from "../../../src/colorizer";
import { validateThresholds } from "../../../src/colorizer/utils/data_utils";
import { UrlParam } from "../../../src/colorizer/utils/url_utils";
import { loadThresholdSliceFromParams, serializeThresholdSlice } from "../../../src/state/slices";
import { MOCK_DATASET, MockFeatureKeys } from "./constants";
import { setDatasetAsync } from "./utils";

import Collection from "../../../src/colorizer/Collection";
import { useViewerStateStore } from "../../../src/state/ViewerState";

const OUTDATED_THRESHOLDS: FeatureThreshold[] = [
  // Will be changed to numeric
  {
    featureKey: MockFeatureKeys.FEATURE1,
    unit: "meters",
    type: ThresholdType.CATEGORICAL,
    enabledCategories: [true, false],
  },
  { featureKey: MockFeatureKeys.FEATURE2, unit: "(m)", type: ThresholdType.NUMERIC, min: 24, max: 60 },
  // Will be changed to categorical
  { featureKey: MockFeatureKeys.FEATURE3, unit: "", type: ThresholdType.NUMERIC, min: 0, max: 1 },
];

const VALIDATED_THRESHOLDS = validateThresholds(MOCK_DATASET, OUTDATED_THRESHOLDS);
const EXPECTED_IN_RANGE_LUT = new Uint8Array([0, 0, 0, 1, 1, 1, 1, 0, 0]);
const EXPECTED_IN_RANGE_LUT_NO_THRESHOLD = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1]);

const DEFAULT_THRESHOLDS: FeatureThreshold[] = [
  { featureKey: MockFeatureKeys.FEATURE1, unit: "meters", type: ThresholdType.NUMERIC, min: 0, max: 1 },
  { featureKey: MockFeatureKeys.FEATURE2, unit: "(m)", type: ThresholdType.NUMERIC, min: 24, max: 60 },
  {
    featureKey: MockFeatureKeys.FEATURE3,
    unit: "",
    type: ThresholdType.CATEGORICAL,
    enabledCategories: [true, true, true, false, false, false, true, true, true, false, false, false],
  },
];
const DEFAULT_THRESHOLDS_SERIALIZED = "feature1:meters:0:1,feature2:(m):24:60,feature3::1c7";

describe("ThresholdSlice", () => {
  describe("setThresholds", () => {
    it("sets the thresholds", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(OUTDATED_THRESHOLDS);
      });
      expect(result.current.thresholds).to.deep.equal(OUTDATED_THRESHOLDS);
    });

    it("sets and validates thresholds when Dataset is set", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(OUTDATED_THRESHOLDS);
      });
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.thresholds).to.deep.equal(VALIDATED_THRESHOLDS);
    });
  });

  it("clears threshold on collections change", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setThresholds(OUTDATED_THRESHOLDS);
    });
    expect(result.current.thresholds).to.deep.equal(OUTDATED_THRESHOLDS);
    act(() => {
      // TODO: Replace with actual Collection
      result.current.setCollection({} as unknown as Collection);
    });
    expect(result.current.thresholds).to.deep.equal([]);
  });

  it("validates thresholds on dataset change", async () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setThresholds(OUTDATED_THRESHOLDS);
    });
    expect(result.current.thresholds).to.deep.equal(OUTDATED_THRESHOLDS);
    await setDatasetAsync(result, MOCK_DATASET);
    expect(result.current.thresholds).to.deep.equal(VALIDATED_THRESHOLDS);
  });

  describe("inRangeLUT", () => {
    it("sets default inRangeLUT if dataset is not set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(result.current.inRangeLUT).to.deep.equal(new Uint8Array(0));
      act(() => {
        result.current.setThresholds(OUTDATED_THRESHOLDS);
      });
      expect(result.current.inRangeLUT).to.deep.equal(new Uint8Array(0));
    });

    it("updates inRangeLUT on threshold change", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.inRangeLUT).to.deep.equal(EXPECTED_IN_RANGE_LUT_NO_THRESHOLD);
      act(() => {
        result.current.setThresholds(VALIDATED_THRESHOLDS);
      });
      expect(result.current.inRangeLUT).to.deep.equal(EXPECTED_IN_RANGE_LUT);
    });

    it("updates inRangeLUT on dataset change", async () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(VALIDATED_THRESHOLDS);
      });
      expect(result.current.inRangeLUT).to.deep.equal(new Uint8Array(0));
      await setDatasetAsync(result, MOCK_DATASET);
      expect(result.current.inRangeLUT).to.deep.equal(EXPECTED_IN_RANGE_LUT);
    });
  });

  describe("serializeThresholdSlice", () => {
    it("serializes thresholds", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(DEFAULT_THRESHOLDS);
      });
      expect(result.current.thresholds).to.deep.equal(DEFAULT_THRESHOLDS);
      const serialized = serializeThresholdSlice(result.current);
      expect(serialized).to.deep.equal({ [UrlParam.THRESHOLDS]: DEFAULT_THRESHOLDS_SERIALIZED });
    });
  });

  describe("loadThresholdSliceFromParams", () => {
    it("deserializes thresholds", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.THRESHOLDS, DEFAULT_THRESHOLDS_SERIALIZED);
      act(() => {
        result.current.setThresholds([]);
        loadThresholdSliceFromParams(result.current, params);
      });
      expect(result.current.thresholds).to.deep.equal(DEFAULT_THRESHOLDS);
    });

    it("ignores bad data", () => {
      const { result } = renderHook(() => useViewerStateStore());
      const params = new URLSearchParams();
      params.set(UrlParam.THRESHOLDS, "bad-threshold");
      act(() => {
        result.current.setThresholds([]);
        loadThresholdSliceFromParams(result.current, params);
      });
      expect(result.current.thresholds).to.deep.equal([]);
    });
  });
});
