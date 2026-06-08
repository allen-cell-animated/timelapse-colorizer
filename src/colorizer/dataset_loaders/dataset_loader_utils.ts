import type { Vector2 } from "three";

import {
  CENTROID_X_FEATURE_KEY,
  CENTROID_Y_FEATURE_KEY,
  CENTROID_Z_FEATURE_KEY,
  type FeatureData,
  FeatureType,
  TIME_FEATURE_KEY,
  TRACK_FEATURE_KEY,
} from "src/colorizer/Dataset";
import { FeatureDataType, LoadTroubleshooting, type ReportWarningCallback } from "src/colorizer/types";
import { formatAsBulletList } from "src/colorizer/utils/data_utils";
import type { ManifestFile, ManifestFileMetadata } from "src/colorizer/utils/dataset_utils";
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
  centroids: Float32Array | null,
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

export function interleaveCentroidData(
  centroidsX: Float32Array | null,
  centroidsY: Float32Array | null,
  centroidsZ: Float32Array | null
): Float32Array | null {
  if (!centroidsX && !centroidsY && !centroidsZ) {
    return null;
  }
  const length = centroidsX?.length || centroidsY?.length || centroidsZ?.length || 0;
  const interleaved = new Float32Array(length * 3);
  for (let i = 0; i < length; i++) {
    interleaved[i * 3] = centroidsX ? centroidsX[i] : 0;
    interleaved[i * 3 + 1] = centroidsY ? centroidsY[i] : 0;
    interleaved[i * 3 + 2] = centroidsZ ? centroidsZ[i] : 0;
  }
  return interleaved;
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
