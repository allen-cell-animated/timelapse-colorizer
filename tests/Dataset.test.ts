import semver from "semver";
import { Vector2 } from "three";
import { describe, expect, it } from "vitest";

import { FeatureDataType } from "src/colorizer";
import Dataset, { FeatureType } from "src/colorizer/Dataset";
import { AnyManifestFile, ManifestFile } from "src/colorizer/utils/dataset_utils";
import { MAX_FEATURE_CATEGORIES } from "src/constants";

import { MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE, MOCK_DATASET_MANIFEST } from "./state/ViewerState/constants";
import {
  ANY_ERROR,
  DEFAULT_DATASET_DIR,
  DEFAULT_DATASET_PATH,
  makeMockAsyncLoader,
  makeMockDataset,
  MockArrayLoader,
  MockArraySource,
  MockFrameLoader,
} from "./test_utils";

describe("Dataset", () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const manifestV0_0_0: AnyManifestFile = {
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const manifestV1_0_0: AnyManifestFile = {
    ...manifestV0_0_0,
    features: [
      { key: "feature1", name: "Feature1", data: "feature1.json", unit: "meters", type: "continuous" },
      { key: "feature2", name: "Feature2", data: "feature2.json", unit: "(m)", type: "discrete" },
      { name: "Feature3", data: "feature3.json", unit: "μm/s", type: "bad-type" },
      { name: "Feature4", data: "feature4.json" },
      {
        key: "feature5",
        name: "Feature5",
        data: "feature4.json",
        type: "categorical",
        categories: ["small", "medium", "large"],
      },
    ],
    metadata: {
      frameDims: {
        width: 10,
        height: 11,
        units: "um",
      },
      frameDurationSeconds: 12,
      /* Optional offset for the timestamp. */
      startTimeSeconds: 13,
    },
  };

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const manifestV1_1_0: ManifestFile = {
    ...manifestV1_0_0,
    metadata: {
      ...manifestV1_0_0.metadata,
      name: "d_name",
      description: "d_description",
      author: "d_author",
      datasetVersion: "d_datasetVersion",
      lastModified: "2024-01-01T00:00:00Z",
      dateCreated: "2023-01-01T00:00:00Z",
      revision: 14,
      writerVersion: "v1.1.0",
    },
  };

  const manifestsToTest: [string, AnyManifestFile][] = [
    ["v0.0.0", manifestV0_0_0],
    ["v1.0.0", manifestV1_0_0],
    ["v1.1.0", manifestV1_1_0],
  ];

  // Test both normal and deprecated manifests
  for (const [version, manifest] of manifestsToTest) {
    describe(version, () => {
      it("fills in feature keys if only names are provided", async () => {
        const dataset = await makeMockDataset(manifest);
        expect(dataset.featureKeys).to.deep.equal(["feature1", "feature2", "feature3", "feature4", "feature5"]);
      });

      it("retrieves feature units", async () => {
        const dataset = await makeMockDataset(manifest);

        expect(dataset.getFeatureUnits("feature1")).to.equal("meters");
        expect(dataset.getFeatureUnits("feature2")).to.equal("(m)");
        expect(dataset.getFeatureUnits("feature3")).to.equal("μm/s");
        expect(dataset.getFeatureUnits("feature4")).to.equal("");
        expect(dataset.getFeatureUnits("feature5")).to.equal("");
      });

      it("retrieves feature units and names", async () => {
        const dataset = await makeMockDataset(manifest);

        // Display labels are only implemented in v1.0.0 and later
        if (semver.lt(version, "1.0.0")) {
          expect(dataset.getFeatureNameWithUnits("feature1")).to.equal("feature1 (meters)");
          expect(dataset.getFeatureNameWithUnits("feature2")).to.equal("feature2 ((m))");
          expect(dataset.getFeatureNameWithUnits("feature3")).to.equal("feature3 (μm/s)");
          expect(dataset.getFeatureNameWithUnits("feature4")).to.equal("feature4");
          expect(dataset.getFeatureNameWithUnits("feature5")).to.equal("feature5");
        } else {
          expect(dataset.getFeatureNameWithUnits("feature1")).to.equal("Feature1 (meters)");
          expect(dataset.getFeatureNameWithUnits("feature2")).to.equal("Feature2 ((m))");
          expect(dataset.getFeatureNameWithUnits("feature3")).to.equal("Feature3 (μm/s)");
          expect(dataset.getFeatureNameWithUnits("feature4")).to.equal("Feature4");
          expect(dataset.getFeatureNameWithUnits("feature5")).to.equal("Feature5");
        }
      });

      it("retrieves feature types", async () => {
        const dataset = await makeMockDataset(manifest);

        expect(dataset.getFeatureType("feature1")).to.equal(FeatureType.CONTINUOUS);
        expect(dataset.getFeatureType("feature2")).to.equal(FeatureType.DISCRETE);
        expect(dataset.getFeatureType("feature5")).to.equal(FeatureType.CATEGORICAL);
      });

      it("defaults type to continuous if no type or bad type provided", async () => {
        const dataset = await makeMockDataset(manifest);

        expect(dataset.getFeatureType("feature3")).to.equal(FeatureType.CONTINUOUS);
        expect(dataset.getFeatureType("feature4")).to.equal(FeatureType.CONTINUOUS);
      });

      it("gets whether features are categorical", async () => {
        const dataset = await makeMockDataset(manifest);

        expect(dataset.isFeatureCategorical("feature1")).to.be.false;
        expect(dataset.isFeatureCategorical("feature2")).to.be.false;
        expect(dataset.isFeatureCategorical("feature3")).to.be.false;
        expect(dataset.isFeatureCategorical("feature4")).to.be.false;
        expect(dataset.isFeatureCategorical("feature5")).to.be.true;
      });

      it("gets feature categories", async () => {
        const dataset = await makeMockDataset(manifest);

        expect(dataset.getFeatureCategories("feature1")).to.deep.equal(null);
        expect(dataset.getFeatureCategories("feature2")).to.deep.equal(null);
        expect(dataset.getFeatureCategories("feature3")).to.deep.equal(null);
        expect(dataset.getFeatureCategories("feature4")).to.deep.equal(null);
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
        const dataset = new Dataset(DEFAULT_DATASET_PATH, {
          frameLoader: new MockFrameLoader(),
          arrayLoader: new MockArrayLoader(),
        });
        const mockFetch = makeMockAsyncLoader(DEFAULT_DATASET_PATH, badManifest);
        await expect(dataset.open({ manifestLoader: mockFetch })).rejects.toThrowError(ANY_ERROR);
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
        const dataset = new Dataset(DEFAULT_DATASET_PATH, {
          frameLoader: new MockFrameLoader(),
          arrayLoader: new MockArrayLoader(),
        });
        const mockFetch = makeMockAsyncLoader(DEFAULT_DATASET_PATH, badManifest);
        await expect(dataset.open({ manifestLoader: mockFetch })).rejects.toThrowError(ANY_ERROR);
      });

      it("Loads the first frame and retrieves frame dimensions on open", async () => {
        const mockFetch = makeMockAsyncLoader(DEFAULT_DATASET_PATH, manifest);
        const dimensionTests = [
          [0, 0],
          [1, 1],
          [2, 3],
          [1, 3],
          [3, 1],
          [3, 2],
          [1000, 1000],
        ];

        for (const [width, height] of dimensionTests) {
          const dataset = new Dataset(DEFAULT_DATASET_PATH, {
            frameLoader: new MockFrameLoader(width, height),
            arrayLoader: new MockArrayLoader(),
          });
          expect(dataset.frameResolution).to.deep.equal(new Vector2(1, 1));
          await dataset.open({ manifestLoader: mockFetch });
          expect(dataset.frameResolution).to.deep.equal(new Vector2(width, height));
        }
      });

      it("Loads metadata", async () => {
        const dataset = await makeMockDataset(manifest);

        // Default metadata should be auto-filled with default values
        if (semver.lt(version, "1.0.0")) {
          expect(dataset.metadata).to.deep.equal({
            frameDims: {
              width: 0,
              height: 0,
              units: "",
            },
            frameDurationSeconds: 0,
            startTimeSeconds: 0,
          });
          return;
        }

        if (semver.gte(version, "1.0.0")) {
          expect(dataset.metadata.frameDims).to.deep.equal({
            width: 10,
            height: 11,
            units: "um",
          });
          expect(dataset.metadata.frameDurationSeconds).to.equal(12);
          expect(dataset.metadata.startTimeSeconds).to.equal(13);
        }
        if (semver.gte(version, "1.1.0")) {
          expect(dataset.metadata.name).to.equal("d_name");
          expect(dataset.metadata.description).to.equal("d_description");
          expect(dataset.metadata.author).to.equal("d_author");
          expect(dataset.metadata.datasetVersion).to.equal("d_datasetVersion");
          expect(dataset.metadata.lastModified).to.equal("2024-01-01T00:00:00Z");
          expect(dataset.metadata.dateCreated).to.equal("2023-01-01T00:00:00Z");
          expect(dataset.metadata.revision).to.equal(14);
          expect(dataset.metadata.writerVersion).to.equal("v1.1.0");
        }
      });
    });
  }

  it("changes relative source paths for 3D data to URLs", async () => {
    const manifestWith3dSource: AnyManifestFile = {
      ...MOCK_DATASET_MANIFEST,
      frames3d: {
        source: "seg.ome.zarr",
        segmentationChannel: 1,
        totalFrames: 4,
      },
    };
    const dataset = await makeMockDataset(manifestWith3dSource);
    expect(dataset.has3dFrames()).to.be.true;
    const frames3d = dataset.frames3d;
    expect(frames3d?.source).to.equal(DEFAULT_DATASET_DIR + "seg.ome.zarr");
    expect(frames3d?.segmentationChannel).to.equal(1);
    expect(frames3d?.totalFrames).to.equal(4);
  });

  it("converts allen Zarr paths to URLs", async () => {
    const manifestWith3dSource: AnyManifestFile = {
      ...MOCK_DATASET_MANIFEST,
      frames3d: {
        source: "/allen/aics/assay-dev/some/path/to/seg.ome.zarr",
        segmentationChannel: 0,
        totalFrames: 4,
      },
    };
    const dataset = await makeMockDataset(manifestWith3dSource);
    expect(dataset.has3dFrames()).to.be.true;
    const frames3d = dataset.frames3d;
    expect(frames3d?.source).to.equal("https://dev-aics-dtp-001.int.allencell.org/assay-dev/some/path/to/seg.ome.zarr");
  });

  describe("centroids data", () => {
    it("loads 2D centroid data as 3D", async () => {
      const mockArrayLoaderSource = {
        ...MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE,
        [DEFAULT_DATASET_DIR + "centroids.json"]: new MockArraySource(
          FeatureDataType.F32,
          new Float32Array([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8])
        ),
      };
      const mockArrayLoader = new MockArrayLoader(mockArrayLoaderSource);
      const mockDatasetManifest = {
        ...MOCK_DATASET_MANIFEST,
        centroids: "centroids.json",
      };
      const dataset = await makeMockDataset(mockDatasetManifest, mockArrayLoader);
      expect(dataset.centroids).to.deep.equal(
        new Uint16Array([0, 0, 0, 1, 1, 0, 2, 2, 0, 3, 3, 0, 4, 4, 0, 5, 5, 0, 6, 6, 0, 7, 7, 0, 8, 8, 0])
      );
    });

    it("loads 3D centroid data", async () => {
      const mockArrayLoaderSource = {
        ...MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE,
        [DEFAULT_DATASET_DIR + "centroids.json"]: new MockArraySource(
          FeatureDataType.U16,
          new Uint16Array([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8])
        ),
      };
      const mockArrayLoader = new MockArrayLoader(mockArrayLoaderSource);
      const mockDatasetManifest = {
        ...MOCK_DATASET_MANIFEST,
        centroids: "centroids.json",
      };
      const dataset = await makeMockDataset(mockDatasetManifest, mockArrayLoader);
      expect(dataset.centroids).to.deep.equal(
        new Uint16Array([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8])
      );
    });

    it("has track and time keys in the dataset", async () => {
      const mockArrayLoaderSource = MOCK_DATASET_ARRAY_LOADER_DEFAULT_SOURCE;
      const dataset = await makeMockDataset(MOCK_DATASET_MANIFEST, new MockArrayLoader(mockArrayLoaderSource));
      // Regression test: this test will break if the key constants are modified or removed.
      expect(dataset.featureKeys).includes("_track_");
      expect(dataset.featureKeys).includes("_time_");
    });
  });
});
