// Defines types for working with dataset manifests, and methods for
// updating manifests from one version to another.
import type { Spread } from "./type_utils";

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

/** Defines the source of 2D segmentation or backdrop frames in the manifest. */
export type ManifestFrameSource = {
  name?: string;
  description?: string;
  key?: string;
  frames: string[];
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
  backdrops?: ManifestFrameSource[];
};

/**
 * Defines the source of 3D segmentation or backdrop channels in the manifest.
 */
export type ManifestChannelSource = {
  source: string;
  name?: string;
  /** Index of the channel in the source volume. 0 by default. */
  channelIndex?: number;
  description?: string;
  min?: number;
  max?: number;
};

/**
 * Deprecated frames 3D format, where only one segmentation channel is
 * supported.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
type Frames3dV1_1_0 = {
  /**
   * URL or path relative to the root of the manifest. Expected to be a
   * time-series ZARR (e.g. ends with `.ome.zarr`).
   */
  source: string;
  /** The index of the channel to use as a segmentation within the source. */
  segmentationChannel: number;
  /** Total number of frames in the time-series volume. */
  totalFrames: number;
  backdrops?: ManifestChannelSource[];
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
    frames3d?: Frames3dV1_1_0;
  }
>;

/**
 * Removes the `source` and `segmentationChannel` fields from the 3D frames
 * definition and replaces them with a list of segmentations to support multiple
 * alternate segmentations.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
type Frames3dV1_8_0 = {
  segmentations?: ManifestChannelSource[];
  backdrops?: ManifestChannelSource[];
  totalFrames?: number;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
type Frames2dV1_8_0 = {
  segmentations?: ManifestFrameSource[];
  backdrops?: ManifestFrameSource[];
};

// eslint-disable-next-line @typescript-eslint/naming-convention
type TrackDataV1_8_0 = {
  name?: string;
  key?: string;
  description?: string;
  /** Path to the track IDs file. */
  trackIds?: string;
  /** Path to the node IDs file. Currently unused. */
  nodeIds?: string;
  /** Path to the track edges file. */
  trackEdges?: string;
  /** Path to the node edges file. */
  nodeEdges?: string;
};

/**
 * Adds support for multiple alternate segmentations for both 2D and 3D frames,
 * and for multiple alternate track data sources (with optional track edge and
 * node edge files.)
 * - Moves `frames` and `backdrops` argument into `frames2d` field.
 * - Moves `frames3d.source` and `frames3d.segmentationChannel` into a list of
 *   segmentations in `frames3d.segmentations`.
 * - Changes `tracks` field from a string path to a list of objects.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
type ManifestFileV1_8_0 = Spread<
  Omit<ManifestFileV1_1_0, "frames3d" | "frames" | "backdrops" | "tracks"> & {
    frames3d?: Frames3dV1_8_0;
    frames2d?: Frames2dV1_8_0;
    tracks?: TrackDataV1_8_0[];
  }
>;

/** Type definition for the dataset manifest JSON file. */
export type ManifestFile = ManifestFileV1_8_0;
/**
 * Any manifest version, including deprecated manifests. Call
 * `update_manifest_version` to transform to an up-to-date version.
 */
export type AnyManifestFile = ManifestFileV0_0_0 | ManifestFileV1_0_0 | ManifestFileV1_1_0 | ManifestFileV1_8_0;

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

// eslint-disable-next-line @typescript-eslint/naming-convention
function isV1_1_0FrameData(manifest: AnyManifestFile): manifest is ManifestFileV1_1_0 {
  const frames3d = (manifest as ManifestFileV1_1_0).frames3d;
  const frames = (manifest as ManifestFileV1_1_0).frames;
  const backdrops = (manifest as ManifestFileV1_1_0).backdrops;
  return frames !== undefined || backdrops !== undefined || frames3d?.source !== undefined;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function isV1_1_0TrackData(manifest: AnyManifestFile): manifest is ManifestFileV1_1_0 {
  return typeof (manifest as ManifestFileV1_1_0).tracks === "string";
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
  if (isV1_1_0FrameData(manifest)) {
    const frames3d = (manifest as ManifestFileV1_1_0).frames3d;
    const frames = (manifest as ManifestFileV1_1_0).frames;
    const backdrops = (manifest as ManifestFileV1_1_0).backdrops;
    if (frames || backdrops) {
      const frames2d: ManifestFile["frames2d"] = {};
      if (frames) {
        frames2d.segmentations = [
          {
            frames,
            name: "Default",
            key: "default",
          },
        ];
      }
      if (backdrops) {
        frames2d.backdrops = backdrops;
      }
      manifest = { ...manifest, frames2d };
    }
    if (frames3d) {
      manifest = {
        ...manifest,
        frames3d: {
          segmentations: [
            {
              name: "Default",
              source: frames3d.source,
              channelIndex: frames3d.segmentationChannel,
            },
          ],
          totalFrames: frames3d.totalFrames,
          backdrops: frames3d.backdrops || [],
        },
      };
    }
  }
  if (isV1_1_0TrackData(manifest)) {
    const tracks = (manifest as ManifestFileV1_1_0).tracks;
    manifest = {
      ...manifest,
      tracks: [
        {
          trackIds: tracks,
        },
      ],
    };
  }

  return manifest as ManifestFile;
};
