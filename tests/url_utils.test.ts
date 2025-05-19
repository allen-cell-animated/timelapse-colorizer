import { describe, expect, it } from "vitest";

import { FeatureThreshold, ThresholdType } from "../src/colorizer/types";
import {
  deserializeThresholds,
  isAllenPath,
  isHexColor,
  isJson,
  isUrl,
  serializeThresholds,
} from "../src/colorizer/utils/url_utils";
import { MAX_FEATURE_CATEGORIES } from "../src/constants";

function padCategories(categories: boolean[]): boolean[] {
  const result = [...categories];
  while (result.length < MAX_FEATURE_CATEGORIES) {
    result.push(false);
  }
  return result;
}

describe("isUrl", () => {
  it("Can differentiate URLs", () => {
    expect(isUrl("http://some-url.com/")).to.be.true;
    expect(isUrl("https://some-url.com/")).to.be.true;

    expect(isUrl("//resources/some/resource/path")).to.be.true;

    expect(isUrl("C:/Users/http://")).to.be.false;
    expect(isUrl("file.json")).to.be.false;
    expect(isUrl("notaurl")).to.be.false;
  });
});

describe("isJson", () => {
  it("Can differentiate JSONs", () => {
    expect(isJson("file.json")).to.be.true;
    expect(isJson("file")).to.be.false;

    expect(isJson("https://some-url.com/directory/a.json")).to.be.true;
    expect(isJson("https://some-url.com/directory.json/some/folder")).to.be.false;
  });
});

describe("isAllenPath", () => {
  it("Detects allen paths correctly", () => {
    expect(isAllenPath("/allen/some/resource")).to.be.true;
    expect(isAllenPath("/allen/another/resource")).to.be.true;
    expect(isAllenPath("/not-allen/")).to.be.false;
    expect(isAllenPath("/some-other-resource/allen/")).to.be.false;
  });

  it("Ignores URLs", () => {
    expect(isAllenPath("https://some-website.com/allen/another/resource")).to.be.false;
    expect(isAllenPath("http://allen/some-website.com")).to.be.false;
  });

  it("Normalizes slashes", () => {
    expect(isAllenPath("\\allen\\some-resource\\path.json")).to.be.true;
    expect(isAllenPath("\\\\allen\\\\some-resource\\\\path.json")).to.be.true;
    expect(isAllenPath("/allen//some-resource////path.json")).to.be.true;
    expect(isAllenPath("//allen//some-resource////path.json")).to.be.true;
  });
});

describe("Loading + saving from URL query strings", () => {
  describe("isHexColor", () => {
    it("Handles 3 character hex strings", () => {
      expect(isHexColor("#000")).to.be.true;
      expect(isHexColor("#fff")).to.be.true;
      expect(isHexColor("#ccc")).to.be.true;
    });

    it("Handles 6-character hex strings", () => {
      expect(isHexColor("#000000")).to.be.true;
      expect(isHexColor("#ffffff")).to.be.true;
      expect(isHexColor("#a0c8b0")).to.be.true;
    });

    it("Catches non-hex values", () => {
      expect(isHexColor("000000")).to.be.false;
      expect(isHexColor("gggggg")).to.be.false;
      expect(isHexColor("#44")).to.be.false;
      expect(isHexColor("some-bad-value")).to.be.false;
    });

    it("Ignores hex values with alpha", () => {
      expect(isHexColor("#aabbccdd")).to.be.false;
    });
  });

  describe("serializeThresholds / deserializeThresholds", () => {
    it("handles threshold data", () => {
      const thresholds: FeatureThreshold[] = [
        { featureKey: "f1", unit: "m", type: ThresholdType.NUMERIC, min: 0, max: 0 },
        { featureKey: "f2", unit: "um", type: ThresholdType.NUMERIC, min: NaN, max: NaN },
        { featureKey: "f3", unit: "km", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureKey: "f4", unit: "mm", type: ThresholdType.NUMERIC, min: 0.501, max: 1000.485 },
        {
          featureKey: "f5",
          unit: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, true, true, true, true, true, true, true, true, true, true, true],
        },
        {
          featureKey: "f6",
          unit: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, false, false, false, true, false, false, false, false, false, false, false],
        },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal("f1:m:0:0,f2:um:NaN:NaN,f3:km:0:1,f4:mm:0.501:1000.485,f5::fff,f6::11");
      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal(thresholds);
    });

    it("escapes feature threshold names and units", () => {
      const thresholds: FeatureThreshold[] = [
        { featureKey: "feature,,,", unit: ",m,", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureKey: "(feature)", unit: "(m)", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureKey: "feat:ure", unit: ":m", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        {
          featureKey: "0.0%",
          unit: "m&m's",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: padCategories([true, false, false]),
        },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal(
        "feature%2C%2C%2C:%2Cm%2C:0:1,(feature):(m):0:1,feat%3Aure:%3Am:0:1,0.0%25:m%26m's:1"
      );
      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal(thresholds);
    });

    it("orders min and max on thresholds", () => {
      const thresholds: FeatureThreshold[] = [
        { featureKey: "feature1", unit: "m", type: ThresholdType.NUMERIC, min: 1, max: 0 },
        { featureKey: "feature2", unit: "m", type: ThresholdType.NUMERIC, min: 12, max: -34 },
        { featureKey: "feature3", unit: "m", type: ThresholdType.NUMERIC, min: 0.5, max: 0.25 },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal("feature1:m:1:0,feature2:m:12:-34,feature3:m:0.500:0.250");

      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal([
        { featureKey: "feature1", unit: "m", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureKey: "feature2", unit: "m", type: ThresholdType.NUMERIC, min: -34, max: 12 },
        { featureKey: "feature3", unit: "m", type: ThresholdType.NUMERIC, min: 0.25, max: 0.5 },
      ]);
    });

    it("handles feature thresholds with empty units", () => {
      const thresholds: FeatureThreshold[] = [
        { featureKey: "feature1", unit: "", type: ThresholdType.NUMERIC, min: 0, max: 1 },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal("feature1::0:1");
      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal(thresholds);
    });

    it("handles categorical thresholds with fewer than expected categories", () => {
      const thresholds: FeatureThreshold[] = [
        { featureKey: "feature", unit: "", type: ThresholdType.CATEGORICAL, enabledCategories: [true, false, true] },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal("feature::5");
      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal([
        {
          featureKey: "feature",
          unit: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: padCategories([true, false, true]),
        },
      ]);
    });

    it("handles categorical thresholds with more than expected categories", () => {
      const enabledCategories = padCategories([true, true]);
      enabledCategories.push(true); // Add an extra category. This should be ignored
      const thresholds: FeatureThreshold[] = [
        { featureKey: "feature", unit: "", type: ThresholdType.CATEGORICAL, enabledCategories: enabledCategories },
      ];
      const serialized = serializeThresholds(thresholds);
      expect(serialized).to.equal("feature::1003");
      const deserialized = deserializeThresholds(serialized);
      expect(deserialized).to.deep.equal([
        {
          featureKey: "feature",
          unit: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: padCategories([true, true]),
        },
      ]);
    });
  });
});
