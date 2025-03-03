import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureThreshold, ThresholdType } from "../../../src/colorizer";
import { validateThresholds } from "../../../src/colorizer/utils/data_utils";
import { MOCK_DATASET, MockFeatureKeys } from "./constants";

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

describe("ThresholdSlice", () => {
  describe("setThresholds", () => {
    it("sets the thresholds", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(OUTDATED_THRESHOLDS);
      });
      expect(result.current.thresholds).to.deep.equal(OUTDATED_THRESHOLDS);
    });

    it("sets and validates thresholds when Dataset is set", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setDataset("some-dataset", MOCK_DATASET);
        result.current.setThresholds(OUTDATED_THRESHOLDS);
      });
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

  it("validates thresholds on dataset change", () => {
    const { result } = renderHook(() => useViewerStateStore());
    act(() => {
      result.current.setThresholds(OUTDATED_THRESHOLDS);
    });
    expect(result.current.thresholds).to.deep.equal(OUTDATED_THRESHOLDS);
    act(() => {
      result.current.setDataset("some-dataset", MOCK_DATASET);
    });
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

    it("updates inRangeLUT on threshold change", () => {
      const { result } = renderHook(() => useViewerStateStore());
      expect(result.current.inRangeLUT).to.deep.equal(new Uint8Array(0));
      act(() => {
        result.current.setDataset("some-dataset", MOCK_DATASET);
        result.current.setThresholds(VALIDATED_THRESHOLDS);
      });
      expect(result.current.inRangeLUT).to.deep.equal(EXPECTED_IN_RANGE_LUT);
    });

    it("updates inRangeLUT on dataset change", () => {
      const { result } = renderHook(() => useViewerStateStore());
      act(() => {
        result.current.setThresholds(VALIDATED_THRESHOLDS);
      });
      expect(result.current.inRangeLUT).to.deep.equal(new Uint8Array(0));

      // Set dataset
      act(() => {
        result.current.setDataset("some-dataset", MOCK_DATASET);
      });
      expect(result.current.inRangeLUT).to.deep.equal(EXPECTED_IN_RANGE_LUT);
    });
  });
});
