// Defines types for working with dataset manifests, and methods for
// updating manifests from one version to another.
import { Spread } from "./type_utils";

// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileMetadataV0_0_0 = {
  /** Dimensions of the frame, in scale units. Default width and height are 0. */
  frameDims: {
    width: number;
    height: number;
    units: string;
  };
  frameDurationSeconds: number;
  /* Optional offset for the timestamp. */
  startTimeSeconds: number;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileMetadataV1_1_0 = ManifestFileMetadataV0_0_0 &
  Partial<{
    name: string;
    description: string;
    author: string;
    datasetVersion: string;
    lastModified: string;
    dateCreated: string;
    revision: number;
    writerVersion: string;
  }>;

export type ManifestFileMetadata = Spread<ManifestFileMetadataV1_1_0>;

// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileV0_0_0 = {
  frames?: string[];
  /** Deprecated; Map from feature name to relative path. */
  features: Record<string, string>;
  /** Deprecated; avoid using in new datasets. Instead, use the new `FeatureMetadata` spec. */
  featureMetadata?: Record<
    string,
    {
      units?: string | null;
      type?: string | null;
      categories?: string[] | null;
    }
  >;
  outliers?: string;
  tracks?: string;
  times?: string;
  centroids?: string;
  bounds?: string;
  metadata?: Partial<ManifestFileMetadataV0_0_0>;
};

// v1.0.0 removes the featureMetadata field, replaces the features map with an ordered
// array of metadata objects.
// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileV1_0_0 = Omit<ManifestFileV0_0_0, "features" | "featureMetadata" | "metadata"> & {
  /** List of feature metadata, including keys and data paths. */
  features: {
    key?: string;
    name: string;
    data: string;
    unit?: string;
    type?: string;
    categories?: string[];
    // Added in v1.3.0
    min?: number | null;
    max?: number | null;
    // Added in v1.4.2
    description?: string;
  }[];
  /** Optional list of backdrop/overlay images. */
  backdrops?: { name: string; key: string; frames: string[] }[];
};

// v1.1.0 adds additional optional metadata fields.
// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileV1_1_0 = Spread<
  ManifestFileV1_0_0 & {
    metadata?: Partial<ManifestFileMetadataV1_1_0>;
    /**
     * Segmentation IDs for objects as they appear in image/frame data.
     * Segmentation IDs should be unique for each object in a frame, and for
     * best performance should be contiguous integers starting from 1.
     *
     * If an object at some time `t` has segmentation ID `21`, all pixels with a
     * value of 21 in the frame at time `t` belong to that object.
     */
    segIds?: string;
    /**
     * Optional 3D volumetric segmentation data.
     */
    frames3d?: {
      /**
       * URL or path relative to the root of the manifest. Expected to be a
       * time-series ZARR (e.g. ends with `.ome.zarr`). */
      source: string;
      /**
       * The index of the channel to use as a segmentation. If multiple volumes
       * are specified in `source`, `segmentationChannel` indexes into a list of
       * the channels of all volumes concatenated together.
       **/
      segmentationChannel: number;
      /** Total number of frames in the time-series volume. */
      totalFrames: number;
    };
  }
>;

/** Type definition for the dataset manifest JSON file. */
export type ManifestFile = ManifestFileV1_1_0;
/** Any manifest version, including deprecated manifests. Call `update_manifest_version` to transform to an up-to-date version. */
export type AnyManifestFile = ManifestFileV0_0_0 | ManifestFileV1_0_0 | ManifestFileV1_1_0;

///////////// Conversion functions /////////////////////

/**
 * Returns whether the dataset is using the older, deprecated manifest format, where feature metadata
 * was stored in a separate object from the `feature` file path declaration.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function isV0_0_0(manifest: AnyManifestFile): manifest is ManifestFileV0_0_0 {
  const values = Object.values(manifest.features);
  return values.length === 0 || typeof values[0] === "string";
}

/**
 * Converts potentially outdated manifests to the latest manifest format.
 * @param manifest Manifest object, as parsed from a JSON file.
 * @returns An object with fields reflecting the most recent ManifestFile spec.
 */
export const updateManifestVersion = (manifest: AnyManifestFile): ManifestFile => {
  if (!manifest.features) {
    throw new Error("Manifest JSON is missing the required 'features' field.");
  }
  if (isV0_0_0(manifest)) {
    // Parse feature metadata into the new features format
    const features: ManifestFile["features"] = [];
    for (const [featureName, featurePath] of Object.entries(manifest.features)) {
      const featureMetadata = manifest.featureMetadata?.[featureName];
      features.push({
        name: featureName,
        data: featurePath,
        // Note change from "units" to "unit"
        unit: featureMetadata?.units || undefined,
        type: featureMetadata?.type || undefined,
        categories: featureMetadata?.categories || undefined,
      });
    }

    manifest = {
      ...manifest,
      features,
    };
  }

  return manifest;
};
