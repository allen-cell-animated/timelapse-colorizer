import { describe, expect, it } from "vitest";

import {
  isUrl,
  isJson,
  paramsToUrlQueryString,
  loadParamsFromUrlQueryString,
  UrlParams,
  isAllenPath,
} from "../src/colorizer/utils/url_utils";
import { DEFAULT_COLOR_RAMPS, MAX_FEATURE_CATEGORIES } from "../src/constants";

function padCategories(categories: boolean[]) {
  const result = [...categories];
  while (result.length < MAX_FEATURE_CATEGORIES) {
    result.push(false);
  }
  return result;
}

const stateWithNonLatinCharacters: [Partial<UrlParams>, string] = [
  {
    collection: "https://some-url.com/collection.json", // https%3A%2F%2Fsome-url.com%2Fcollection.json
    dataset: "你好世界", // %E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C
    feature: "Привет, мир", // %D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20%D0%BC%D0%B8%D1%80
  },
  // Expected query string:
  "?collection=https%3A%2F%2Fsome-url.com%2Fcollection.json" +
    "&dataset=%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C" +
    "&feature=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20%D0%BC%D0%B8%D1%80",
];

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

describe("paramsToUrlQueryString", () => {
  it("Handles null/undefined values", () => {
    const result = paramsToUrlQueryString({});
    expect(result).to.be.empty;
  });

  it("Encodes URI components", () => {
    const result = paramsToUrlQueryString(stateWithNonLatinCharacters[0]);
    // The dataset and feature say "Hello World" in Mandarin and Russian in case you're curious.
    expect(result).to.equal(stateWithNonLatinCharacters[1]);
  });
});

describe("loadParamsFromUrlQueryString", () => {
  it("Handles empty query strings", () => {
    const result = loadParamsFromUrlQueryString("");
    expect(result).to.deep.equal({});
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
  it("Encodes + Decodes URL strings", () => {
    const originalParams = stateWithNonLatinCharacters[0];
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Saves and retrieves URL params correctly", () => {
    // This will need to be updated for any new URL params.
    // The use of `Required` makes sure that we don't forget to update this test :)
    const originalParams: Required<UrlParams> = {
      collection: "collection",
      dataset: "dataset",
      feature: "feature",
      track: 25,
      time: 14,
      thresholds: [
        { featureName: "f1", units: "m", categorical: false, min: 0, max: 0 },
        { featureName: "f2", units: "um", categorical: false, min: NaN, max: NaN },
        { featureName: "f3", units: "km", categorical: false, min: 0, max: 1 },
        { featureName: "f4", units: "mm", categorical: false, min: 0.501, max: 1000.485 },
        {
          featureName: "f5",
          units: "",
          categorical: true,
          enabledCategories: [true, true, true, true, true, true, true, true, true, true, true, true],
        },
        {
          featureName: "f6",
          units: "",
          categorical: true,
          enabledCategories: [true, false, false, false, true, false, false, false, false, false, false, false],
        },
      ],
      range: [21.433, 89.4],
      colorRampKey: "myMap-1",
      colorRampReversed: true,
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Handles feature threshold names with potentially illegal characters", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature,,,", units: ",m,", categorical: false, min: 0, max: 1 },
        { featureName: "(feature)", units: "(m)", categorical: false, min: 0, max: 1 },
        { featureName: "feat:ure", units: ":m", categorical: false, min: 0, max: 1 },
        {
          featureName: "0.0%",
          units: "m&m's",
          categorical: true,
          enabledCategories: padCategories([true, false, false]),
        },
      ],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Enforces min/max on range and thresholds", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature1", units: "m", categorical: false, min: 1, max: 0 },
        { featureName: "feature2", units: "m", categorical: false, min: 12, max: -34 },
        { featureName: "feature3", units: "m", categorical: false, min: 0.5, max: 0.25 },
      ],
      range: [1, 0],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);

    expect(parsedParams.thresholds).deep.equals([
      { featureName: "feature1", units: "m", categorical: false, min: 0, max: 1 },
      { featureName: "feature2", units: "m", categorical: false, min: -34, max: 12 },
      { featureName: "feature3", units: "m", categorical: false, min: 0.25, max: 0.5 },
    ]);
    expect(parsedParams.range).deep.equals([0, 1]);
  });

  it("Handles empty feature thresholds", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [{ featureName: "feature1", units: "", categorical: false, min: 0, max: 1 }],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams.thresholds).deep.equals(originalParams.thresholds);
  });

  it("Handles zero values for numeric parameters", () => {
    const originalParams: Partial<UrlParams> = {
      time: 0,
      track: 0,
      range: [0, 0],
      thresholds: [{ featureName: "feature", units: "", categorical: false, min: 0, max: 0 }],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Handles less than the maximum expected thresholds", () => {
    throw new Error("Test not implemented");
  });

  it("Handles more than the maximum expected thresholds", () => {
    throw new Error("Test not implemented");
  });

  it("Handles all color map names", () => {
    // Test all color ramp names to make sure they can be safely sent through the URL.
    for (const key of DEFAULT_COLOR_RAMPS.keys()) {
      const params: Partial<UrlParams> = { colorRampKey: key };
      let parsedParams = loadParamsFromUrlQueryString(paramsToUrlQueryString(params));
      expect(parsedParams).deep.equals(params);

      // Reversed
      params.colorRampReversed = true;
      parsedParams = loadParamsFromUrlQueryString(paramsToUrlQueryString(params));
      expect(parsedParams).deep.equals(params);
    }
  });
});
