import { describe, expect, it } from "vitest";

import {
  decodeUrlAndRemoveHashRouting,
  decodeUrlQueryStringPath,
  encodeGitHubPagesUrl,
  encodeUrlPathAsQueryString,
} from "../src/utils/gh_routing";

describe("Route utils", () => {
  describe("convertUrlToQueryStringPath", () => {
    it("converts paths to query string", () => {
      const url = new URL("https://www.example.com/one/two");
      const convertedUrl = encodeUrlPathAsQueryString(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two");
    });

    it("handles extra slashes", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl = encodeUrlPathAsQueryString(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two/");
    });

    it("handles original query params and hashes", () => {
      const url = new URL("https://www.example.com/one/two?a=0&b=1#hash");
      const convertedUrl = encodeUrlPathAsQueryString(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two&a=0~and~b=1#hash");
    });

    it("handles base path segments", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl1 = encodeUrlPathAsQueryString(url, 1);
      expect(convertedUrl1.toString()).toEqual("https://www.example.com/one/?/two/");

      const convertedUrl2 = encodeUrlPathAsQueryString(url, 2);
      expect(convertedUrl2.toString()).toEqual("https://www.example.com/one/two/?/");
    });
  });

  describe("convertQueryStringPathToUrl", () => {
    it("returns original url", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl = encodeUrlPathAsQueryString(url, 0);
      const restoredUrl = decodeUrlQueryStringPath(convertedUrl);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("ignores normal urls", () => {
      const url = new URL("https://www.example.com/one/two/");
      const restoredUrl = decodeUrlQueryStringPath(url);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("ignores normal urls with query parameters", () => {
      const url = new URL("https://www.example.com/one/two/?a=0");
      const restoredUrl = decodeUrlQueryStringPath(url);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("handles converted query params and hashes", () => {
      const url = new URL("https://www.example.com/one/two?a=0&b=1#hash");
      const convertedUrl = encodeUrlPathAsQueryString(url, 0);
      const restoredUrl = decodeUrlQueryStringPath(convertedUrl);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });
  });

  describe("URL encoding and decoding", () => {
    function testUrlEncodingAndDecoding(urls: string[][]): void {
      for (const [input, encoded, decoded] of urls) {
        const url = new URL(input);

        const encodedInput = encodeGitHubPagesUrl(url);
        expect(encodedInput.toString()).toEqual(encoded);
        expect(decodeUrlAndRemoveHashRouting(encodedInput).toString()).toEqual(decoded);
      }
    }

    it("handles basic viewer links", () => {
      testUrlEncodingAndDecoding([
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer?collection=https://example.com/collection.json",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/viewer&collection=https://example.com/collection.json",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer?collection=https://example.com/collection.json",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer?collection=https://example.com/collection.json&dataset=example",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/viewer&collection=https://example.com/collection.json~and~dataset=example",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer?collection=https://example.com/collection.json&dataset=example",
        ],
      ]);
    });

    it("removes hash routing", () => {
      testUrlEncodingAndDecoding([
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/#/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/#/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/main/#/viewer?url=https://example.com",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/#/viewer?url=https://example.com",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/viewer?url=https://example.com",
        ],
      ]);
    });

    it("reroutes from main to root", () => {
      testUrlEncodingAndDecoding([
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/main/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/main",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/?/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/",
        ],
      ]);
    });

    it("keeps pr-preview basepaths", () => {
      testUrlEncodingAndDecoding([
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/?/",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/?/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/viewer",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/#/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/?/#/viewer",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/viewer",
        ],
        [
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/#/viewer?collection=https://example.com/collection.json&dataset=example",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/?/#/viewer?collection=https://example.com/collection.json&dataset=example",
          "https://allen-cell-animated.github.io/nucmorph-colorizer/pr-preview/pr-100/viewer?collection=https://example.com/collection.json&dataset=example",
        ],
      ]);
    });

    it("handles hash removal when decoding dev server links", () => {
      const urlsToTest = [
        ["https://example-server.com/nucmorph-colorizer/", "https://example-server.com/nucmorph-colorizer/"],
        [
          "https://example-server.com/nucmorph-colorizer/#/viewer",
          "https://example-server.com/nucmorph-colorizer/viewer",
        ],
        [
          "https://example-server.com/nucmorph-colorizer/#/viewer?collection=https://example.com/collection.json&dataset=example",
          "https://example-server.com/nucmorph-colorizer/viewer?collection=https://example.com/collection.json&dataset=example",
        ],
      ];

      for (const [input, expected] of urlsToTest) {
        const url = new URL(input);
        expect(decodeUrlAndRemoveHashRouting(url).toString()).toEqual(expected);
      }
    });
  });
});
