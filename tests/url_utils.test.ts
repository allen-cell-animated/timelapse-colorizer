import { describe, expect, it } from "vitest";

import * as urlUtils from "../src/colorizer/utils/url_utils";

const ANY_ERROR = /[.]*/;

function makeDummyFetchMethod(validUrl: string, bodyJson: any): typeof urlUtils.fetchWithTimeout {
  const response: Response = {
    headers: new Headers(),
    ok: true,
    redirected: false,
    status: 200,
    statusText: "OK",
    url: validUrl,
    type: "cors",
    body: bodyJson.toString(),
    clone: function (): Response {
      throw new Error("Function not implemented.");
    },
    bodyUsed: false,
    arrayBuffer: function (): Promise<ArrayBuffer> {
      throw new Error("Function not implemented.");
    },
    blob: function (): Promise<Blob> {
      throw new Error("Function not implemented.");
    },
    formData: function (): Promise<FormData> {
      throw new Error("Function not implemented.");
    },
    json: function (): Promise<any> {
      const dummyAsync = async (): Promise<any> => {
        return bodyJson;
      };
      return dummyAsync();
    },
    text: function (): Promise<string> {
      throw new Error("Function not implemented.");
    },
  };
  return (url: string, _timeoutMs?: number, _options?: Object) => {
    if (url === validUrl) {
      const resolve = async (): Promise<Response> => {
        return response;
      };
      return resolve();
    }

    return new Promise((_resolve, reject) => {
      reject("Failed to fetch due to incorrect url.");
    });
  };
}

const defaultCollection: urlUtils.CollectionData = new Map([
  ["d1", { path: "some-path", name: "dataset1" }],
  ["d2", { path: "some-path", name: "dataset2" }],
  ["d3", { path: "some-path", name: "dataset3" }],
]);

describe("isUrl", () => {
  it("Can differentiate URLs", () => {
    expect(urlUtils.isUrl("http://some-url.com/")).to.be.true;
    expect(urlUtils.isUrl("https://some-url.com/")).to.be.true;

    expect(urlUtils.isUrl("//resources/some/resource/path")).to.be.true;

    expect(urlUtils.isUrl("C:/Users/http://")).to.be.false;
    expect(urlUtils.isUrl("notaurl")).to.be.false;
  });
});

describe("stateToUrlParamString", () => {
  it("Handles null values", () => {
    const result = urlUtils.stateToUrlParamString({});
    expect(result).to.be.empty;
  });

  it("Ignores default collections", () => {
    let result = urlUtils.stateToUrlParamString({ collection: urlUtils.DEFAULT_COLLECTION_PATH });
    expect(result).to.be.empty;

    result = urlUtils.stateToUrlParamString({
      collection: urlUtils.DEFAULT_COLLECTION_PATH + "/" + urlUtils.DEFAULT_COLLECTION_FILENAME,
    });
    expect(result).to.be.empty;
  });

  it("Ignores bad time values", () => {
    const result = urlUtils.stateToUrlParamString({ time: -56 });
    expect(result).to.be.empty;
  });

  it("Encodes URI components", () => {
    const result = urlUtils.stateToUrlParamString({
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
    const result = urlUtils.stateToUrlParamString({ time: -56 });
    expect(result).to.be.empty;
  });

  it("Gets URL parameters", () => {
    const result = urlUtils.stateToUrlParamString({
      collection: "collection",
      dataset: "dataset",
      feature: "feature",
      track: 25,
      time: 14,
    });
    expect(result).to.equal("?collection=collection&dataset=dataset&feature=feature&track=25&t=14");
  });
});

describe("getCollectionData", () => {
  it("Uses default path when no collection is provided", async () => {
    const url = urlUtils.DEFAULT_COLLECTION_PATH + "/" + urlUtils.DEFAULT_COLLECTION_FILENAME;
    const fetchMethod = makeDummyFetchMethod(url, [{ name: "dataset", path: "some-path" }]);
    const result = await urlUtils.getCollectionData(null, fetchMethod);

    expect(result.size).to.equal(1);
  });

  it("Throws an error with a bad url", async () => {
    const fetchMethod = makeDummyFetchMethod("", []);
    await expect(urlUtils.getCollectionData("bad", fetchMethod)).rejects.toThrow(ANY_ERROR);
  });

  it("Uses the default collection filename when no JSON is provided", async () => {
    const url = "https://some-url.com";
    const fetchMethod = makeDummyFetchMethod(url + "/" + urlUtils.DEFAULT_COLLECTION_FILENAME, []);
    const result = await urlUtils.getCollectionData(url, fetchMethod);
    expect(Array.from(result.keys()).length).to.equal(0);
  });
});

describe("getDefaultDatasetName", () => {
  it("Throws an error for empty collections", () => {
    // allow any error message as long as it throws
    expect(() => urlUtils.getDefaultDatasetName(new Map())).toThrowError(ANY_ERROR);
  });

  it("Returns the first key in a collection", () => {
    expect(urlUtils.getDefaultDatasetName(defaultCollection)).to.equal("dataset1");
  });
});

// TODO: getDatasetPathFromCollection (will be refactored soon)

describe("getDatasetNames", () => {
  it("Returns empty array when only null arguments given", () => {
    expect(urlUtils.getDatasetNames(null, null).length).to.equal(0);
  });

  it("Returns array with dataset only if no collection given", () => {
    const datasetName = "dataset";
    const result = urlUtils.getDatasetNames(datasetName, null);
    expect(result.length).to.equal(1);
    expect(result[0]).to.equal(datasetName);
  });

  it("Returns collection keys if collection provided.", () => {
    const result = urlUtils.getDatasetNames(null, defaultCollection);
    expect(result.length).to.equal(defaultCollection.size);
    expect(result).to.deep.equal(Array.from(defaultCollection.keys()));
  });
});
