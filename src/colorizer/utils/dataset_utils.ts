export type ManifestFileMetadata = {
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

type ManifestFileV1 = {
  frames: string[];
  features: Record<string, string>;
  /** Deprecated; avoid using in new datasets. Instead, use the new `FeatureMetadata` spec. */
  featureMetadata?: Record<
    string,
    Partial<{
      units?: string | null;
      type?: string | null;
      categories?: string[] | null;
    }>
  >;
  outliers?: string;
  tracks?: string;
  times?: string;
  centroids?: string;
  bounds?: string;
  metadata?: Partial<ManifestFileMetadata>;
};

// V2 removes the featureMetadata field, and instead stores the feature metadata
// in features.
type ManifestFileV2 = Omit<ManifestFileV1, "features" | "featureMetadata"> & {
  features: Record<
    string,
    {
      data: string;
      units?: string;
      type?: string;
      categories?: string[];
    }
  >;
};

export type ManifestFile = ManifestFileV2;
/** Any manifest version, including deprecated manifests. Call `update_manifest_version` to transform to an up-to-date version. */
export type AnyManifestFile = ManifestFileV1 | ManifestFileV2;

///////////// Conversion functions /////////////////////

/**
 * Returns whether the dataset is using the older, deprecated manifest format, where feature metadata
 * was stored in a separate object from the `feature` file path declaration.
 */
function isFeatureDeprecated(features: ManifestFileV1["features"] | ManifestFileV2["features"]): boolean {
  return typeof Object.values(features)[0] === "string";
}

/**
 * Converts potentially outdated manifests to the latest manifest format.
 * @param manifest Manifest object, as parsed from a JSON file.
 * @returns An object with fields reflecting the most recent ManifestFile spec.
 */
export const update_manifest_version = (manifest: AnyManifestFile): ManifestFile => {
  if (isFeatureDeprecated(manifest.features)) {
    // Parse feature metadata into the new features format
    const manifestV1 = manifest as ManifestFileV1;

    const features: ManifestFileV2["features"] = {};
    for (const [featureName, featurePath] of Object.entries(manifestV1.features)) {
      const featureMetadata = manifestV1.featureMetadata?.[featureName];
      features[featureName] = {
        data: featurePath,
        units: featureMetadata?.units || undefined,
        type: featureMetadata?.type || undefined,
        categories: featureMetadata?.categories || undefined,
      };
    }

    return {
      ...manifest,
      features,
    };
  }
  return manifest as ManifestFile;
};
