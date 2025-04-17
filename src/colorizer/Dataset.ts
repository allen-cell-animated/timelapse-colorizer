import { DataTexture, RGBAFormat, RGBAIntegerFormat, Texture, Vector2 } from "three";

import { MAX_FEATURE_CATEGORIES } from "../constants";
import {
  FeatureArrayType,
  FeatureDataType,
  LoadErrorMessage,
  LoadTroubleshooting,
  ReportWarningCallback,
} from "./types";
import { AnalyticsEvent, triggerAnalyticsEvent } from "./utils/analytics";
import { formatAsBulletList, getKeyFromName } from "./utils/data_utils";
import { ManifestFile, ManifestFileMetadata, updateManifestVersion } from "./utils/dataset_utils";
import * as urlUtils from "./utils/url_utils";

import DataCache from "./DataCache";
import { IArrayLoader, ITextureImageLoader } from "./loaders/ILoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import UrlArrayLoader from "./loaders/UrlArrayLoader";
import Track from "./Track";

export enum FeatureType {
  CONTINUOUS = "continuous",
  DISCRETE = "discrete",
  CATEGORICAL = "categorical",
}

export type FeatureData = {
  name: string;
  key: string;
  data: Float32Array;
  tex: DataTexture;
  min: number;
  max: number;
  unit: string;
  type: FeatureType;
  categories: string[] | null;
  description: string | null;
};

type BackdropData = {
  name: string;
  frames: string[];
};

const defaultMetadata: ManifestFileMetadata = {
  frameDims: {
    width: 0,
    height: 0,
    units: "",
  },
  frameDurationSeconds: 0,
  startTimeSeconds: 0,
};

const MAX_CACHED_FRAME_BYTES = 500_000_000; // 500 MB
const MAX_CACHED_BACKDROPS_BYTES = 500_000_000; // 500 MB

export default class Dataset {
  private frameLoader: ITextureImageLoader;
  private frameFiles?: string[];
  private frames: DataCache<number, Texture> | null;
  private frameDimensions: Vector2 | null;

  /** Source for 3D data, resolved to http/https URLs. */
  public frames3dSrc?: string | string[];
  /** Index of the segmentation channel in the 3D data. */
  public segmentationChannel?: number;
  private totalFrames3d?: number;

  private segIdsFile?: string;
  /** Lookup from a global index of an object to the raw segmentation ID in the
   * frame/image where it appears. */
  public segIds?: Uint32Array | null;
  /**
   * Lookup table from a frame number to the offsets with which to read data
   * from globally-indexed arrays for objects on that frame. Note that this
   * assumes that all objects in a frame have segmentation IDs that are
   * monotonically increasing (e.g. skips no values), and that a frame's objects
   * all have adjacent indices in the global array.
   *
   * For any object with segmentation ID `segId` at time `t`, the global
   * index of that object is given by `segId + frameToIdOffsets[t]`.
   */
  public frameToIdOffset: Uint32Array | null;

  private backdropLoader: ITextureImageLoader;
  private backdropData: Map<string, BackdropData>;
  private backdropFrames: DataCache<string, Texture> | null;

  private arrayLoader: IArrayLoader;
  private cleanupArrayLoaderOnDispose: boolean;
  // Use map to enforce ordering
  /** Ordered map from feature keys to feature data. */
  private features: Map<string, FeatureData>;

  private outlierFile?: string;
  public outliers?: Uint8Array | null;

  private tracksFile?: string;
  private timesFile?: string;
  public trackIds?: Uint32Array | null;
  public times?: Uint32Array | null;
  private cachedTracks: Map<number, Track | null>;

  public centroidsFile?: string;
  public centroids?: Uint16Array | null;

  public boundsFile?: string;
  public bounds?: Uint16Array | null;

  public metadata: ManifestFileMetadata;

  public baseUrl: string;
  public manifestUrl: string;
  private hasOpened: boolean;

  /**
   * Constructs a new Dataset using the provided manifest path.
   * @param manifestUrl Must be a path to a .json manifest file.
   * @param frameLoader Optional.
   * @param arrayLoader Optional.
   */
  constructor(manifestUrl: string, frameLoader?: ITextureImageLoader, arrayLoader?: IArrayLoader) {
    this.manifestUrl = manifestUrl;

    this.baseUrl = urlUtils.formatPath(manifestUrl.substring(0, manifestUrl.lastIndexOf("/")));
    this.hasOpened = false;

    this.frameLoader = frameLoader || new ImageFrameLoader(RGBAIntegerFormat);
    this.frameFiles = [];
    this.frames = null;
    this.backdropFrames = null;
    this.frameDimensions = null;

    this.frameToIdOffset = null;

    this.backdropLoader = frameLoader || new ImageFrameLoader(RGBAFormat);
    this.backdropData = new Map();

    this.cleanupArrayLoaderOnDispose = !arrayLoader;
    this.arrayLoader = arrayLoader || new UrlArrayLoader();
    this.features = new Map();
    this.cachedTracks = new Map();
    this.metadata = defaultMetadata;
  }

  private resolvePathToUrl = (url: string): string => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    } else {
      return `${this.baseUrl}/${url}`;
    }
  };

  private resolvePathsToUrls = <T extends string | string[]>(url: T): T => {
    if (Array.isArray(url)) {
      return url.map((u) => this.resolvePathToUrl(u)) as T;
    }
    return this.resolvePathToUrl(url) as T;
  };

  private parseFeatureType(inputType: string | undefined, defaultType = FeatureType.CONTINUOUS): FeatureType {
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
    const url = this.resolvePathToUrl(metadata.data);
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

  public hasFeatureKey(key: string): boolean {
    return this.featureKeys.includes(key);
  }

  /**
   * Returns the feature key if a feature with a matching key or name exists in the
   * dataset.
   * @param keyOrName String key or name of the feature to find.
   * @returns The feature key if found, otherwise undefined.
   */
  public findFeatureByKeyOrName(keyOrName: string): string | undefined {
    if (this.hasFeatureKey(keyOrName)) {
      return keyOrName;
    } else {
      return this.findFeatureKeyFromName(keyOrName);
    }
  }

  /**
   * Attempts to find a matching feature key for a feature name.
   * @returns The feature key if found, otherwise undefined.
   */
  public findFeatureKeyFromName(name: string): string | undefined {
    return Array.from(this.features.values()).find((f) => f.name === name)?.key;
  }

  /**
   * Attempts to get the feature data from this dataset for the given feature key.
   * Returns `undefined` if feature is not in the dataset.
   */
  public getFeatureData(key: string): FeatureData | undefined {
    return this.features.get(key);
  }

  public getFeatureName(key: string): string | undefined {
    return this.features.get(key)?.name;
  }

  /**
   * Gets the feature's units if it exists; otherwise returns an empty string.
   */
  public getFeatureUnits(key: string): string {
    return this.getFeatureData(key)?.unit || "";
  }

  public getFeatureNameWithUnits(key: string): string {
    const name = this.getFeatureName(key);
    if (!name) {
      return "N/A";
    }
    const units = this.getFeatureUnits(key);
    if (units) {
      return `${name} (${units})`;
    } else {
      return name;
    }
  }

  /**
   * Returns the FeatureType of the given feature, if it exists.
   * @param key Feature key to retrieve
   * @throws An error if the feature does not exist.
   * @returns The FeatureType of the given feature (categorical, continuous, or discrete)
   */
  public getFeatureType(key: string): FeatureType {
    const featureData = this.getFeatureData(key);
    if (featureData === undefined) {
      throw new Error("Feature '" + key + "' does not exist in dataset.");
    }
    return featureData.type;
  }

  /**
   * Returns the array of string categories for the given feature, if it exists and is categorical.
   * @param key Feature key to retrieve.
   * @returns The array of string categories for the given feature, or null if the feature is not categorical.
   */
  public getFeatureCategories(key: string): string[] | null {
    const featureData = this.getFeatureData(key);
    if (featureData === undefined) {
      throw new Error("Feature '" + key + "' does not exist in dataset.");
    }
    if (featureData.type === FeatureType.CATEGORICAL) {
      return featureData.categories;
    }
    return null;
  }

  /** Returns whether the given feature represents categorical data. */
  public isFeatureCategorical(key: string): boolean {
    const featureData = this.getFeatureData(key);
    return featureData !== undefined && featureData.type === FeatureType.CATEGORICAL;
  }

  public has2dFrames(): boolean {
    return this.frameFiles !== undefined;
  }

  public has3dFrames(): boolean {
    return this.frames3dSrc !== undefined;
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

    const url = this.resolvePathToUrl(fileUrl);
    const source = await this.arrayLoader.load(url, dataType);
    return source.getBuffer();
  }

  public get numberOfFrames(): number {
    return this.getTotalFrames();
  }

  public get featureKeys(): string[] {
    return Array.from(this.features.keys());
  }

  public get numObjects(): number {
    const featureData = this.getFeatureData(this.featureKeys[0]);
    if (!featureData) {
      throw new Error("Dataset.numObjects: The first feature could not be loaded. Is the dataset manifest file valid?");
    }
    return featureData.data.length;
  }

  /** Loads a single frame from the dataset */
  public async loadFrame(index: number): Promise<Texture | undefined> {
    if (index < 0 || this.frameFiles === undefined || index >= this.frameFiles.length) {
      return undefined;
    }

    const cachedFrame = this.frames?.get(index);
    if (cachedFrame) {
      this.frameDimensions = new Vector2(cachedFrame.image.width, cachedFrame.image.height);
      return cachedFrame;
    }

    // Allow for undefined or null frame files in the manifest
    if (this.frameFiles[index] === undefined || this.frameFiles[index] === null) {
      return undefined;
    }

    const fullUrl = this.resolvePathToUrl(this.frameFiles[index]);
    const loadedFrame = await this.frameLoader.load(fullUrl);
    this.frameDimensions = new Vector2(loadedFrame.image.width, loadedFrame.image.height);
    const frameSizeBytes = loadedFrame.image.width * loadedFrame.image.height * 4;
    // Note that, due to image compression, images may take up much less space in memory than their raw size.
    this.frames?.insert(index, loadedFrame, frameSizeBytes);
    return loadedFrame;
  }

  public getDefaultBackdropKey(): string | null {
    return this.backdropData.keys().next().value ?? null;
  }

  public hasBackdrop(key: string): boolean {
    return this.backdropData.has(key);
  }

  /**
   * Returns a map from backdrop keys to data.
   */
  public getBackdropData(): Map<string, BackdropData> {
    return new Map(this.backdropData);
  }

  public async loadBackdrop(key: string, index: number): Promise<Texture | undefined> {
    // TODO: Implement caching
    const cacheKey = `${key}-${index}`;
    const cachedFrame = this.backdropFrames?.get(cacheKey);
    if (cachedFrame) {
      return cachedFrame;
    }

    const frames = this.backdropData.get(key)?.frames;
    // TODO: Wrapping or clamping?
    if (!frames || index < 0 || index >= frames.length) {
      return undefined;
    }

    const fullUrl = this.resolvePathToUrl(frames[index]);
    const loadedFrame = await this.backdropLoader.load(fullUrl);
    this.backdropFrames?.insert(cacheKey, loadedFrame);
    return loadedFrame;
  }

  /**
   * Returns a lookup table of ID offsets for each time in the dataset, used to
   * get the global indices for objects in the image/frame data.
   *
   * When looking up data for an object with segmentation ID `segId` in the
   * image/frame data at time `t`, the global index of the object is given by
   * `segId + frameToIdOffsets[t]`.
   *
   * NOTE: This makes a lot of VERY LARGE assumptions about the frame data,
   * namely that either:
   * - Frame data has segmentation IDs that are globally unique, OR
   * - Frame data has segmentation IDs that increase monotonically (e.g. 2, 3,
   *   4, 5, etc.) on that frame.
   *
   * The second assumption breaks down if there are any skipped segmentation IDs
   * in the frame. A future, more robust version of this is described in
   * https://github.com/allen-cell-animated/timelapse-colorizer/issues/630.
   */
  private buildFrameToIdOffsetsFromSegIds(): Uint32Array {
    // Get the index of the object with the smallest segmentation ID for each
    // frame.
    const frameToSmallestSegIdIdx: number[] = Array.from({ length: this.numberOfFrames }).fill(-1) as number[];
    for (let idx = 0; idx < this.numObjects; idx++) {
      const time = this.times![idx];
      const segId = this.segIds?.[idx] ?? idx;
      if (frameToSmallestSegIdIdx[time] === -1) {
        frameToSmallestSegIdIdx[time] = idx;
      } else {
        const lastMinSegId = this.segIds?.[frameToSmallestSegIdIdx[time]] ?? Infinity;
        if (segId < lastMinSegId) {
          frameToSmallestSegIdIdx[time] = idx;
        }
      }
    }
    // Get offset between the segmentation ID and the global index for each frame.
    const frameToIdOffsets = frameToSmallestSegIdIdx.map((idx) => {
      return idx === -1 ? 0 : idx - (this.segIds?.[idx] ?? idx + 1) + 1;
    });
    return new Uint32Array(frameToIdOffsets);
  }

  /**
   * Gets the resolution of the last loaded frame.
   * If no frame has been loaded yet, returns (1,1)
   */
  public get frameResolution(): Vector2 {
    return this.frameDimensions || new Vector2(1, 1);
  }

  /**
   * Opens the dataset and loads all necessary files from the manifest.
   * @param options Configuration options for the dataset loader.
   * - `manifestLoader` The function used to load the manifest JSON data. If undefined, uses a default fetch method.
   * - `onLoadStart` Called once for each data file (other than the manifest) that starts an async load process.
   * - `onLoadComplete` Called once when each data file finishes loading.
   * - `reportWarning` Called with a string or array of strings to report warnings to the user. These are non-fatal errors.
   * @returns A Promise that resolves when loading completes.
   */
  public async open(
    options: Partial<{
      manifestLoader: typeof urlUtils.fetchManifestJson;
      onLoadStart?: () => void;
      onLoadComplete?: () => void;
      reportWarning?: ReportWarningCallback;
    }> = {}
  ): Promise<void> {
    if (this.hasOpened) {
      return;
    }
    this.hasOpened = true;

    if (!options.manifestLoader) {
      options.manifestLoader = urlUtils.fetchManifestJson;
    }

    const startTime = new Date();

    const manifest = updateManifestVersion(await options.manifestLoader(this.manifestUrl));

    this.frameFiles = manifest.frames;
    const frames3dSrc = manifest.frames3d?.source;
    this.frames3dSrc = frames3dSrc ? this.resolvePathsToUrls(frames3dSrc) : undefined;
    this.segmentationChannel = manifest.frames3d?.segmentationChannel ?? 0;
    this.totalFrames3d = manifest.frames3d?.totalFrames ?? 0;
    this.outlierFile = manifest.outliers;
    this.metadata = { ...defaultMetadata, ...manifest.metadata };

    this.tracksFile = manifest.tracks;
    this.timesFile = manifest.times;
    this.centroidsFile = manifest.centroids;
    this.boundsFile = manifest.bounds;
    this.segIdsFile = manifest.segIds;

    if (manifest.backdrops && manifest.frames) {
      for (const { name, key, frames } of manifest.backdrops) {
        this.backdropData.set(key, { name, frames });
        if (frames.length !== this.frameFiles?.length || 0) {
          throw new Error(
            `Number of frames (${this.frameFiles?.length}) does not match number of images (${frames.length}) for backdrop '${key}'. ` +
              ` If you are a dataset author, please ensure that the number of frames in the manifest matches the number of images for each backdrop.`
          );
        }
      }
    }

    this.frames = new DataCache(MAX_CACHED_FRAME_BYTES);
    this.backdropFrames = new DataCache(MAX_CACHED_BACKDROPS_BYTES);

    // Wrap an async operation and report progress when it starts + completes
    const reportLoadProgress = async <T>(promise: Promise<T>): Promise<T> => {
      options.onLoadStart?.();
      return promise.then((result) => {
        options.onLoadComplete?.();
        return result;
      });
    };

    // Load feature data
    if (manifest.features.length === 0) {
      throw new Error(LoadErrorMessage.MANIFEST_HAS_NO_FEATURES);
    }
    const featuresPromises: Promise<[string, FeatureData]>[] = Array.from(manifest.features).map((data) =>
      reportLoadProgress(this.loadFeature(data))
    );

    const result = await Promise.allSettled([
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U8, this.outlierFile)),
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, this.tracksFile)),
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, this.timesFile)),
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, this.centroidsFile)),
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U16, this.boundsFile)),
      reportLoadProgress(this.loadToBuffer(FeatureDataType.U32, this.segIdsFile)),
      reportLoadProgress(this.loadFrame(0)),
      ...featuresPromises,
    ]);
    const [outliers, tracks, times, centroids, bounds, frameIdOffsets, _loadedFrame, ...featureResults] = result;

    const unloadableDataFiles: string[] = [];
    function makeLoadFailedCallback(fileType: string, url?: string): (reason: any) => void {
      return (reason: any) => {
        console.warn(`${fileType} data could not be loaded: ${reason}`);
        unloadableDataFiles.push(`${fileType}: '${url || "N/A"}'`);
      };
    }

    this.outliers = urlUtils.getPromiseValue(outliers, makeLoadFailedCallback("Outliers", this.outlierFile));
    this.trackIds = urlUtils.getPromiseValue(tracks, makeLoadFailedCallback("Tracks", this.tracksFile));
    this.times = urlUtils.getPromiseValue(times, makeLoadFailedCallback("Times", this.timesFile));
    this.centroids = urlUtils.getPromiseValue(centroids, makeLoadFailedCallback("Centroids", this.centroidsFile));
    this.bounds = urlUtils.getPromiseValue(bounds, makeLoadFailedCallback("Bounds", this.boundsFile));
    this.segIds = urlUtils.getPromiseValue(frameIdOffsets, makeLoadFailedCallback("Segmentation IDs", this.segIdsFile));

    if (unloadableDataFiles.length > 0) {
      // Report warning of all the files that couldn't be loaded and their associated errors.
      options.reportWarning?.("Some data files failed to load.", [
        "The following data file(s) failed to load, which may cause the viewer to behave unexpectedly:",
        ...unloadableDataFiles.map((fileType) => ` - ${fileType}`),
        LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
      ]);
    }

    // Keep original sorting order of features by inserting in promise order.
    featureResults.forEach((result, index) => {
      const onFeatureLoadFailed = (reason: any): void => console.warn(`Feature ${index}: `, reason);
      const featureValue = urlUtils.getPromiseValue(result, onFeatureLoadFailed);
      if (featureValue) {
        const [key, data] = featureValue;
        this.features.set(key, data);
      }
    });

    if (this.features.size !== manifest.features.length) {
      // Report the names of all features that could not be loaded.
      const loadedFeatureNames = new Set(Array.from(this.features.values()).map((f) => f.name));
      const missingFeatureNames = manifest.features.filter((f) => !loadedFeatureNames.has(f.name)).map((f) => f.name);

      options.reportWarning?.("Some features failed to load.", [
        "The following feature(s) could not be loaded and will not be shown: ",
        ...formatAsBulletList(missingFeatureNames, 5),
        LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
      ]);
    }

    // Construct default array of segmentation IDs if not provided in the manifest.
    if (!this.segIds) {
      // Construct default segIds array (0, 1, 2, ...)
      this.segIds = new Uint32Array(this.numObjects);
      for (let i = 0; i < this.numObjects; i++) {
        this.segIds[i] = i;
      }
    }
    // Construct offset array for frame IDs to segmentation IDs.
    this.frameToIdOffset = this.buildFrameToIdOffsetsFromSegIds();

    // Analytics reporting
    triggerAnalyticsEvent(AnalyticsEvent.DATASET_LOAD, {
      datasetWriterVersion: this.metadata.writerVersion || "N/A",
      datasetTotalObjects: this.numObjects,
      datasetFeatureCount: this.features.size,
      datasetFrameCount: this.numberOfFrames,
      datasetLoadTimeMs: new Date().getTime() - startTime.getTime(),
    });

    // TODO: Pre-process feature data to handle outlier values by interpolating between known good values (#21)
  }

  /** Frees the GPU resources held by this dataset */
  public dispose(): void {
    Object.values(this.features).forEach(({ tex }) => tex.dispose());
    this.frames?.dispose();
    this.backdropFrames?.dispose();
    // Cleanup array loader if it was created in the constructor
    if (this.cleanupArrayLoaderOnDispose) {
      this.arrayLoader.dispose();
    }
    this.cachedTracks.clear();
  }

  /** get frame index of a given cell id */
  public getTime(index: number): number {
    return this.times?.[index] || 0;
  }

  public getTotalFrames(): number {
    if (this.has2dFrames()) {
      return this.frameFiles?.length ?? 0;
    } else {
      return this.totalFrames3d ?? 0;
    }
  }

  public isValidFrameIndex(index: number): boolean {
    return index >= 0 && index < this.getTotalFrames();
  }

  /** get track id of a given cell id */
  public getTrackId(index: number): number {
    return this.trackIds?.[index] || 0;
  }

  /**
   * Returns the 2D centroid of a given object id.
   */
  public getCentroid(objectId: number): [number, number] | undefined {
    const index = objectId * 2;
    const x = this.centroids?.[index];
    const y = this.centroids?.[index + 1];
    if (x && y) {
      return [x, y];
    }
    return undefined;
  }

  private getIdsOfTrack(trackId: number): number[] {
    return this.trackIds?.reduce((arr: number[], elem: number, ind: number) => {
      if (elem === trackId) arr.push(ind);
      return arr;
    }, []) as number[];
  }

  public getTrack(trackId: number): Track | null {
    const cachedTrack = this.cachedTracks.get(trackId);
    if (cachedTrack !== undefined) {
      return cachedTrack;
    }

    // trackIds contains a track id for every cell id in order.
    // get all cell ids for given track
    const ids = this.trackIds ? this.getIdsOfTrack(trackId) : [];
    // ids now contains all cell ids that have trackId.
    // get all the times for those cells, in the same order
    const times = this.times ? ids.map((i) => (this.times ? this.times[i] : 0)) : [];

    let centroids: number[] = [];
    if (this.centroids) {
      centroids = ids.reduce((result, i) => {
        result.push(this.centroids![2 * i], this.centroids![2 * i + 1]);
        return result;
      }, [] as number[]);
    }

    let bounds: number[] = [];
    if (this.bounds) {
      bounds = ids.reduce((result, i) => {
        result.push(this.bounds![4 * i], this.bounds![4 * i + 1], this.bounds![4 * i + 2], this.bounds![4 * i + 3]);
        return result;
      }, [] as number[]);
    }

    let track = null;
    if (ids.length > 0) {
      track = new Track(trackId, times, ids, centroids, bounds);
    }
    this.cachedTracks.set(trackId, track);
    return track;
  }

  /*
   * Get the times and values of a track for a given feature
   * this data is suitable to hand to d3 or plotly as two arrays of domain and range values
   */
  public buildTrackFeaturePlot(track: Track, featureKey: string): { domain: number[]; range: number[] } {
    const featureData = this.getFeatureData(featureKey);
    if (!featureData) {
      throw new Error("Dataset.buildTrackFeaturePlot: Feature '" + featureKey + "' does not exist in dataset.");
    }
    const range = track.ids.map((i) => featureData.data[i]);
    const domain = track.times;
    return { domain, range };
  }
}
