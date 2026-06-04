import { RGBAFormat, RGBAIntegerFormat, Vector2 } from "three";

import {
  type FeatureArrayType,
  FeatureDataType,
  type IArrayLoader,
  type ITextureImageLoader,
  LoadTroubleshooting,
  MAX_FEATURE_CATEGORIES,
} from "src/colorizer";
import Dataset, { type Backdrop3dData, type FeatureData, FeatureType, type Frames3dData } from "src/colorizer/Dataset";
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
  type ManifestFile,
  type ManifestFileMetadata,
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
  private async loadFeature(metadata: ManifestFile["features"][number]): Promise<[string, FeatureData]> {
    const name = metadata.name;
    const key = metadata.key || getKeyFromName(name);
    const url = this.resolvePath(metadata.data);
    if (!url) {
      throw new Error(`Failed to resolve URL for feature ${name}: '${metadata.data}'`);
    }
    const featureType = this.parseFeatureType(metadata.type);

    const source = await this.arrayLoader.load(
      url,
      FeatureDataType.F32,
      metadata.min ?? undefined,
      metadata.max ?? undefined
    );

    const featureCategories = metadata?.categories;
    // Validation
    if (featureType === FeatureType.CATEGORICAL && !metadata?.categories) {
      throw new Error(`Feature ${name} is categorical but no categories were provided.`);
    }
    if (featureCategories && featureCategories.length > MAX_FEATURE_CATEGORIES) {
      throw new Error(
        `Feature ${name} has too many categories (${featureCategories.length} > max ${MAX_FEATURE_CATEGORIES}).`
      );
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

  private getFrameDims = async (frameFiles: (string | null)[] | undefined): Promise<Vector2 | undefined> => {
    if (!frameFiles || frameFiles.length === 0) {
      return undefined;
    }
    let firstValidFramePath = null;
    for (const framePath of frameFiles) {
      if (framePath) {
        firstValidFramePath = framePath;
        break;
      }
    }
    if (!firstValidFramePath) {
      return undefined;
    }
    const result = await this.frameLoader.load(firstValidFramePath);
    return new Vector2(result.image.width, result.image.height);
  };

  private resolveAndValidateFrames3d(data: ManifestFile["frames3d"]): Frames3dData | undefined {
    if (!data) {
      return undefined;
    }
    const frameSource = this.resolvePath(data.source);
    const backdrops: Backdrop3dData[] = [];
    if (!frameSource) {
      // This will only happen if using a file path resolver, if this file does
      // not exist in a ZIP file.

      // TODO: This will fail for Zarrs, which are directories and not files, so
      // `resolvePath` will return `null`. Even if `resolvePath` did handle
      // directories, Zarrs index from the directory root, which is provided as
      // a Object URL. Adding additional paths to the end of an Object URL (e.g.
      // TCZYX specifiers for zarrs, like `/0/0/0`) does not result in a working
      // URL. This means there is no way to make the current path resolver work
      // without overriding `fetch` in dependency libraries (vole-core).
      throw new Error(
        `Failed to resolve path for 3D frame source '${data.source}'. ${LoadTroubleshooting.CHECK_ZIP_ZARR_DATA}`
      );
    }
    // Validate backdrops
    if (data.backdrops) {
      const failedBackdrops: Backdrop3dData[] = [];
      for (const backdrop of data.backdrops) {
        const backdropSource = this.resolvePath(backdrop.source);
        if (!backdropSource) {
          failedBackdrops.push({ channelIndex: 0, ...backdrop });
          continue;
        }
        backdrops.push({
          ...backdrop,
          channelIndex: backdrop.channelIndex ?? 0,
          source: backdropSource,
        });
      }
      if (failedBackdrops.length > 0) {
        this.reportWarning?.("One or more 3D backdrop sources could not be resolved to files, and will not be shown.", [
          "The following backdrop source(s) could not be resolved:",
          ...failedBackdrops.map((b) => `- ${b.source} (${b.name})`),
          LoadTroubleshooting.CHECK_ZIP_ZARR_DATA,
        ]);
      }
    }
    return {
      source: frameSource,
      segmentationChannel: data.segmentationChannel ?? 0,
      totalFrames: data.totalFrames ?? 0,
      backdrops,
    };
  }

  private reportLoadProgress<T>(promise: Promise<T>): Promise<T> {
    this.numRequests++;
    return promise.then((result) => {
      this.numCompletedRequests++;
      this.reportProgress?.(this.numCompletedRequests, this.numRequests);
      return result;
    });
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

    const frameFiles = manifest.frames?.map((frame) => this.resolvePath(frame));
    const frames3d = this.resolveAndValidateFrames3d(manifest.frames3d);
    const outlierFile = manifest.outliers;
    const metadata = { ...DEFAULT_METADATA, ...manifest.metadata };

    const tracksFile = manifest.tracks;
    const timesFile = manifest.times;
    const centroidsFile = manifest.centroids;
    const boundsFile = manifest.bounds;
    const segIdsFile = manifest.segIds;

    const backdrops = new Map<string, { name: string; frames: (string | null)[] }>();

    if (manifest.backdrops && manifest.frames) {
      for (const { name, key, frames: backdropFrames } of manifest.backdrops) {
        const resolvedBackdropFrames = backdropFrames.map((path) => this.resolvePath(path));
        backdrops.set(key, { name, frames: resolvedBackdropFrames });
        if (resolvedBackdropFrames.length !== (frameFiles?.length ?? 0)) {
          throw new Error(
            `Number of frames (${frameFiles?.length}) does not match number of images (${backdropFrames.length}) for backdrop '${key}'. ` +
              ` If you are a dataset author, please ensure that the number of frames in the manifest matches the number of images for each backdrop.`
          );
        }
      }
    }

    // Load feature data
    const featuresPromises: Promise<[string, FeatureData]>[] = Array.from(manifest.features).map((data) =>
      this.reportLoadProgress(this.loadFeature(data))
    );

    const result = await Promise.allSettled([
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U8, outlierFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, tracksFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, timesFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, centroidsFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, boundsFile)),
      this.reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, segIdsFile)),
      this.reportLoadProgress(this.getFrameDims(frameFiles)),
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
    featureResults.forEach((result, index) => {
      const onFeatureLoadFailed = (reason: any): void => console.warn(`Feature ${index}: `, reason);
      const featureValue = getPromiseValue(result, onFeatureLoadFailed);
      if (featureValue) {
        const [key, data] = featureValue;
        features.set(key, data);
      }
    });

    //// Post-processing and validation steps ////

    const numObjects = features.values().next().value?.data.length || times?.length || trackIds?.length || 0;

    reportUnloadedFeatures(manifest.features, features, this.reportWarning);

    segIds = segIds ?? getDefaultSegIds(numObjects);
    centroids = centroids && padCentroidsTo3d(centroids, numObjects);

    addCentroidFeatures(features, centroids, metadata, frames3d ? undefined : frameDimensions);
    addTimeFeature(features, times);
    addTrackFeature(features, trackIds);

    // Analytics reporting
    triggerAnalyticsEvent(AnalyticsEvent.DATASET_LOAD, {
      datasetWriterVersion: metadata.writerVersion || "N/A",
      datasetTotalObjects: numObjects,
      datasetFeatureCount: features.size,
      datasetFrameCount: frameFiles?.length || frames3d?.totalFrames || 0,
      datasetLoadTimeMs: new Date().getTime() - startTime.getTime(),
    });

    // TODO: Resolve all frame and backdrop paths
    return new Dataset(
      {
        manifestUrl: resolvedManifestUrl,
        metadata,
        // Image sources
        frameFiles,
        frames3d,
        backdrops,
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
