import { Texture } from "three";
import { describe, expect, it } from "vitest";
import { ArraySource, IArrayLoader } from "../src/colorizer";
import Dataset, { FeatureType } from "../src/colorizer/Dataset";
import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../src/colorizer/types";
import { ANY_ERROR } from "./test_utils";
import { MAX_FEATURE_CATEGORIES } from "../src/constants";
import { AnyManifestFile, ManifestFile } from "../src/colorizer/utils/dataset_utils";

describe("Dataset", () => {
  const defaultPath = "https://some-path.json";

  const makeMockFetchMethod = <T>(url: string, manifestJson: T): ((url: string) => Promise<T>) => {
    return async (inputUrl: string): Promise<T> => {
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

  const defaultManifest: ManifestFile = {
    frames: ["frame0.json"],
    features: [
      { name: "feature1", data: "feature1.json", units: "meters", type: "continuous" },
      { name: "feature2", data: "feature2.json", units: "(m)", type: "discrete" },
      { name: "feature3", data: "feature3.json", units: "μm/s", type: "bad-type" },
      { name: "feature4", data: "feature4.json" },
      { name: "feature5", data: "feature4.json", type: "categorical", categories: ["small", "medium", "large"] },
    ],
  };

  const manifestV2: AnyManifestFile = {
    frames: ["frame0.json"],
    features: {
      feature1: { data: "feature1.json", units: "meters", type: "continuous" },
      feature2: { data: "feature2.json", units: "(m)", type: "discrete" },
      feature3: { data: "feature3.json", units: "μm/s", type: "bad-type" },
      feature4: { data: "feature4.json" },
      feature5: { data: "feature4.json", type: "categorical", categories: ["small", "medium", "large"] },
    },
  };

  const manifestV1: AnyManifestFile = {
    frames: ["frame0.json"],
    features: {
      feature1: "feature1.json",
      feature2: "feature2.json",
      feature3: "feature3.json",
      feature4: "feature4.json",
      feature5: "feature4.json",
    },
    featureMetadata: {
      feature1: { units: "meters", type: "continuous" },
      feature2: { units: "(m)", type: "discrete" },
      feature3: { units: "μm/s", type: "bad-type" },
      // No metadata for feature4
      feature5: { type: "categorical", categories: ["small", "medium", "large"] },
    },
  };

  const manifestsToTest: [string, AnyManifestFile][] = [
    ["Default Manifest", defaultManifest],
    ["Deprecated Manifest V2", manifestV2],
    ["Deprecated Manifest V1", manifestV1],
  ];

  // Test both normal and deprecated manifests
  for (const [name, manifest] of manifestsToTest) {
    describe(name, () => {
      it("retrieves feature units", async () => {
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, manifest);
        await dataset.open(mockFetch);

        expect(dataset.getFeatureUnits("feature1")).to.equal("meters");
        expect(dataset.getFeatureUnits("feature2")).to.equal("(m)");
        expect(dataset.getFeatureUnits("feature3")).to.equal("μm/s");
        expect(dataset.getFeatureUnits("feature4")).to.equal("");
        expect(dataset.getFeatureUnits("feature5")).to.equal("");
      });

      it("retrieves feature types", async () => {
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, manifest);
        await dataset.open(mockFetch);

        expect(dataset.getFeatureType("feature1")).to.equal(FeatureType.CONTINUOUS);
        expect(dataset.getFeatureType("feature2")).to.equal(FeatureType.DISCRETE);
        expect(dataset.getFeatureType("feature5")).to.equal(FeatureType.CATEGORICAL);
      });

      it("defaults type to continuous if no type or bad type provided", async () => {
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, manifest);
        await dataset.open(mockFetch);

        expect(dataset.getFeatureType("feature3")).to.equal(FeatureType.CONTINUOUS);
        expect(dataset.getFeatureType("feature4")).to.equal(FeatureType.CONTINUOUS);
      });

      it("gets feature categories", async () => {
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, manifest);
        await dataset.open(mockFetch);

        expect(dataset.isFeatureCategorical("feature1")).to.be.false;
        expect(dataset.isFeatureCategorical("feature2")).to.be.false;
        expect(dataset.isFeatureCategorical("feature3")).to.be.false;
        expect(dataset.isFeatureCategorical("feature4")).to.be.false;
        expect(dataset.isFeatureCategorical("feature5")).to.be.true;
        expect(dataset.getFeatureCategories("feature5")).to.deep.equal(["small", "medium", "large"]);
      });

      it("throws an error if categorical data is missing categories", async () => {
        const badManifest = {
          frames: ["frame0.json"],
          features: {
            feature1: "feature1.json",
          },
          featureMetadata: {
            feature1: { type: "categorical" },
          },
        };
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, badManifest);
        await expect(dataset.open(mockFetch)).rejects.toThrowError(ANY_ERROR);
      });

      it("throws an error if the number of categories exceeds the max", async () => {
        const categories = [...Array(MAX_FEATURE_CATEGORIES + 1).keys()].map((i) => i.toString());
        const badManifest = {
          frames: ["frame0.json"],
          features: {
            feature1: "feature1.json",
          },
          featureMetadata: {
            feature1: {
              type: "categorical",
              categories: categories,
            },
          },
        };
        const dataset = new Dataset(defaultPath, undefined, new MockArrayLoader());
        const mockFetch = makeMockFetchMethod(defaultPath, badManifest);
        await expect(dataset.open(mockFetch)).rejects.toThrowError(ANY_ERROR);
      });
    });
  }
});
