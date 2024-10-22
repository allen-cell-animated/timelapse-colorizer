import { describe, expect, it } from "vitest";

import { DEFAULT_COLLECTION_FILENAME, DEFAULT_DATASET_FILENAME } from "../src/constants";
import { ANY_ERROR, makeMockFetchMethod } from "./test_utils";

import Collection from "../src/colorizer/Collection";

const collectionData = new Map([
  ["d1", { path: "https://some-path.json", name: "dataset1" }],
  ["d2", { path: "https://some-path.json", name: "dataset2" }],
  ["d3", { path: "https://some-path.json", name: "dataset3" }],
]);
const defaultCollection: Collection = new Collection(collectionData);

describe("Collection", () => {
  describe("constructor", () => {
    it("throws an error if non-JSON paths are provided.", () => {
      const collectionMap = new Map([["d1", { path: "https://some-path/", name: "dataset1" }]]);
      expect(() => new Collection(collectionMap)).toThrowError(ANY_ERROR);
    });

    it("throws an error if non-URL paths are provided.", () => {
      const collectionMap = new Map([["d1", { path: "C://local/collection.json", name: "dataset1" }]]);
      expect(() => new Collection(collectionMap)).toThrowError(ANY_ERROR);
    });

    it("should use keys and not names of dataset", () => {
      const datasetNames = defaultCollection.getDatasetKeys();

      expect(datasetNames).to.deep.equal(["d1", "d2", "d3"]);
    });
  });

  describe("getDefaultDataset", () => {
    it("throws an error for empty collections", () => {
      // allow any error message as long as it throws
      const collection = new Collection(new Map());
      expect(() => collection.getDefaultDatasetKey()).toThrowError(ANY_ERROR);
    });

    it("returns the first dataset in a collection", () => {
      expect(defaultCollection.getDefaultDatasetKey()).to.equal("d1");
    });
  });

  describe("loadCollection", () => {
    const datasets = [
      { name: "dataset1", path: "dir1" },
      { name: "dataset2", path: "dir2/nested/some_dir/" },
      { name: "dataset3", path: "dir3/data.json" },
      { name: "dataset4", path: "https://b.com/dataset4/" },
      { name: "dataset5", path: "https://b.com/dataset5/custom.json" },
    ];

    const collectionFormats: { version: string; collectionJson: object }[] = [
      { version: "v0.0.0", collectionJson: datasets },
      {
        version: "v1.1.0",
        collectionJson: {
          datasets: datasets,
          metadata: {
            name: "c_name",
            description: "c_description",
            author: "c_author",
            collectionVersion: "c_collectionVersion",
            lastModified: "2024-01-01T00:00:00Z",
            dateCreated: "2023-01-01T00:00:00Z",
            revision: 15,
            writerVersion: "v1.1.0",
          },
        },
      },
    ];

    for (const { version, collectionJson } of collectionFormats) {
      describe(version, () => {
        it("collects datasets", async () => {
          const url = "https://e.com/collection.json";
          const mockFetch = makeMockFetchMethod(url, collectionJson);
          const collection = await Collection.loadCollection(url, { fetchMethod: mockFetch });

          expect(collection.getDatasetKeys().length).to.equal(datasets.length);
          expect(collection.getDatasetKeys()).to.deep.equal([
            "dataset1",
            "dataset2",
            "dataset3",
            "dataset4",
            "dataset5",
          ]);
        });

        it("should parse dataset paths correctly", async () => {
          const url = "https://e.com/collection.json/";
          const mockFetch = makeMockFetchMethod("https://e.com/collection.json", collectionJson);
          const collection = await Collection.loadCollection(url, { fetchMethod: mockFetch });

          expect(collection.getAbsoluteDatasetPath("dataset1")).to.equal("https://e.com/dir1/manifest.json");
          expect(collection.getAbsoluteDatasetPath("dataset2")).to.equal(
            "https://e.com/dir2/nested/some_dir/manifest.json"
          );
          expect(collection.getAbsoluteDatasetPath("dataset3")).to.equal("https://e.com/dir3/data.json");
          expect(collection.getAbsoluteDatasetPath("dataset4")).to.equal("https://b.com/dataset4/manifest.json");
          expect(collection.getAbsoluteDatasetPath("dataset5")).to.equal("https://b.com/dataset5/custom.json");
        });

        it("retrieves metadata", async () => {
          const url = "https://e.com/collection.json";
          const mockFetch = makeMockFetchMethod(url, collectionJson);
          const collection = await Collection.loadCollection(url, { fetchMethod: mockFetch });

          if (version === "v0.0.0") {
            expect(collection.metadata).deep.equals({});
            return;
          }

          // Test that all properties can be retrieved as stored
          expect(collection.metadata.name).to.equal("c_name");
          expect(collection.metadata.description).to.equal("c_description");
          expect(collection.metadata.author).to.equal("c_author");
          expect(collection.metadata.collectionVersion).to.equal("c_collectionVersion");
          expect(collection.metadata.lastModified).to.equal("2024-01-01T00:00:00Z");
          expect(collection.metadata.dateCreated).to.equal("2023-01-01T00:00:00Z");
          expect(collection.metadata.revision).to.equal(15);
          expect(collection.metadata.writerVersion).to.equal(version);
        });
      });
    }

    it("returns an empty metadata object for v0.0.0", async () => {
      const url = "https://e.com/collection.json";
      const mockFetch = makeMockFetchMethod(url, collectionFormats[0].collectionJson);
      const collection = await Collection.loadCollection(url, { fetchMethod: mockFetch });

      expect(collection.metadata).deep.equals({});
    });

    it("should substitute default collection filename if URL is not a JSON", async () => {
      const url = "https://e.com";
      // Will only allow this exact fetch URL or else it will throw an error
      const mockFetch = makeMockFetchMethod("https://e.com/" + DEFAULT_COLLECTION_FILENAME, [{ name: "", path: "" }]);

      await Collection.loadCollection(url, { fetchMethod: mockFetch });
    });

    it("Throws an error when loading a collection with no datasets", async () => {
      const url = "https://e.com/collection.json";
      const mockFetch = makeMockFetchMethod(url, { datasets: [] });
      const tryLoad = Collection.loadCollection(url, { fetchMethod: mockFetch });
      expect(tryLoad).rejects.toMatch(ANY_ERROR);
    });
  });

  describe("makeCollectionFromSingleDataset", () => {
    it("makes a collection with indirect dataset paths", () => {
      const datasetPath = "http://website.com/data";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);
      const fullPath = datasetPath + "/" + DEFAULT_DATASET_FILENAME;

      expect(collection.getDatasetKeys().length).to.equal(1);
      expect(collection.hasDataset(fullPath)).to.be.true;
      expect(collection.getAbsoluteDatasetPath(fullPath)).to.equal(fullPath);
    });

    it("makes a collection with absolute dataset paths", () => {
      const datasetPath = "http://website.com/data/some-manifest.json";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);

      expect(collection.getDatasetKeys().length).to.equal(1);
      expect(collection.hasDataset(datasetPath)).to.be.true;
      expect(collection.getAbsoluteDatasetPath(datasetPath)).to.equal(datasetPath);
    });

    it("sets the URL to null", () => {
      const datasetPath = "http://website.com/data/some-manifest.json";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);

      expect(collection.url).to.be.null;
    });
  });
});
