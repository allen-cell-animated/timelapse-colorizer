import { describe, expect, it } from "vitest";

import { LabelType } from "src/colorizer/AnnotationData";
import { type FeatureThreshold, ThresholdType } from "src/colorizer/types";
import {
  buildFrameToGlobalIdLookup,
  getIntervals,
  getKeyFromName,
  getLabelTypeFromParsedCsv,
  validateThresholds,
} from "src/colorizer/utils/data_utils";
import { makeMockDataset } from "tests/utils";

describe("data_utils", () => {
  describe("getKeyFromName", () => {
    it("handles empty strings", () => {
      expect(getKeyFromName("")).toBe("");
    });

    it("allows alphanumeric and underscore characters", () => {
      expect(getKeyFromName("a")).toBe("a");
      expect(getKeyFromName("_")).toBe("_");
      expect(getKeyFromName("az09")).toBe("az09");
      expect(getKeyFromName("a_b_c")).toBe("a_b_c");
      expect(getKeyFromName("abc_123")).toBe("abc_123");
    });

    it("sets alphabetic characters to lowercase", () => {
      expect(getKeyFromName("A")).toBe("a");
      expect(getKeyFromName("Z")).toBe("z");
      expect(getKeyFromName("ABCDEFG")).toBe("abcdefg");
    });

    it("replaces non-alphanumeric characters with underscores", () => {
      expect(getKeyFromName("+")).toBe("_");
      expect(getKeyFromName("...")).toBe("___");
      expect(getKeyFromName("Some Name (a)")).toBe("some_name__a_");
      expect(getKeyFromName("&Another Name%")).toBe("_another_name_");
    });
  });

  describe("validateThresholds", () => {
    it("replaces feature names with keys", async () => {
      // For backwards-compatibility, feature keys in thresholds can sometimes be feature names. These should
      // be detected if they match features in the dataset, and replaced with their corresonding feature keys.
      const dataset = await makeMockDataset({
        frames: ["frame0.json"],
        features: [
          { name: "Feature A", key: "feature_a", data: "feature1.json", unit: "", type: "discrete" },
          { name: "MY FEATURE B", key: "feature_b", data: "feature2.json", unit: "", type: "discrete" },
          {
            name: "My Feature C",
            key: "feature_c",
            data: "feature3.json",
            unit: "b",
            type: "continuous",
            categories: ["1", "2", "3"],
          },
        ],
      });

      const existingThresholds: FeatureThreshold[] = [
        {
          featureKey: "Feature A",
          unit: "",
          type: ThresholdType.NUMERIC,
          min: 0,
          max: 10,
        },
        {
          featureKey: "MY FEATURE B",
          unit: "",
          type: ThresholdType.NUMERIC,
          min: 0,
          max: 10,
        },
        {
          featureKey: "My Feature C",
          unit: "different_unit_and_wont_match",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, false, false],
        },
      ];

      const newThresholds = validateThresholds(dataset, existingThresholds);

      expect(newThresholds).to.deep.equal([
        {
          featureKey: "feature_a",
          unit: "",
          type: ThresholdType.NUMERIC,
          min: 0,
          max: 10,
        },
        {
          featureKey: "feature_b",
          unit: "",
          type: ThresholdType.NUMERIC,
          min: 0,
          max: 10,
        },
        // Ignores features that don't match the units of the dataset's feature
        {
          featureKey: "My Feature C",
          unit: "different_unit_and_wont_match",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, false, false],
        },
      ]);
    });
  });

  describe("getSubsetSubregions", () => {
    it("returns interval over whole range", () => {
      const values = [0, 1, 2, 3, 4, 5];
      expect(getIntervals(values)).deep.equals([[0, 5]]);
    });

    it("returns interval missing zero", () => {
      const values = [2, 3, 4, 5];
      expect(getIntervals(values)).deep.equals([[2, 5]]);
    });

    it("returns multiple intervals", () => {
      const values1 = [1, 3, 4, 5];
      expect(getIntervals(values1)).deep.equals([
        [1, 1],
        [3, 5],
      ]);

      const values2 = [5, 6, 7, 9, 10, 14];
      expect(getIntervals(values2)).deep.equals([
        [5, 7],
        [9, 10],
        [14, 14],
      ]);
    });
  });

  describe("buildFrameToGlobalIdLookup", () => {
    it("maps globally-unique segmentation ids to global ids", () => {
      const times = Uint32Array.from([0, 0, 0, 0, 0]);
      const segIds = Uint32Array.from([0, 1, 2, 3, 4]);
      const numFrames = 1;
      const frameToGlobalIdLookup = buildFrameToGlobalIdLookup(times, segIds, numFrames);
      expect(frameToGlobalIdLookup.size).to.equal(1);
      const lookup0 = frameToGlobalIdLookup.get(0);
      expect(lookup0).to.not.be.undefined;
      // Values will be offset by 1 so 0 represents missing data
      expect(lookup0?.lut).to.deep.equal(new Uint32Array([1, 2, 3, 4, 5]));
      expect(lookup0?.minSegId).to.equal(0);
    });

    it("maps globally-unique segmentation ids across multiple frames", () => {
      const times = Uint32Array.from([0, 0, 0, 0, 0, 2, 2, 2]);
      const segIds = Uint32Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
      const numFrames = 3;
      const frameToGlobalIdLookup = buildFrameToGlobalIdLookup(times, segIds, numFrames);
      expect(frameToGlobalIdLookup.size).to.equal(3);

      const lookup0 = frameToGlobalIdLookup.get(0);
      expect(lookup0?.lut).to.deep.equal(new Uint32Array([1, 2, 3, 4, 5]));
      expect(lookup0?.minSegId).to.equal(0);

      const lookup1 = frameToGlobalIdLookup.get(1);
      expect(lookup1?.lut).to.deep.equal(new Uint32Array([0]));
      expect(lookup1?.minSegId).to.equal(0);

      const lookup2 = frameToGlobalIdLookup.get(2);
      expect(lookup2?.lut).to.deep.equal(new Uint32Array([6, 7, 8]));
      expect(lookup2?.minSegId).to.equal(5);
    });

    it("maps non-unique segmentation ids across multiple frames", () => {
      const times = Uint32Array.from([0, 0, 0, 0, 2, 2, 2]);
      const segIds = Uint32Array.from([1, 2, 3, 4, 1, 2, 3]);
      const numFrames = 3;
      const frameToGlobalIdLookup = buildFrameToGlobalIdLookup(times, segIds, numFrames);
      expect(frameToGlobalIdLookup.size).to.equal(3);
      const lookup0 = frameToGlobalIdLookup.get(0);

      expect(lookup0?.lut).to.deep.equal(new Uint32Array([1, 2, 3, 4]));
      expect(lookup0?.minSegId).to.equal(1);

      const lookup1 = frameToGlobalIdLookup.get(1);
      expect(lookup1?.lut).to.deep.equal(new Uint32Array([0]));
      expect(lookup1?.minSegId).to.equal(0);

      const lookup2 = frameToGlobalIdLookup.get(2);
      expect(lookup2?.lut).to.deep.equal(new Uint32Array([5, 6, 7]));
      expect(lookup2?.minSegId).to.equal(1);
    });

    it("maps sparse segmentation ids", () => {
      const times = Uint32Array.from([0, 0, 0, 0, 1, 1]);
      const segIds = Uint32Array.from([1, 2, 4, 7, 3, 4]);
      const numFrames = 2;
      const frameToGlobalIdLookup = buildFrameToGlobalIdLookup(times, segIds, numFrames);
      expect(frameToGlobalIdLookup.size).to.equal(2);

      // lut[segId - minSegId] - 1 = index in original times/segIds arrays
      //                                        seg IDs:  1  2     4        7
      const lookup0 = frameToGlobalIdLookup.get(0);
      expect(lookup0?.lut).to.deep.equal(new Uint32Array([1, 2, 0, 3, 0, 0, 4]));
      expect(lookup0?.minSegId).to.equal(1);

      const lookup1 = frameToGlobalIdLookup.get(1);
      //                                        seg IDs:  3  4
      expect(lookup1?.lut).to.deep.equal(new Uint32Array([5, 6]));
      expect(lookup1?.minSegId).to.equal(3);
    });

    it("maps unsorted, non-unique segmentation ids", () => {
      const times = Uint32Array.from([0, 1, 0, 1, 0, 1]);
      const segIds = Uint32Array.from([4, 2, 3, 5, 1, 4]);
      // Time 0: 1, 3, 4
      // Time 1: 2, 4, 5
      const numFrames = 2;
      const frameToGlobalIdLookup = buildFrameToGlobalIdLookup(times, segIds, numFrames);
      expect(frameToGlobalIdLookup.size).to.equal(2);

      const lookup0 = frameToGlobalIdLookup.get(0);
      //                                        seg IDs:  1     3  4
      expect(lookup0?.lut).to.deep.equal(new Uint32Array([5, 0, 3, 1]));
      expect(lookup0?.minSegId).to.equal(1);

      const lookup1 = frameToGlobalIdLookup.get(1);
      //                                        seg IDs:  2     4  5
      expect(lookup1?.lut).to.deep.equal(new Uint32Array([2, 0, 6, 4]));
      expect(lookup1?.minSegId).to.equal(2);
    });
  });

  describe("getLabelTypeFromParsedCsv", () => {
    it("returns correct label types", () => {
      const headers = ["boolean", "integer", "custom"];
      const data = [
        { boolean: "true", integer: "1", custom: "some text" },
        { boolean: "false", integer: "2", custom: "some other text" },
      ];
      const result = getLabelTypeFromParsedCsv(headers, data);
      expect(result).to.deep.equal(
        new Map([
          ["boolean", LabelType.BOOLEAN],
          ["integer", LabelType.INTEGER],
          ["custom", LabelType.CUSTOM],
        ])
      );
    });

    it("handles gaps in data", () => {
      const headers = ["boolean", "integer", "custom"];
      const data: Record<string, string>[] = [
        { boolean: "true", integer: "1", custom: "some text" },
        { boolean: "", integer: "", custom: "" },
        {},
        { boolean: "false", integer: "2", custom: "some other text" },
      ];
      const result = getLabelTypeFromParsedCsv(headers, data);
      expect(result).to.deep.equal(
        new Map([
          ["boolean", LabelType.BOOLEAN],
          ["integer", LabelType.INTEGER],
          ["custom", LabelType.CUSTOM],
        ])
      );
    });

    it("treats decimal values as custom", () => {
      const headers = ["custom", "custom2"];
      const data = [{ custom: "1.0", custom2: "1.1" }];
      const result = getLabelTypeFromParsedCsv(headers, data);
      expect(result).to.deep.equal(
        new Map([
          ["custom", LabelType.CUSTOM],
          ["custom2", LabelType.CUSTOM],
        ])
      );
    });
  });
});
