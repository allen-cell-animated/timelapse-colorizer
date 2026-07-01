import { type DataTexture, RGBAFormat, RGBAIntegerFormat, type Texture, Vector2 } from "three";

import {
  BOOLEAN_VALUE_FALSE,
  BOOLEAN_VALUE_TRUE,
  CSV_COL_ID,
  CSV_COL_OUTLIER,
  CSV_COL_SEG_ID,
  CSV_COL_TIME,
  CSV_COL_TRACK,
  MAX_CACHED_BACKDROPS_BYTES,
  MAX_CACHED_FRAME_BYTES,
} from "src/colorizer/constants";
import type { CsvDataColumn } from "src/colorizer/utils/csv_utils";

import DataCache from "./DataCache";
import type { ITextureImageLoader } from "./loaders/ILoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import Track from "./Track";
import type { GlobalIdLookupInfo } from "./types";
import { buildFrameToGlobalIdLookup } from "./utils/data_utils";
import type { ManifestFileMetadata } from "./utils/dataset_utils";

export const TRACK_FEATURE_KEY = "_track_";
export const TIME_FEATURE_KEY = "_time_";
export const CENTROID_X_FEATURE_KEY = "_centroid_x_";
export const CENTROID_Y_FEATURE_KEY = "_centroid_y_";
export const CENTROID_Z_FEATURE_KEY = "_centroid_z_";

export enum FeatureType {
  CONTINUOUS = "continuous",
  DISCRETE = "discrete",
  CATEGORICAL = "categorical",
}

export type FeatureData = {
  name: string;
  key: string;
  data: Float32Array | Uint32Array;
  tex: DataTexture;
  min: number;
  max: number;
  unit: string;
  type: FeatureType;
  categories: string[] | null;
  description: string | null;
};

/** Source for a 2D segmentation or backdrop frame sequence. */
export type FrameSource = {
  name: string;
  key: string;
  description?: string;
  /** Array of fully-resolved URLs to 2D frames. */
  frames: (string | null)[];
};

/** Source for a 3D segmentation or backdrop channel. */
export type ChannelSource = {
  /**
   * Source for 3D data, resolved to http/https or blob URL. Expected to be a
   * path to an OME-Zarr array.
   */
  source: string;
  name: string;
  description?: string;
  channelIndex: number;
  min?: number;
  max?: number;
};

export type Frames2dData = {
  segmentations?: FrameSource[];
  backdrops?: FrameSource[];
};

export type Frames3dData = {
  segmentations: ChannelSource[];
  backdrops?: ChannelSource[];
  totalFrames: number;
};

export type TrackEdgeData = {
  name: string;
  edges: Uint32Array;
  description?: string;
};

export type DatasetInputData = {
  //// Metadata ////
  manifestUrl: string;
  metadata: ManifestFileMetadata;
  //// Image sources ////
  frames2d: Frames2dData;
  frames3d: Frames3dData;
  frameResolution: Vector2;
  //// Data arrays ////
  features: Map<string, FeatureData>;
  segIds: Uint32Array | null;
  times: Uint32Array | null;
  trackIds: Uint32Array | null;
  centroids: Uint16Array | null;
  bounds: Uint16Array | null;
  outliers: Uint8Array | null;
  trackEdges: Map<string, TrackEdgeData> | null;
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

/**
 * A data container for the image sources, features, and associated metadata for
 * a dataset. Provides caching and convenience methods for data access.
 */
export default class Dataset {
  //// Metadata ////
  public readonly manifestUrl: string | null;
  public readonly metadata: ManifestFileMetadata;

  //// Image sources ////
  private frameLoader: ITextureImageLoader;
  private framesMap: Map<string, FrameSource>;
  private frameCache: DataCache<string, Texture>;
  private frameDimensions: Vector2 | null;

  private backdropLoader: ITextureImageLoader;
  private backdropData: Map<string, FrameSource>;
  private backdropCache: DataCache<string, Texture>;

  public frames3d: Frames3dData | null;

  //// Data arrays ////
  /** Ordered map from feature keys to feature data. */
  private features: Map<string, FeatureData>;
  public trackIds: Uint32Array | null;
  public times: Uint32Array | null;

  /** Lookup from a global index of an object to the raw segmentation ID in the
   * frame/image where it appears. */
  public segIds: Uint32Array | null;

  public outliers: Uint8Array | null;
  public centroids: Uint16Array | null;
  public bounds: Uint16Array | null;

  public trackEdges: Map<string, TrackEdgeData> | null;

  //// Cached Data ////
  private cachedTracks: Map<number, Track | null>;
  private maxTrackLength: number | null;
  private maxTime: number;
  private totalFrames: number;

  /**
   * Maps from a frame number to a lookup table used to get the global ID of a
   * segmentation ID in that frame.
   *
   * For segmentation ID `segId` at time `t`, the global ID is given by:
   *
   * ```
   * const globalIdLut = frameToGlobalIdLookup[t];
   * const globalId = globalIdLut.lut[segId - globalIdLut.minSegId] - 1;
   * ```
   *
   * The global ID is `NaN` or `-1` if there is no global ID that matches that
   * segmentation ID, such as when rows are missing in the dataset.
   *
   * See `GlobalIdLookupInfo` for more details.
   */
  public readonly frameToGlobalIdLookup: Map<number, GlobalIdLookupInfo>;

  constructor(
    data: Partial<DatasetInputData>,
    options: { frameLoader?: ITextureImageLoader; backdropLoader?: ITextureImageLoader } = {}
  ) {
    this.manifestUrl = data.manifestUrl ?? null;
    this.metadata = data.metadata ?? defaultMetadata;

    // Image sources
    this.frameLoader = options.frameLoader || new ImageFrameLoader(RGBAIntegerFormat);
    this.frameCache = new DataCache(MAX_CACHED_FRAME_BYTES);
    const frames2dData: FrameSource[] = data.frames2d?.segmentations || [];
    this.framesMap = new Map(frames2dData.map((f) => [f.key, f]));
    this.frameDimensions = data.frameResolution ?? null;

    this.backdropLoader = options.backdropLoader || new ImageFrameLoader(RGBAFormat);
    this.backdropCache = new DataCache(MAX_CACHED_BACKDROPS_BYTES);
    const backdropsData: FrameSource[] = data.frames2d?.backdrops || [];
    this.backdropData = new Map(backdropsData.map((f) => [f.key, f]));

    this.frames3d = data.frames3d || null;

    // Data arrays
    this.features = data.features || new Map<string, FeatureData>();
    this.times = data.times || null;
    this.trackIds = data.trackIds || null;
    this.segIds = data.segIds || null;
    this.centroids = data.centroids || null;
    this.bounds = data.bounds || null;
    this.outliers = data.outliers || null;
    this.trackEdges = data.trackEdges || null;
    console.log("Track edges:", this.trackEdges);

    // Cached data
    this.cachedTracks = new Map();
    this.maxTrackLength = null;
    this.maxTime = this.times?.reduce((max, t) => Math.max(max, t), 0) ?? 0;
    this.totalFrames = this.getTotalFrames();

    this.frameToGlobalIdLookup = buildFrameToGlobalIdLookup(
      this.times ?? new Uint32Array(),
      this.segIds ?? new Uint32Array(),
      this.totalFrames
    );

    this.getSegmentationId = this.getSegmentationId.bind(this);
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
    return this.framesMap.size > 0 || this.backdropData.size > 0;
  }

  public has3dFrames(): boolean {
    return this.frames3d !== null;
  }

  public get numberOfFrames(): number {
    return this.totalFrames;
  }

  public get featureKeys(): string[] {
    return Array.from(this.features.keys());
  }

  public get numObjects(): number {
    const featureData = this.getFeatureData(this.featureKeys[0]);
    return featureData?.data.length ?? this.times?.length ?? this.segIds?.length ?? 0;
  }

  public hasLineageData(): boolean {
    return this.trackEdges !== null && this.trackEdges.size > 0;
  }

  public getDefaultSegmentationKey(): string | null {
    return this.framesMap.keys().next().value ?? null;
  }

  public hasSegmentation(key: string): boolean {
    return this.framesMap.has(key);
  }

  public getSegmentationData(): Map<string, FrameSource> {
    return new Map(this.framesMap);
  }

  /** Loads a single frame from the dataset */
  public async loadFrame(key: string, index: number): Promise<Texture | undefined> {
    if (index < 0 || index >= this.totalFrames || !this.framesMap.has(key)) {
      return undefined;
    }

    const cacheKey = `${key}-${index}`;
    const cachedFrame = this.frameCache?.get(cacheKey);
    if (cachedFrame) {
      this.frameDimensions = new Vector2(cachedFrame.image.width, cachedFrame.image.height);
      return cachedFrame;
    }

    const fullUrl = this.framesMap.get(key)?.frames[index];
    if (!fullUrl) {
      throw new Error(`Failed to resolve path for frame '${key}' at index ${index}: '${fullUrl}'`);
    }
    const loadedFrame = await this.frameLoader.load(fullUrl);
    this.frameDimensions = new Vector2(loadedFrame.image.width, loadedFrame.image.height);
    const frameSizeBytes = loadedFrame.image.width * loadedFrame.image.height * 4;
    // Note that, due to image compression, images may take up much less space in memory than their raw size.
    this.frameCache.insert(cacheKey, loadedFrame, frameSizeBytes);
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
  public getBackdropData(): Map<string, FrameSource> {
    return new Map(this.backdropData);
  }

  public async loadBackdrop(key: string, index: number): Promise<Texture | undefined> {
    const cacheKey = `${key}-${index}`;
    const cachedFrame = this.backdropCache.get(cacheKey);
    if (cachedFrame) {
      return cachedFrame;
    }

    const backdropFrames = this.backdropData.get(key)?.frames;
    if (!backdropFrames || index < 0 || index >= backdropFrames.length) {
      return undefined;
    }

    const fullUrl = backdropFrames[index];
    if (!fullUrl) {
      throw new Error(`Failed to resolve path for backdrop '${key}' at index ${index}: '${backdropFrames[index]}'`);
    }
    const loadedBackdrop = await this.backdropLoader.load(fullUrl);
    this.backdropCache.insert(cacheKey, loadedBackdrop);
    return loadedBackdrop;
  }

  /**
   * Gets the resolution of the last loaded frame.
   * If no frame has been loaded yet, returns (1,1)
   */
  public get frameResolution(): Vector2 {
    return this.frameDimensions || new Vector2(1, 1);
  }

  /**
   * Frees the GPU resources held by this dataset, and marks internal data
   * structures for garbage collection.
   */
  public dispose(): void {
    // Image sources
    this.frameCache.dispose();
    this.backdropCache.dispose();
    this.backdropData.clear();
    this.framesMap.clear();
    this.frames3d = null;
    // Data arrays
    this.features.forEach((feature) => {
      feature.data = new Float32Array(0);
      feature.tex.dispose();
    });
    this.features.clear();
    this.bounds = null;
    this.centroids = null;
    this.outliers = null;
    this.segIds = null;
    this.times = null;
    this.trackIds = null;
    // Cached data
    this.cachedTracks.clear();
    this.frameToGlobalIdLookup?.clear();
  }

  /** get frame index of a given cell id */
  public getTime(index: number): number {
    return this.times?.[index] || 0;
  }

  private getTotalFrames(): number {
    if (this.has2dFrames()) {
      const frameFilesLength = this.framesMap.values().next().value?.frames.length;
      const firstBackdropFramesLength = this.backdropData.values().next().value?.frames.length;
      if (frameFilesLength) {
        return frameFilesLength;
      } else if (firstBackdropFramesLength) {
        return firstBackdropFramesLength;
      }
    }
    if (this.has3dFrames() && this.frames3d?.totalFrames) {
      return this.frames3d!.totalFrames;
    }
    return this.maxTime + 1;
  }

  public isValidFrameIndex(index: number): boolean {
    return index >= 0 && index < this.totalFrames;
  }

  /** get track id of a given cell id */
  public getTrackId(index: number): number {
    return this.trackIds?.[index] || 0;
  }

  public getSegmentationId(index: number): number {
    return this.segIds?.[index] || 0;
  }

  /**
   * Returns the 3D centroid of a given object id.
   */
  public getCentroid(objectId: number): [number, number, number] | undefined {
    const index = objectId * 3;
    if (this.centroids === undefined || this.centroids === null || index + 2 >= this.centroids.length) {
      return undefined;
    }
    const x = this.centroids[index];
    const y = this.centroids[index + 1];
    const z = this.centroids[index + 2];
    return [x, y, z];
  }

  private getIdsOfTrack(trackId: number): number[] {
    return this.trackIds?.reduce((arr: number[], elem: number, ind: number) => {
      if (elem === trackId) arr.push(ind);
      return arr;
    }, []) as number[];
  }

  /** Returns the global IDs of all objects in a given frame. */
  public getIdsInFrame(frame: number): Uint32Array | undefined {
    return this.frameToGlobalIdLookup?.get(frame)?.globalIds;
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
    const centroidsData = this.centroids;
    if (centroidsData) {
      centroids = ids.reduce((result, i) => {
        result.push(...this.getCentroid(i)!);
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

  /**
   * Gets the maximum duration of any track in the dataset.
   */
  public getMaxTrackLength(): number {
    if (this.maxTrackLength !== null) {
      return this.maxTrackLength;
    }
    const trackToMinMaxTime: Map<number, [number, number]> = new Map();
    if (this.trackIds && this.times) {
      for (let i = 0; i < this.trackIds.length; i++) {
        const time = this.times[i];
        const trackId = this.trackIds[i];
        if (!trackToMinMaxTime.has(trackId)) {
          trackToMinMaxTime.set(trackId, [time, time]);
        } else {
          const [minTime, maxTime] = trackToMinMaxTime.get(trackId)!;
          trackToMinMaxTime.set(trackId, [Math.min(minTime, time), Math.max(maxTime, time)]);
        }
      }
    }
    let maxLength = 0;
    for (const [minTime, maxTime] of trackToMinMaxTime.values()) {
      maxLength = Math.max(maxLength, maxTime - minTime + 1);
    }
    this.maxTrackLength = maxLength;
    return maxLength;
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

  public toCsvDataColumns(): CsvDataColumn[] {
    const columns: CsvDataColumn[] = [];

    const idData = Array.from({ length: this.numObjects }, (_, i) => i);
    const emptyData = new Array(this.numObjects).fill(undefined);
    columns.push({ name: CSV_COL_ID, data: idData });
    columns.push({ name: CSV_COL_SEG_ID, data: this.segIds ?? idData });
    columns.push({ name: CSV_COL_TRACK, data: this.trackIds ?? emptyData });
    columns.push({ name: CSV_COL_TIME, data: this.times ?? emptyData });
    columns.push({
      name: CSV_COL_OUTLIER,
      data: this.outliers ?? emptyData,
      categories: [BOOLEAN_VALUE_FALSE, BOOLEAN_VALUE_TRUE],
    });

    // Write features, excluding some auto-generated features, e.g. time &
    // track. (Other auto-generated features, like centroids, will be included).
    const autoGeneratedFeatures = new Set([TIME_FEATURE_KEY, TRACK_FEATURE_KEY]);
    const featureData = Array.from(this.features.values()).filter((feature) => !autoGeneratedFeatures.has(feature.key));
    for (const feature of featureData) {
      columns.push({
        name: this.getFeatureNameWithUnits(feature.key),
        data: feature.data,
        categories: feature.categories ?? undefined,
      });
    }

    return columns;
  }
}
