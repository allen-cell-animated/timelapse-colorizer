import type { Vector2 } from "three";

import {
  CENTROID_X_FEATURE_KEY,
  CENTROID_Y_FEATURE_KEY,
  CENTROID_Z_FEATURE_KEY,
  type ChannelSource,
  type FeatureData,
  FeatureType,
  type Frames2dData,
  type Frames3dData,
  type FrameSource,
  TIME_FEATURE_KEY,
  TRACK_FEATURE_KEY,
} from "src/colorizer/Dataset";
import { FeatureDataType, LoadTroubleshooting, type ReportWarningCallback } from "src/colorizer/types";
import { formatAsBulletList, getKeyFromName } from "src/colorizer/utils/data_utils";
import type {
  ManifestChannelSource,
  ManifestFile,
  ManifestFileMetadata,
  ManifestFrameSource,
} from "src/colorizer/utils/dataset_utils";
import { packDataTexture } from "src/colorizer/utils/texture_utils";

export function getDefaultSegIds(numObjects: number): Uint32Array {
  const segIds = new Uint32Array(numObjects);
  for (let i = 0; i < numObjects; i++) {
    segIds[i] = i + 1;
  }
  return segIds;
}

export function addTrackFeature(features: Map<string, FeatureData>, trackIds: Uint32Array | null): void {
  if (trackIds && !features.has(TRACK_FEATURE_KEY)) {
    const trackData = new Float32Array(trackIds);
    features.set(TRACK_FEATURE_KEY, {
      name: "Track ID",
      key: TRACK_FEATURE_KEY,
      data: trackIds,
      tex: packDataTexture(trackData, FeatureDataType.F32),
      min: 0,
      max: trackIds.reduce((max, id) => Math.max(max, id), 0),
      unit: "",
      type: FeatureType.DISCRETE,
      categories: null,
      description: "Track ID of the object. This feature was added by the viewer from provided data.",
    });
  }
}

export function addTimeFeature(features: Map<string, FeatureData>, times: Uint32Array | null): void {
  if (times && !features.has(TIME_FEATURE_KEY)) {
    const timeData = new Float32Array(times);
    features.set(TIME_FEATURE_KEY, {
      name: "Time (frames)",
      key: TIME_FEATURE_KEY,
      data: times,
      tex: packDataTexture(timeData, FeatureDataType.F32),
      min: 0,
      max: times.reduce((max, id) => Math.max(max, id), 0),
      unit: "",
      type: FeatureType.CONTINUOUS,
      categories: null,
      description: "Frame number where the object appears. This feature was added by the viewer from provided data.",
    });
  }
}

export function addCentroidFeatures(
  features: Map<string, FeatureData>,
  centroids: Uint16Array | null,
  metadata?: ManifestFileMetadata,
  frameDimensions?: Vector2 | null
): void {
  const centroidFeatureKeys = [CENTROID_X_FEATURE_KEY, CENTROID_Y_FEATURE_KEY, CENTROID_Z_FEATURE_KEY];
  const axes = ["X", "Y", "Z"];
  if (!centroids) {
    return;
  }
  // TODO: The handling for centroid scaling is not consistent for 2D and 3D
  // datasets. Currently, 2D datasets must provide centroids in pixels, while
  // 3D datasets must provide them in physical units. If both 3D and 2D frame
  // data is present, centroids would be read as being pixel units, which
  // cause centroids to be scaled incorrectly in 3D. Add a flag to indicate
  // whether centroids are in physical or pixel units.
  const metadataDims = metadata?.frameDims;
  const hasMetadataDims = metadataDims && metadataDims.width && metadataDims.height;
  const physicalDims = hasMetadataDims ? [metadataDims.width, metadataDims.height, 1] : [1, 1, 1];
  const pixelDims = frameDimensions ? [frameDimensions.x, frameDimensions.y, 1] : physicalDims;

  for (let i = 0; i < centroidFeatureKeys.length; i++) {
    const key = centroidFeatureKeys[i];
    if (features.has(key)) {
      continue;
    }

    const rawData = centroids.filter((_, index) => index % 3 === i);
    const data = new Float32Array(rawData);
    if (frameDimensions) {
      // If provided, normalize centroid coordinates to physical units.
      const physicalDim = physicalDims[i];
      const pixelDim = pixelDims[i];
      for (let j = 0; j < data.length; j++) {
        data[j] = (data[j] / pixelDim) * physicalDim;
      }
    }

    const axis = axes[i];
    const min = 0;
    const dataMax = data.reduce((max, value) => Math.max(max, value), -Infinity);
    const max = hasMetadataDims ? physicalDims[i] : dataMax;
    const tex = packDataTexture(data, FeatureDataType.F32);
    const description = `Centroid ${axis} coordinate, in pixels/voxels. This feature was added by the viewer from provided data.`;
    features.set(key, {
      name: "Centroid " + axis,
      key,
      data,
      tex,
      min,
      max,
      unit: metadataDims?.units || "",
      type: FeatureType.DISCRETE,
      categories: null,
      description,
    });
  }
}

export function reportUnloadedFeatures(
  featureSpec: ManifestFile["features"],
  loadedFeatures: Map<string, FeatureData>,
  reportWarning: ReportWarningCallback | undefined
): void {
  if (loadedFeatures.size !== featureSpec.length) {
    // Report the names of all features that could not be loaded.
    const loadedFeatureNames = new Set(Array.from(loadedFeatures.values()).map((f) => f.name));
    const missingFeatureNames = featureSpec.filter((f) => !loadedFeatureNames.has(f.name)).map((f) => f.name);

    reportWarning?.("Some features failed to load.", [
      "The following feature(s) could not be loaded and will not be shown: ",
      ...formatAsBulletList(missingFeatureNames, 5),
      LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
    ]);
  }
}

//// 3D channels ////

function resolveChannelSources(
  rawSources: ManifestChannelSource[] | undefined,
  type: "segmentation" | "backdrop",
  resolvePath: (path: string) => string | null,
  reportWarning: ReportWarningCallback | undefined
): ChannelSource[] | undefined {
  if (!rawSources || rawSources.length === 0) {
    return undefined;
  }
  const resolvedSources: ChannelSource[] = [];
  const unresolvedSources: ManifestChannelSource[] = [];
  for (let i = 0; i < rawSources.length; i++) {
    const source = rawSources[i];
    const resolvedPath = resolvePath(source.source);
    if (resolvedPath) {
      resolvedSources.push({
        ...source,
        source: resolvedPath,
        channelIndex: source.channelIndex ?? 0,
        name: source.name ?? `${i}`,
      });
    } else {
      unresolvedSources.push(source);
    }
  }
  if (unresolvedSources.length > 0) {
    reportWarning?.(`One or more ${type} channel sources could not be resolved to files, and will not be shown.`, [
      `The following ${type} channel source(s) could not be resolved:`,
      ...unresolvedSources.map((s) => `- ${s.source} (${s.name})`),
      LoadTroubleshooting.CHECK_ZIP_ZARR_DATA,
    ]);
  }
  return resolvedSources;
}

/**
 * Resolves a 3D frames object from the manifest, resolving all paths to
 * absolute URLs and adding defaults for required values.
 * @param data "frames3d" field from the manifest.
 * @returns A Frames3dData object with resolved paths, or undefined if no
 * segmentations are present.
 */
export function resolveFrames3d(
  data: ManifestFile["frames3d"],
  resolvePath: (path: string) => string | null,
  reportWarning: ReportWarningCallback | undefined
): Frames3dData | undefined {
  if (!data) {
    return undefined;
  }
  const segmentations = resolveChannelSources(data.segmentations, "segmentation", resolvePath, reportWarning);
  const backdrops = resolveChannelSources(data.backdrops, "backdrop", resolvePath, reportWarning);
  if (!segmentations) {
    return undefined;
  }
  return {
    segmentations,
    backdrops,
    totalFrames: data.totalFrames ?? 0,
  };
}

//// 2D frames ////

export function getUniqueKeyName(key: string | undefined, name: string, existingKeys: Set<string>): string {
  key = key ?? getKeyFromName(name);
  if (!existingKeys.has(key)) {
    return key;
  }
  let attempts = 1;
  let newKey = key;
  while (existingKeys.has(newKey)) {
    newKey = `${key}_${attempts}`;
    attempts++;
  }
  return newKey;
}

function resolveFrameSources(
  data: ManifestFrameSource[] | undefined,
  resolvePath: (path: string) => string | null
): FrameSource[] | undefined {
  if (!data) {
    return undefined;
  }
  const usedKeys = new Set<string>();
  const frameSources: FrameSource[] = [];
  for (let i = 0; i < data.length; i++) {
    const { frames, name: inputName, key: inputkey, description } = data[i];
    const name = inputName ?? "Segmentation " + (i + 1);
    const key = getUniqueKeyName(inputkey, name, usedKeys);
    usedKeys.add(key);
    const source = {
      name,
      key,
      description: description ?? "",
      frames: frames.map((path) => resolvePath(path)),
    };
    frameSources.push(source);
  }
  return frameSources;
}

/**
 * Resolves a 2D frames object from the manifest, resolving all paths to
 * absolute URLs and validating that the number of frames is consistent across
 * segmentations and backdrops.
 * @param data "frames2d" field from the manifest.
 * @returns A Frames2dData object with resolved paths, or undefined if no
 * segmentations or backdrops are present.
 */
export function resolveFrames2d(
  data: ManifestFile["frames2d"],
  resolvePath: (path: string) => string | null
): Frames2dData | undefined {
  if (!data) {
    return undefined;
  }
  const segmentations = resolveFrameSources(data.segmentations, resolvePath);
  const backdrops = resolveFrameSources(data.backdrops, resolvePath);

  if (!segmentations && !backdrops) {
    return undefined;
  }

  // Validation
  let frameCount = 0;
  if (segmentations) {
    // Check that all segmentations have the same length
    for (const segData of segmentations) {
      if (frameCount === 0) {
        frameCount = segData.frames.length;
      }
      if (segData.frames.length !== frameCount) {
        throw new Error(
          `Segmentation '${segData.key}' has a different number of frames (${segData.frames.length}) than the default segmentation (${frameCount}).`
        );
      }
    }
  }
  if (backdrops) {
    for (const backdropData of backdrops) {
      if (frameCount === 0) {
        frameCount = backdropData.frames.length;
      }
      if (backdropData.frames.length !== frameCount) {
        throw new Error(
          `Number of frames (${frameCount}) does not match number of images (${backdropData.frames.length}) for backdrop '${backdropData.key}'. ` +
            ` If you are a dataset author, please ensure that the number of frames in the manifest matches the number of images for each backdrop.`
        );
      }
    }
  }
  if (frameCount === 0) {
    console.error("Frame count is zero for the default segmentation.");
  }
  return {
    segmentations,
    backdrops,
  };
}
