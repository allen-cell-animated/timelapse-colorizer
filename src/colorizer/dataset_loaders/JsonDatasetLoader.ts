import { RGBAFormat, RGBAIntegerFormat, Vector2 } from "three";

import {
  type ArraySource,
  type FeatureArrayType,
  FeatureDataType,
  type IArrayLoader,
  type ITextureImageLoader,
  LoadTroubleshooting,
  MAX_FEATURE_CATEGORIES,
} from "src/colorizer";
import Dataset, {
  type ChannelSource,
  type FeatureData,
  FeatureType,
  type Frames2dData,
  type Frames3dData,
  type FrameSource,
} from "src/colorizer/Dataset";
import {
  addCentroidFeatures,
  addTimeFeature,
  addTrackFeature,
  getDefaultSegIds,
  reportUnloadedFeatures,
} from "src/colorizer/dataset_loaders/dataset_loader_utils";
import type { DatasetLoadOptions } from "src/colorizer/dataset_loaders/types";
import ImageFrameLoader from "src/colorizer/loaders/ImageFrameLoader";
import UrlArrayLoader from "src/colorizer/loaders/UrlArrayLoader";
import { type IPathResolver, UrlPathResolver } from "src/colorizer/path_resolvers";
import { AnalyticsEvent, triggerAnalyticsEvent } from "src/colorizer/utils/analytics";
import { getKeyFromName } from "src/colorizer/utils/data_utils";
import {
  type AnyManifestFile,
  type ManifestChannelSource,
  type ManifestFile,
  type ManifestFileMetadata,
  type ManifestFrameSource,
  updateManifestVersion,
} from "src/colorizer/utils/dataset_utils";
import { padCentroidsTo3d } from "src/colorizer/utils/math_utils";
import { fetchManifestJson, formatPath, getPromiseValue } from "src/colorizer/utils/url_utils";

export type JsonDatasetLoadOptions = DatasetLoadOptions & {
  manifestLoader?: typeof fetchManifestJson;
};

const DEFAULT_METADATA: ManifestFileMetadata = {
  frameDims: {
    width: 0,
    height: 0,
    units: "",
  },
  frameDurationSeconds: 0,
  startTimeSeconds: 0,
};

/**
 * Loads a dataset from a manifest JSON file.
 */
export default class JsonDatasetLoader {
  private arrayLoader: IArrayLoader;
  private frameLoader: ITextureImageLoader;
  private backdropLoader: ITextureImageLoader;
  private pathResolver: IPathResolver;
  private manifestLoader: (url: string) => Promise<AnyManifestFile>;
  private cleanupArrayLoaderOnDispose: boolean;

  private reportProgress: DatasetLoadOptions["reportProgress"];
  private reportWarning: DatasetLoadOptions["reportWarning"];

  private manifestUrl: string;
  private baseUrl: string;

  private numRequests: number;
  private numCompletedRequests: number;

  private datasetPromise: Promise<Dataset> | null = null;

  constructor(manifestUrl: string, options?: JsonDatasetLoadOptions) {
    const { reportProgress, reportWarning } = options ?? {};
    const { frameLoader, backdropLoader, arrayLoader, pathResolver, manifestLoader } = options ?? {};
    this.frameLoader = frameLoader ?? new ImageFrameLoader(RGBAIntegerFormat);
    this.backdropLoader = backdropLoader ?? new ImageFrameLoader(RGBAFormat);
    this.arrayLoader = arrayLoader ?? new UrlArrayLoader();
    this.pathResolver = pathResolver ?? new UrlPathResolver();
    this.manifestLoader = manifestLoader ?? fetchManifestJson;
    this.reportProgress = reportProgress ?? (() => {});
    this.reportWarning = reportWarning ?? (() => {});
    this.cleanupArrayLoaderOnDispose = !arrayLoader;

    this.manifestUrl = manifestUrl;
    this.baseUrl = formatPath(manifestUrl.substring(0, manifestUrl.lastIndexOf("/")));

    this.numCompletedRequests = 0;
    this.numRequests = 0;

    this.reportLoadProgress = this.reportLoadProgress.bind(this);
  }

  private resolveManifestPath = (url: string): string | null => {
    return this.pathResolver.resolve("", url);
  };

  private resolvePath = (url: string): string | null => {
    return this.pathResolver.resolve(this.baseUrl, url);
  };

  private parseFeatureType(
    inputType: string | undefined,
    defaultType: FeatureType = FeatureType.CONTINUOUS
  ): FeatureType {
    const isFeatureType = (inputType: string): inputType is FeatureType => {
      return Object.values(FeatureType).includes(inputType as FeatureType);
    };

    inputType = inputType?.toLowerCase() || "";
    return isFeatureType(inputType) ? inputType : defaultType;
  }

  /**
   * Loads a feature from the dataset, fetching its data from the provided url.
   * @returns A promise of an array tuple containing the feature key and its FeatureData.
   */
  private async loadFeature(
    metadata: ManifestFile["features"][number],
    index: number
  ): Promise<[string, FeatureData] | undefined> {
    const name = metadata.name;
    const key = metadata.key || getKeyFromName(name);
    const url = this.resolvePath(metadata.data);
    if (!url) {
      console.warn(`Feature ${index}: Failed to resolve URL for feature ${name}: '${metadata.data}'`);
      return undefined;
    }
    const featureType = this.parseFeatureType(metadata.type);

    let source: ArraySource<FeatureDataType.F32> | undefined;
    try {
      source = await this.arrayLoader.load(
        url,
        FeatureDataType.F32,
        metadata.min ?? undefined,
        metadata.max ?? undefined
      );
    } catch (error) {
      console.warn(`Feature ${index}: Failed to load data for feature ${name} from URL '${url}': ${error}`);
      return undefined;
    }

    const featureCategories = metadata?.categories;
    // Validation
    if (featureType === FeatureType.CATEGORICAL && !metadata?.categories) {
      console.warn(`Feature ${index}: ${name} is categorical but no categories were provided.`);
      return undefined;
    }
    if (featureCategories && featureCategories.length > MAX_FEATURE_CATEGORIES) {
      console.warn(
        `Feature ${index}: ${name} has too many categories (${featureCategories.length} > max ${MAX_FEATURE_CATEGORIES}).`
      );
      return undefined;
    }

    return [
      key,
      {
        name,
        key,
        tex: source.getTexture(),
        data: source.getBuffer(),
        min: source.getMin(),
        max: source.getMax(),
        unit: metadata.unit || "",
        type: featureType,
        categories: featureCategories || null,
        description: metadata.description || null,
      },
    ];
  }

  /**
   * Fetches and loads a data file as an array and returns its data as a TypedArray using the provided dataType.
   * @param dataType The expected format of the data.
   * @param fileUrl String url of the file to be loaded.
   * @throws An error if the data cannot be loaded from the file.
   * @returns Promise of a TypedArray loaded from the file. If `fileUrl` is undefined, returns null.
   */
  private async loadToBuffer<T extends FeatureDataType>(
    dataType: T,
    fileUrl?: string
  ): Promise<FeatureArrayType[T] | null> {
    if (!fileUrl) {
      return null;
    }
    const url = this.resolvePath(fileUrl);
    if (!url) {
      throw new Error(`Failed to resolve path: '${fileUrl}'`);
    }
    const source = await this.arrayLoader.load(url, dataType);
    return source.getBuffer();
  }

  private getFrameDims = async (frames2d: Frames2dData | undefined): Promise<Vector2 | undefined> => {
    let firstValidFramePath = null;
    const framePaths = frames2d?.segmentations?.[0]?.frames ?? [];
    for (const framePath of framePaths) {
      if (framePath) {
        firstValidFramePath = framePath;
        break;
      }
    }
    if (!firstValidFramePath) {
      return undefined;
    }
    try {
      const result = await this.frameLoader.load(firstValidFramePath);
      const frameDims = new Vector2(result.image.width, result.image.height);
      result.dispose();
      return frameDims;
    } catch (error) {
      console.warn(
        `Failed to determine frame dimensions; encountered the following error while loading frame from path '${firstValidFramePath}': ${error}`
      );
      return undefined;
    }
  };

  private resolveChannelSources(
    rawSources: ManifestChannelSource[] | undefined,
    type: "segmentation" | "backdrop"
  ): ChannelSource[] | undefined {
    if (!rawSources) {
      return [];
    }
    const resolvedSources: ChannelSource[] = [];
    const unresolvedSources: ManifestChannelSource[] = [];
    for (let i = 0; i < rawSources.length; i++) {
      const source = rawSources[i];

      const resolvedPath = this.resolvePath(source.source);
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
      this.reportWarning?.(
        `One or more ${type} channel sources could not be resolved to files, and will not be shown.`,
        [
          `The following ${type} channel source(s) could not be resolved:`,
          ...unresolvedSources.map((s) => `- ${s.source} (${s.name})`),
          LoadTroubleshooting.CHECK_ZIP_ZARR_DATA,
        ]
      );
    }
    return resolvedSources;
  }

  private resolveAndValidateFrames3d(data: ManifestFile["frames3d"]): Frames3dData | undefined {
    if (!data) {
      return undefined;
    }
    const segmentations = this.resolveChannelSources(data.segmentations, "segmentation");
    const backdrops = this.resolveChannelSources(data.backdrops, "backdrop");
    if (!segmentations) {
      return undefined;
    }
    return {
      segmentations,
      totalFrames: data.totalFrames ?? 0,
      backdrops,
    };
  }

  private getUniqueKeyName(key: string, name: string, existingKeys: Set<string>): string {
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

  private resolveFrameSources(data: ManifestFrameSource[] | undefined): FrameSource[] | undefined {
    if (!data) {
      return undefined;
    }
    const usedKeys = new Set<string>();
    const frameSources: FrameSource[] = [];
    for (let i = 0; i < data.length; i++) {
      const { frames, name: inputName, key, description } = data[i];
      const name = inputName ?? "Segmentation " + (i + 1);
      const source = {
        name: name ?? "",
        key: this.getUniqueKeyName(key ?? "", name, usedKeys),
        description: description ?? "",
        frames: frames.map((path) => this.resolvePath(path)),
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
   * segmentations are present.
   */
  private resolveFrames2d(data: ManifestFile["frames2d"]): Frames2dData | undefined {
    if (!data) {
      return undefined;
    }
    const segmentations = this.resolveFrameSources(data.segmentations);
    const backdrops = this.resolveFrameSources(data.backdrops);

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

  private reportLoadProgress<T>(promise: Promise<T>): Promise<T> {
    this.numRequests++;
    promise.finally(() => {
      this.numCompletedRequests++;
      this.reportProgress?.(this.numCompletedRequests, this.numRequests);
    });
    return promise;
  }

  private async loadDataset(): Promise<Dataset> {
    const startTime = new Date();

    const resolvedManifestUrl = this.resolveManifestPath(this.manifestUrl);
    if (resolvedManifestUrl === null) {
      // TODO: Currently, only the FilePathResolver (used for ZIP files) can
      // return `null` when resolving paths, which indicates that a file does
      // not exist. If support for loading from other sources (local folders,
      // etc.) is added, Dataset will need to store metadata about the source.
      throw new Error(`No '${this.manifestUrl}' was found. ${LoadTroubleshooting.CHECK_ZIP_FORMAT_MANIFEST}`);
    }
    const manifest = updateManifestVersion(await this.manifestLoader(resolvedManifestUrl));

    const frames2d = this.resolveFrames2d(manifest.frames2d);
    const frames3d = this.resolveAndValidateFrames3d(manifest.frames3d);
    const outlierFile = manifest.outliers;
    const metadata = { ...DEFAULT_METADATA, ...manifest.metadata };

    const tracksFile = manifest.tracks;
    const timesFile = manifest.times;
    const centroidsFile = manifest.centroids;
    const boundsFile = manifest.bounds;
    const segIdsFile = manifest.segIds;

    // Load feature data
    const featuresPromises: Promise<[string, FeatureData] | undefined>[] = Array.from(manifest.features).map(
      (data, index) => this.reportLoadProgress(this.loadFeature(data, index))
    );

    const result = await Promise.allSettled([
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U8, outlierFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, tracksFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, timesFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, centroidsFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, boundsFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, segIdsFile)),
      this.reportLoadProgress(this.getFrameDims(frames2d)),
      ...featuresPromises,
    ]);
    const [
      outliersResult,
      tracksResult,
      timesResult,
      centroidsResult,
      boundsResult,
      frameIdOffsetsResult,
      frameDimensionsResult,
      ...featureResults
    ] = result;

    const unloadableDataFiles: string[] = [];
    function makeLoadFailedCallback(fileType: string, url?: string): (reason: any) => void {
      return (reason: any) => {
        console.warn(`${fileType} data could not be loaded: ${reason}`);
        unloadableDataFiles.push(`${fileType}: '${url || "N/A"}'`);
      };
    }

    const outliers = getPromiseValue(outliersResult, makeLoadFailedCallback("Outliers", outlierFile));
    const trackIds = getPromiseValue(tracksResult, makeLoadFailedCallback("Tracks", tracksFile));
    const times = getPromiseValue(timesResult, makeLoadFailedCallback("Times", timesFile));
    let centroids = getPromiseValue(centroidsResult, makeLoadFailedCallback("Centroids", centroidsFile));
    const bounds = getPromiseValue(boundsResult, makeLoadFailedCallback("Bounds", boundsFile));
    let segIds = getPromiseValue(frameIdOffsetsResult, makeLoadFailedCallback("Segmentation IDs", segIdsFile));
    const frameDimensions = getPromiseValue(frameDimensionsResult, makeLoadFailedCallback("Frame Dimensions"));

    if (unloadableDataFiles.length > 0) {
      // Report warning of all the files that couldn't be loaded and their associated errors.
      this.reportWarning?.("Some data files failed to load.", [
        "The following data file(s) failed to load, which may cause the viewer to behave unexpectedly:",
        ...unloadableDataFiles.map((fileType) => ` - ${fileType}`),
        LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
      ]);
    }

    // Keep original sorting order of features by inserting in promise order.
    const features = new Map<string, FeatureData>();
    featureResults.forEach((result) => {
      // Load failures are already logged in `loadFeature`, so rejected promises
      // are ignored.
      const featureValue = getPromiseValue(result);
      if (featureValue) {
        const [key, data] = featureValue;
        features.set(key, data);
      }
    });

    //// Post-processing and validation steps ////

    reportUnloadedFeatures(manifest.features, features, this.reportWarning);

    const numObjects =
      features.values().next().value?.data.length || times?.length || trackIds?.length || segIds?.length || 0;
    segIds = segIds ?? getDefaultSegIds(numObjects);
    centroids = centroids && padCentroidsTo3d(centroids, numObjects);

    addCentroidFeatures(features, centroids, metadata, frames3d ? undefined : frameDimensions);
    addTimeFeature(features, times);
    addTrackFeature(features, trackIds);

    // Analytics reporting
    triggerAnalyticsEvent(AnalyticsEvent.DATASET_LOAD, {
      datasetWriterVersion: metadata.writerVersion || "N/A",
      datasetTotalObjects: numObjects,
      datasetFeatureCount: manifest.features.length,
      datasetFrameCount: frames2d?.segmentations?.[0]?.frames?.length || frames3d?.totalFrames || 0,
      datasetLoadTimeMs: new Date().getTime() - startTime.getTime(),
    });

    return new Dataset(
      {
        manifestUrl: resolvedManifestUrl,
        metadata,
        // Image sources
        frames2d,
        frames3d,
        frameResolution: frameDimensions ?? undefined,
        // Data arrays
        features,
        segIds,
        times,
        trackIds,
        centroids,
        bounds,
        outliers,
      },
      { frameLoader: this.frameLoader, backdropLoader: this.backdropLoader }
    );
  }

  /** Opens the dataset. */
  public async open(): Promise<Dataset> {
    if (!this.datasetPromise) {
      this.datasetPromise = this.loadDataset();
    }
    return this.datasetPromise;
  }

  public dispose(): void {
    if (this.cleanupArrayLoaderOnDispose) {
      this.arrayLoader.dispose();
    }
    this.datasetPromise = null;
  }
}
