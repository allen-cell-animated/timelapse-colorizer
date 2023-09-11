import Collection from "../src/colorizer/Collection";
import { DEFAULT_COLLECTION_FILENAME, DEFAULT_DATASET_FILENAME } from "../src/constants";
import { ANY_ERROR, makeMockFetchMethod } from "./test_utils";
import { describe, expect, it } from "vitest";

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
      expect(() => collection.getDefaultDataset()).toThrowError(ANY_ERROR);
    });

    it("returns the first dataset in a collection", () => {
      expect(defaultCollection.getDefaultDataset()).to.equal("d1");
    });
  });

  describe("loadCollection", () => {
    it("should parse dataset paths correctly", async () => {
      const url = "https://e.com/collection.json/";
      const collectionJson = [
        { name: "dataset1", path: "dir1" },
        { name: "dataset2", path: "dir2/nested/some_dir/" },
        { name: "dataset3", path: "dir3/data.json" },
        { name: "dataset4", path: "https://b.com/dataset4/" },
        { name: "dataset5", path: "https://b.com/dataset5/custom.json" },
      ];

      const mockFetch = makeMockFetchMethod("https://e.com/collection.json", collectionJson);
      const collection = await Collection.loadCollection(url, mockFetch);

      expect(collection.getDatasetKeys().length).to.equal(5);
      expect(collection.getDatasetPath("dataset1")).to.equal("https://e.com/dir1/manifest.json");
      expect(collection.getDatasetPath("dataset2")).to.equal("https://e.com/dir2/nested/some_dir/manifest.json");
      expect(collection.getDatasetPath("dataset3")).to.equal("https://e.com/dir3/data.json");
      expect(collection.getDatasetPath("dataset4")).to.equal("https://b.com/dataset4/manifest.json");
      expect(collection.getDatasetPath("dataset5")).to.equal("https://b.com/dataset5/custom.json");
    });

    it("should substitute default collection filename if URL is not a JSON", async () => {
      const url = "https://e.com";
      // Will only allow this exact fetch URL
      const mockFetch = makeMockFetchMethod("https://e.com/" + DEFAULT_COLLECTION_FILENAME, []);

      await Collection.loadCollection(url, mockFetch);
    });
  });

  describe("makeCollectionFromSingleDataset", () => {
    it("makes a collection with indirect dataset paths", () => {
      const datasetPath = "http://website.com/data";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);
      const fullPath = datasetPath + "/" + DEFAULT_DATASET_FILENAME;

      expect(collection.getDatasetKeys().length).to.equal(1);
      expect(collection.hasDataset(fullPath)).to.be.true;
      expect(collection.getDatasetPath(fullPath)).to.equal(fullPath);
    });

    it("makes a collection with absolute dataset paths", () => {
      const datasetPath = "http://website.com/data/some-manifest.json";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);

      expect(collection.getDatasetKeys().length).to.equal(1);
      expect(collection.hasDataset(datasetPath)).to.be.true;
      expect(collection.getDatasetPath(datasetPath)).to.equal(datasetPath);
    });

    it("sets the URL to null", () => {
      const datasetPath = "http://website.com/data/some-manifest.json";
      const collection = Collection.makeCollectionFromSingleDataset(datasetPath);

      expect(collection.url).to.be.null;
    });
  });
});
