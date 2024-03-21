// Defines types for working with dataset manifests, and methods for
// updating manifests from one version to another.

/**
 * Dataset properties in a collection. Collections are defined as .json files containing an array of objects
 * with the following properties:
 *
 * - `path`: a relative path from the base directory of the collection URL, or a URL to a dataset.
 * - `name`: the display name for the dataset.
 */
export type CollectionEntry = {
  path: string;
  name: string;
};

export type CollectionFileMetadata = {
  name: string;
  description: string;
  author: string;
  collectionVersion: string;
  lastModified: string;
  dateCreated: string;
  revision: number;
  writerVersion: string;
};

// v1.0.0 uses an array of collection entries.
// eslint-disable-next-line @typescript-eslint/naming-convention
type CollectionFileV1_0_0 = CollectionEntry[];

// eslint-disable-next-line @typescript-eslint/naming-convention
function isV1_0_0(collection: AnyCollectionFile): collection is CollectionFileV1_0_0 {
  return Array.isArray(collection);
}
// ^ future versions will be able to use the metadata's writerVersion + semver to check!

// v1.1.0 turns collections into an object with a `datasets` field and a `metadata` field.
// eslint-disable-next-line @typescript-eslint/naming-convention
type CollectionFileV1_1_0 = {
  datasets: CollectionEntry[];
  metadata: Partial<CollectionFileMetadata>;
};

export type CollectionFile = CollectionFileV1_1_0;

type AnyCollectionFile = CollectionFileV1_0_0 | CollectionFileV1_1_0;

/**
 * Converts potentially outdated collections to the latest schema.
 * @param collection Collection object, as parsed from a JSON file.
 * @returns An object with fields reflecting the most recent CollectionFile spec.
 */
export const updateCollectionVersion = (collection: AnyCollectionFile): CollectionFile => {
  if (isV1_0_0(collection)) {
    return {
      datasets: collection,
      metadata: {},
    };
  }

  if (collection.metadata === undefined) {
    collection.metadata = {};
  }

  return collection;
};
