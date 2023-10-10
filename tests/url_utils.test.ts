import { describe, expect, it } from "vitest";

import { isUrl, isJson, stateToUrlParamString } from "../src/colorizer/utils/url_utils";
import { DEFAULT_COLLECTION_FILENAME, DEFAULT_COLLECTION_PATH } from "../src/constants/url";

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

describe("stateToUrlParamString", () => {
  it("Handles null values", () => {
    const result = stateToUrlParamString({});
    expect(result).to.be.empty;
  });

  it("Ignores default collections", () => {
    let result = stateToUrlParamString({ collection: DEFAULT_COLLECTION_PATH });
    expect(result).to.be.empty;

    result = stateToUrlParamString({
      collection: DEFAULT_COLLECTION_PATH + "/" + DEFAULT_COLLECTION_FILENAME,
    });
    expect(result).to.be.empty;
  });

  it("Ignores bad time values", () => {
    const result = stateToUrlParamString({ time: -56 });
    expect(result).to.be.empty;
  });

  it("Encodes URI components", () => {
    const result = stateToUrlParamString({
      collection: "https://some-url.com/collection.json", // https%3A%2F%2Fsome-url.com%2Fcollection.json
      dataset: "你好世界", // %E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C
      feature: "Привет, мир", // %D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20%D0%BC%D0%B8%D1%80
    });
    // The dataset and feature say "Hello World" in Mandarin and Russian in case you're curious.
    expect(result).to.equal(
      "?collection=https%3A%2F%2Fsome-url.com%2Fcollection.json" +
        "&dataset=%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C" +
        "&feature=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20%D0%BC%D0%B8%D1%80"
    );
  });

  it("Ignores bad track values", () => {
    const result = stateToUrlParamString({ time: -56 });
    expect(result).to.be.empty;
  });

  it("Gets URL parameters", () => {
    const result = stateToUrlParamString({
      collection: "collection",
      dataset: "dataset",
      feature: "feature",
      track: 25,
      time: 14,
    });
    expect(result).to.equal("?collection=collection&dataset=dataset&feature=feature&track=25&t=14");
  });
});
