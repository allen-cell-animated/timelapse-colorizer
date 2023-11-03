import { Texture } from "three";
import { describe, expect, it } from "vitest";
import { ArraySource, IArrayLoader } from "../src/colorizer";
import Dataset, { DatasetManifest } from "../src/colorizer/Dataset";
import { FeatureArrayType, FeatureDataType, featureTypeSpecs } from "../src/colorizer/types";

describe("Dataset", () => {
  const defaultDatasetManifest: DatasetManifest = {
    frames: ["frame0.json"],
    features: {
      feature1: "feature1.json",
      feature2: "feature2.json",
      feature3: "feature3.json",
      feature4: "feature4.json",
    },
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

    expect(dataset.getFeatureUnits("feature1")).to.equal("meters");
    expect(dataset.getFeatureUnits("feature2")).to.equal("(m)");
    expect(dataset.getFeatureUnits("feature3")).to.equal("μm/s");
    expect(dataset.getFeatureUnits("feature4")).to.equal("");
  });
});
