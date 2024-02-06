import { describe, expect, it } from "vitest";

import {
  UrlParams,
  isAllenPath,
  isJson,
  isUrl,
  loadParamsFromUrlQueryString,
  paramsToUrlQueryString,
} from "../src/colorizer/utils/url_utils";
import { MAX_FEATURE_CATEGORIES } from "../src/constants";
import { ThresholdType } from "../src/colorizer/types";
import { DEFAULT_CATEGORICAL_PALETTES, DEFAULT_CATEGORICAL_PALETTE_ID, DEFAULT_COLOR_RAMPS } from "../src/colorizer";
import { Color, ColorRepresentation } from "three";

function padCategories(categories: boolean[]): boolean[] {
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
    expect(queryString).equals(stateWithNonLatinCharacters[1]);

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
        { featureName: "f1", units: "m", type: ThresholdType.NUMERIC, min: 0, max: 0 },
        { featureName: "f2", units: "um", type: ThresholdType.NUMERIC, min: NaN, max: NaN },
        { featureName: "f3", units: "km", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureName: "f4", units: "mm", type: ThresholdType.NUMERIC, min: 0.501, max: 1000.485 },
        {
          featureName: "f5",
          units: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, true, true, true, true, true, true, true, true, true, true, true],
        },
        {
          featureName: "f6",
          units: "",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: [true, false, false, false, true, false, false, false, false, false, false, false],
        },
      ],
      range: [21.433, 89.4],
      colorRampKey: "myMap-1",
      colorRampReversed: true,
      categoricalPalette: DEFAULT_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_ID)!.colors,
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString =
      "?collection=collection&dataset=dataset&feature=feature&track=25&t=14&filters=f1%3Am%3A0%3A0%2Cf2%3Aum%3ANaN%3ANaN%2Cf3%3Akm%3A0%3A1%2Cf4%3Amm%3A0.501%3A1000.485%2Cf5%3A%3Afff%2Cf6%3A%3A11&range=21.433%2C89.400&color=myMap-1!&palette-key=adobe";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Handles feature threshold names with nonstandard characters", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature,,,", units: ",m,", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureName: "(feature)", units: "(m)", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        { featureName: "feat:ure", units: ":m", type: ThresholdType.NUMERIC, min: 0, max: 1 },
        {
          featureName: "0.0%",
          units: "m&m's",
          type: ThresholdType.CATEGORICAL,
          enabledCategories: padCategories([true, false, false]),
        },
      ],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString =
      "?filters=feature%252C%252C%252C%3A%252Cm%252C%3A0%3A1%2C(feature)%3A(m)%3A0%3A1%2Cfeat%253Aure%3A%253Am%3A0%3A1%2C0.0%2525%3Am%2526m's%3A1";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Enforces min/max on range and thresholds", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature1", units: "m", type: ThresholdType.NUMERIC, min: 1, max: 0 },
        { featureName: "feature2", units: "m", type: ThresholdType.NUMERIC, min: 12, max: -34 },
        { featureName: "feature3", units: "m", type: ThresholdType.NUMERIC, min: 0.5, max: 0.25 },
      ],
      range: [1, 0],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString =
      "?filters=feature1%3Am%3A1%3A0%2Cfeature2%3Am%3A12%3A-34%2Cfeature3%3Am%3A0.500%3A0.250&range=1%2C0";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);

    expect(parsedParams.thresholds).deep.equals([
      { featureName: "feature1", units: "m", type: ThresholdType.NUMERIC, min: 0, max: 1 },
      { featureName: "feature2", units: "m", type: ThresholdType.NUMERIC, min: -34, max: 12 },
      { featureName: "feature3", units: "m", type: ThresholdType.NUMERIC, min: 0.25, max: 0.5 },
    ]);
    expect(parsedParams.range).deep.equals([0, 1]);
  });

  it("Handles empty feature thresholds", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [{ featureName: "feature1", units: "", type: ThresholdType.NUMERIC, min: 0, max: 1 }],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString = "?filters=feature1%3A%3A0%3A1";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams.thresholds).deep.equals(originalParams.thresholds);
  });

  it("Handles zero values for numeric parameters", () => {
    const originalParams: Partial<UrlParams> = {
      time: 0,
      track: 0,
      range: [0, 0],
      thresholds: [{ featureName: "feature", units: "", type: ThresholdType.NUMERIC, min: 0, max: 0 }],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString = "?track=0&t=0&filters=feature%3A%3A0%3A0&range=0%2C0";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(originalParams);
  });

  it("Handles less than the maximum expected categories", () => {
    const originalParams: Partial<UrlParams> = {
      thresholds: [{ featureName: "feature", units: "", type: ThresholdType.CATEGORICAL, enabledCategories: [true] }],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString = "?filters=feature%3A%3A1";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams.thresholds).deep.equals([
      {
        featureName: "feature",
        units: "",
        type: ThresholdType.CATEGORICAL,
        enabledCategories: padCategories([true]),
      },
    ]);
  });

  it("Handles more than the maximum expected categories", () => {
    const thresholds = padCategories([true, true]);
    thresholds.push(true); // Add an extra threshold. This should be ignored
    const originalParams: Partial<UrlParams> = {
      thresholds: [
        { featureName: "feature", units: "", type: ThresholdType.CATEGORICAL, enabledCategories: thresholds },
      ],
    };
    const queryString = paramsToUrlQueryString(originalParams);
    const expectedQueryString = "?filters=feature%3A%3A1003";
    expect(queryString).equals(expectedQueryString);

    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams.thresholds).deep.equals([
      {
        featureName: "feature",
        units: "",
        type: ThresholdType.CATEGORICAL,
        enabledCategories: padCategories([true, true]),
      },
    ]);
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

  it("Accepts keys for all palettes", () => {
    for (const data of DEFAULT_CATEGORICAL_PALETTES.values()) {
      const params: Partial<UrlParams> = { categoricalPalette: data.colors };
      const queryString = paramsToUrlQueryString(params);

      expect(queryString).to.equal(`?palette-key=${data.key}`);

      const parsedParams = loadParamsFromUrlQueryString(queryString);
      expect(parsedParams).deep.equals(params);
      expect(parsedParams.categoricalPalette).deep.equals(data.colors);
    }
  });

  it("Handles palette colors", () => {
    const hexColors: ColorRepresentation[] = [
      "#000000",
      "#000010",
      "#000020",
      "#000030",
      "#000040",
      "#000050",
      "#000060",
      "#000070",
      "#000080",
      "#000090",
      "#0000a0",
      "#0000b0",
    ];
    const colors = hexColors.map((color) => new Color(color));
    const params: Partial<UrlParams> = { categoricalPalette: colors };
    const queryString = paramsToUrlQueryString(params);
    expect(queryString).equals(
      "?palette=000000-000010-000020-000030-000040-000050-000060-000070-000080-000090-0000a0-0000b0"
    );
    const parsedParams = loadParamsFromUrlQueryString(queryString);
    expect(parsedParams).deep.equals(params);
  });

  it("Uses palette key instead of palette array when both are provided", () => {
    const queryString =
      "?palette-key=adobe&palette=000000-ff0000-00ff00-0000ff-000000-ff0000-00ff00-0000ff-000000-ff0000-00ff00-0000ff";
    const expectedParams = {
      categoricalPalette: DEFAULT_CATEGORICAL_PALETTES.get("adobe")?.colors,
    };
    expect(loadParamsFromUrlQueryString(queryString)).deep.equals(expectedParams);
  });

  it("Backfills missing palette colors", () => {
    const hexColors: ColorRepresentation[] = ["#000000", "#000010", "#000020", "#000030"];
    const colors = hexColors.map((color) => new Color(color));

    const params: Partial<UrlParams> = { categoricalPalette: colors };
    const queryString = paramsToUrlQueryString(params);
    expect(queryString).equals("?palette=000000-000010-000020-000030");
    const parsedParams = loadParamsFromUrlQueryString(queryString);

    const defaultColors = DEFAULT_CATEGORICAL_PALETTES.get("adobe")!.colors;
    const expectedColors = [...colors, ...defaultColors.slice(4)];
    expect(parsedParams).deep.equals({ categoricalPalette: expectedColors });
  });
});
