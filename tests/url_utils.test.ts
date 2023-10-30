import { describe, expect, it } from "vitest";

import {
  isUrl,
  isJson,
  stateToUrlQueryString,
  loadParamsFromUrlQueryString,
  UrlParams,
} from "../src/colorizer/utils/url_utils";

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

describe("stateToUrlQueryString", () => {
  it("Handles null/undefined values", () => {
    const result = stateToUrlQueryString({});
    expect(result).to.be.empty;
  });

  it("Encodes URI components", () => {
    const result = stateToUrlQueryString(stateWithNonLatinCharacters[0]);
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

describe("Loading + saving from URL query strings", () => {
  it("Encodes + Decodes URL strings", () => {
    const originalParams = stateWithNonLatinCharacters[0];
    const queryString = stateToUrlQueryString(originalParams);
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
        { featureName: "f1", min: 0, max: 0 },
        { featureName: "f2", min: NaN, max: NaN },
        { featureName: "f3", min: 0, max: 1 },
        { featureName: "f4", min: 0.501, max: 1000.485 },
      ],
      range: [21.433, 89.4],
    };
    const queryString = stateToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Handles feature threshold names with potentially illegal characters", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature,,,", min: 0, max: 1 },
        { featureName: "(feature)", min: 0, max: 1 },
        { featureName: "feat:ure", min: 0, max: 1 },
        { featureName: "0.0%", min: 0.0, max: 1 },
      ],
    };
    const queryString = stateToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Enforces min/max on range and thresholds", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature1", min: 1, max: 0 },
        { featureName: "feature2", min: 12, max: -34 },
        { featureName: "feature3", min: 0.5, max: 0.25 },
      ],
      range: [1, 0],
    };
    const queryString = stateToUrlQueryString(originalParams);
    const parsedParams = loadParamsFromUrlQueryString(queryString);

    expect(parsedParams.thresholds).deep.equals([
      { featureName: "feature1", min: 0, max: 1 },
      { featureName: "feature2", min: -34, max: 12 },
      { featureName: "feature3", min: 0.25, max: 0.5 },
    ]);
    expect(parsedParams.range).deep.equals([0, 1]);
  });

  it("Handles zero values for numeric parameters", () => {
    const originalParams: Partial<UrlParams> = {
      time: 0,
      track: 0,
      range: [0, 0],
      thresholds: [{ featureName: "feature", min: 0, max: 0 }],
    };
    const queryString = stateToUrlQueryString(originalParams);
    console.log(queryString);
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });
});
