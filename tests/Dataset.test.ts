import { assert, describe, expect, it } from "vitest";
import Dataset, { DatasetManifest } from "../src/colorizer/Dataset";
import { fetchWithTimeout } from "../src/colorizer/utils/url_utils";
import { ArraySource, IArrayLoader, ImageFrameLoader } from "../src/colorizer";
import { Texture } from "three";
import { FeatureDataType, FeatureArrayType, featureTypeSpecs } from "../src/colorizer/types";

describe("Dataset", () => {
  const defaultDatasetManifest: DatasetManifest = {
    frames: ["frame0.json"],
    features: { feature1: "feature1.json", feature2: "feature2.json", feature3: "feature3.json" },
    featureMetadata: {
      feature1: { units: "meters" },
      feature2: { units: "(m)" },
      feature3: { units: "μm/s" },
    },
  };

  const defaultPath = "https://some-path.json";
  const makeMockFetchMethod = (
    url: string,
    manifestJson: DatasetManifest
  ): ((url: string) => Promise<DatasetManifest>) => {
    return async (inputUrl: string): Promise<DatasetManifest> => {
      if (inputUrl !== url) {
        throw new Error(`Input url '${inputUrl}' does not match expected url '${url}'.`);
      }
      return Promise.resolve(manifestJson);
    };
  };

  class MockArraySource implements ArraySource {
    getBuffer<T extends FeatureDataType>(type: T): FeatureArrayType[T] {
      return new featureTypeSpecs[type].ArrayConstructor([]);
    }
    getTexture(_type: FeatureDataType): Texture {
      return new Texture();
    }
    getMin(): number {
      return 0;
    }
    getMax(): number {
      return 1;
    }
  }

  class MockArrayLoader implements IArrayLoader {
    load(_url: string): Promise<ArraySource> {
      return Promise.resolve(new MockArraySource());
    }
  }

  it("retrieves feature metadata", async () => {
    const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
    const mockFetch = makeMockFetchMethod(defaultPath, defaultDatasetManifest);
    await dataset.open(mockFetch);

    expect(dataset.featureHasUnits("feature1")).to.be.true;
    expect(dataset.featureHasUnits("feature2")).to.be.true;
    expect(dataset.featureHasUnits("feature3")).to.be.true;

    expect(dataset.getFeatureUnits("feature1")).to.equal("meters");
    expect(dataset.getFeatureUnits("feature2")).to.equal("(m)");
    expect(dataset.getFeatureUnits("feature3")).to.equal("μm/s");
  });

  it("detects units automatically from feature names", async () => {
    const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
    const manifest = defaultDatasetManifest;
    manifest.featureMetadata = undefined;
    manifest.features = {
      "feature1 (cat)": "feature1.json",
      "feature2 (copy) nounits": "feature2.json",
      "feature3 (μm/s(1))": "feature3.json",
    };
    const mockFetch = makeMockFetchMethod(defaultPath, defaultDatasetManifest);
    await dataset.open(mockFetch);

    expect(dataset.featureHasUnits("feature1")).to.be.true;
    expect(dataset.featureHasUnits("feature2")).to.be.false;
    expect(dataset.featureHasUnits("feature3")).to.be.true;

    expect(dataset.getFeatureUnits("feature1")).to.equal("cat");
    expect(dataset.getFeatureUnits("feature2")).to.be.undefined;
    expect(dataset.getFeatureUnits("feature3")).to.equal("μm/s(1)");
  });

  it("overrides detected feature units if units are provided", async () => {
    const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
    const manifest = defaultDatasetManifest;
    manifest.featureMetadata = {
      "feature1 (m)": { units: "meters" },
      feature2: { units: "sq. meters" },
      "feature3 (μm/s(1))": { units: "" },
      "feature4 (unit)": { units: null },
    };
    manifest.features = {
      "feature1 (m)": "feature1.json",
      feature2: "feature2.json",
      "feature3 (μm/s(1))": "feature3.json",
      "feature4 (unit)": "feature4.json",
    };
    const mockFetch = makeMockFetchMethod(defaultPath, defaultDatasetManifest);
    await dataset.open(mockFetch);

    expect(dataset.featureNames.includes("feature1 (m)")).to.be.true;
    expect(dataset.featureNames.includes("feature2")).to.be.true;
    expect(dataset.featureNames.includes("feature3 (μm/s(1))")).to.be.true;
    expect(dataset.featureNames.includes("feature4 (unit)")).to.be.true;

    expect(dataset.featureHasUnits("feature1 (m)")).to.be.true;
    expect(dataset.featureHasUnits("feature2")).to.be.true;
    // Should not strip out label if there is a unit override provided
    expect(dataset.featureHasUnits("feature3 (μm/s(1))")).to.be.true;
    expect(dataset.featureHasUnits("feature4 (unit)")).to.be.false;

    expect(dataset.getFeatureUnits("feature1 (m)")).to.equal("meters");
    expect(dataset.getFeatureUnits("feature2")).to.equal("sq. meters");
    expect(dataset.getFeatureUnits("feature3 (μm/s(1))")).to.equal("");
    expect(dataset.getFeatureUnits("feature4 (unit)")).to.be.undefined;
  });
});
