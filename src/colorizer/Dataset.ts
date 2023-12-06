import { Texture, Vector2 } from "three";

import { IArrayLoader, IFrameLoader } from "./loaders/ILoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import JsonArrayLoader from "./loaders/JsonArrayLoader";

import FrameCache from "./FrameCache";
import Track from "./Track";

import { FeatureArrayType, FeatureDataType } from "./types";
import * as urlUtils from "./utils/url_utils";
import { MAX_FEATURE_CATEGORIES } from "../constants";

export enum FeatureType {
  CONTINUOUS = "continuous",
  DISCRETE = "discrete",
  CATEGORICAL = "categorical",
}

type FeatureData = {
  data: Float32Array;
  tex: Texture;
  min: number;
  max: number;
  units: string;
  type: FeatureType;
  categories: string[] | null;
};

/**
 * JSON metadata for dataset features.
 * This is the deprecated version, where feature metadata
 * was stored separately from the feature file path declaration.
 */
type DeprecatedManifestFileFeatureData = {
  units?: string | null;
  type?: string | null;
  categories?: string[] | null;
};

/** JSON metadata for dataset features. */
type ManifestFileFeatureData = {
  data: string;
  units?: string;
  type?: string;
  categories?: string[];
};

type ManifestFileMetadata = {
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

const defaultMetadata: ManifestFileMetadata = {
  frameDims: {
    width: 0,
    height: 0,
    units: "",
  },
  frameDurationSeconds: 0,
  startTimeSeconds: 0,
};

/** Maps from the feature label to its metadata, including relative filepath, type, and units. */
type FeatureMap = Record<string, ManifestFileFeatureData>;
/** Maps from the feature label to its relative filepath only. */
type DeprecatedFeatureMap = Record<string, string>;

export type ManifestFile = {
  frames: string[];
  features: FeatureMap | DeprecatedFeatureMap;
  /** Deprecated; avoid using in new datasets. Instead, use the new `FeatureMetadata` spec. */
  featureMetadata?: Record<string, Partial<DeprecatedManifestFileFeatureData>>;
  outliers?: string;
  tracks?: string;
  times?: string;
  centroids?: string;
  bounds?: string;
  metadata?: Partial<ManifestFileMetadata>;
};

const MAX_CACHED_FRAMES = 60;

export default class Dataset {
  private frameLoader: IFrameLoader;
  private frameFiles: string[];
  private frames: FrameCache | null;
  private frameDimensions: Vector2 | null;

  private arrayLoader: IArrayLoader;
  public features: Record<string, FeatureData>;

  private outlierFile?: string;
  public outliers?: Texture | null;

  private tracksFile?: string;
  private timesFile?: string;
  public trackIds?: Uint32Array | null;
  public times?: Uint32Array | null;

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
  constructor(manifestUrl: string, frameLoader?: IFrameLoader, arrayLoader?: IArrayLoader) {
    this.manifestUrl = manifestUrl;

    this.baseUrl = urlUtils.formatPath(manifestUrl.substring(0, manifestUrl.lastIndexOf("/")));
    this.hasOpened = false;

    this.frameLoader = frameLoader || new ImageFrameLoader();
    this.frameFiles = [];
    this.frames = null;
    this.frameDimensions = null;

    this.arrayLoader = arrayLoader || new JsonArrayLoader();
    this.features = {};
    this.metadata = defaultMetadata;
  }

  private resolveUrl = (url: string): string => `${this.baseUrl}/${url}`;

  private async fetchJson(url: string): Promise<ManifestFile> {
    const response = await urlUtils.fetchWithTimeout(url, urlUtils.DEFAULT_FETCH_TIMEOUT_MS);
    return await response.json();
  }

  /**
   * Parses a feature's `type` string and returns a FeatureType enum.
   * @param inputType The `type` string to parse.
   * @param defaultType Default value to return if `inputType` is not recognized.
   * @returns The parsed FeatureType.
   */
  private getFeatureTypeFromString(inputType: string, defaultType: FeatureType = FeatureType.CONTINUOUS): FeatureType {
    const type = inputType.toLowerCase();
    switch (type) {
      case "discrete":
        return FeatureType.DISCRETE;
      case "categorical":
        return FeatureType.CATEGORICAL;
      case "continuous":
        return FeatureType.CONTINUOUS;
      default:
        return defaultType;
    }
  }

  /**
   * Returns whether the dataset is using the older, deprecated manifest format, where feature metadata
   * was stored in a separate object from the `feature` file path declaration.
   */
  private isFeatureDeprecated(features: FeatureMap | DeprecatedFeatureMap): boolean {
    return typeof Object.values(features)[0] === "string";
  }

  /**
   * Loads a feature from the dataset, fetching its data from the provided url.
   */
  private async loadFeature(name: string, metadata: ManifestFileFeatureData): Promise<void> {
    const url = this.resolveUrl(metadata.data);
    const source = await this.arrayLoader.load(url);
    const featureType = this.getFeatureTypeFromString(metadata?.type || "", FeatureType.CONTINUOUS);
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

    this.features[name] = {
      tex: source.getTexture(FeatureDataType.F32),
      data: source.getBuffer(FeatureDataType.F32),
      min: source.getMin(),
      max: source.getMax(),
      units: metadata?.units || "",
      type: featureType,
      categories: featureCategories || null,
    };
  }

  public hasFeature(name: string): boolean {
    return this.featureNames.includes(name);
  }

  public getFeatureData(name: string): FeatureData | null {
    if (Object.keys(this.features).includes(name)) {
      return this.features[name];
    } else {
      return null;
    }
  }

  public getFeatureNameWithUnits(name: string): string {
    const units = this.getFeatureUnits(name);
    if (units) {
      return `${name} (${units})`;
    } else {
      return name;
    }
  }

  public getFeatureUnits(name: string): string {
    return this.features[name].units;
  }

  /**
   * Returns the FeatureType of the given feature, if it exists.
   * @param name Feature name to retrieve
   * @returns The FeatureType of the given feature (categorical, continuous, or discrete)
   */
  public getFeatureType(name: string): FeatureType {
    if (this.features[name] === undefined) {
      throw new Error(`Feature ${name} does not exist.`);
    }
    return this.features[name].type;
  }

  /**
   * Returns the array of string categories for the given feature, if it exists and is categorical.
   * @param name Feature name to retrieve.
   * @returns The array of string categories for the given feature, or null if the feature is not categorical.
   */
  public getFeatureCategories(name: string): string[] | null {
    if (this.features[name] && this.features[name].type === FeatureType.CATEGORICAL) {
      return this.features[name].categories;
    }
    return null;
  }

  /** Returns whether the given feature represents categorical data. */
  public isFeatureCategorical(name: string): boolean {
    return this.features[name].type === FeatureType.CATEGORICAL;
  }

  /**
   * Fetches and loads a data file as an array and returns its data as a Texture using the provided dataType.
   * @param dataType The expected format of the data.
   * @param fileUrl String url of the file to be loaded.
   * @throws An error if fileUrl is not undefined and the data cannot be loaded from the file.
   * @returns Promise of a texture loaded from the file. If `fileUrl` is undefined, returns null.
   */
  private async loadToTexture(dataType: FeatureDataType, fileUrl?: string): Promise<Texture | null> {
    if (!fileUrl) {
      return null;
    }
    try {
      const url = this.resolveUrl(fileUrl);
      const source = await this.arrayLoader.load(url);
      return source.getTexture(dataType);
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetches and loads a data file as an array and returns its data as a TypedArray using the provided dataType.
   * @param dataType The expected format of the data.
   * @param fileUrl String url of the file to be loaded.
   * @throws An error if `fileUrl` is not undefined and the data cannot be loaded from the file.
   * @returns Promise of a TypedArray loaded from the file. If `fileUrl` is undefined, returns null.
   */
  private async loadToBuffer<T extends FeatureDataType>(
    dataType: T,
    fileUrl?: string
  ): Promise<FeatureArrayType[T] | null> {
    if (!fileUrl) {
      return null;
    }
    try {
      const url = this.resolveUrl(fileUrl);
      const source = await this.arrayLoader.load(url);
      return source.getBuffer(dataType);
    } catch (e) {
      return null;
    }
  }

  public get numberOfFrames(): number {
    return this.frames?.length || 0;
  }

  public get featureNames(): string[] {
    return Object.keys(this.features);
  }

  public get numObjects(): number {
    return this.features[this.featureNames[0]].data.length;
  }

  /** Loads a single frame from the dataset */
  public async loadFrame(index: number): Promise<Texture | undefined> {
    if (index < 0 || index >= this.frameFiles.length) {
      return undefined;
    }

    const cachedFrame = this.frames?.get(index);
    if (cachedFrame) {
      return cachedFrame;
    }

    const fullUrl = this.resolveUrl(this.frameFiles[index]);
    const loadedFrame = await this.frameLoader.load(fullUrl);
    this.frameDimensions = new Vector2(loadedFrame.image.width, loadedFrame.image.height);
    this.frames?.insert(index, loadedFrame);
    return loadedFrame;
  }

  /**
   * Gets the resolution of the last loaded frame.
   * If no frame has been loaded yet, returns (1,1)
   */
  public get frameResolution(): Vector2 {
    return this.frameDimensions || new Vector2(1, 1);
  }

  /** Loads the dataset manifest and features. */
  public async open(manifestLoader = this.fetchJson): Promise<void> {
    if (this.hasOpened) {
      return;
    }
    this.hasOpened = true;

    const manifest = await manifestLoader(this.manifestUrl);

    this.frameFiles = manifest.frames;
    this.outlierFile = manifest.outliers;
    this.metadata = { ...defaultMetadata, ...manifest.metadata };

    this.tracksFile = manifest.tracks;
    this.timesFile = manifest.times;
    this.centroidsFile = manifest.centroids;

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);

    // Load feature data -> switch between deprecated and new feature type loading.
    let featuresToMetadata: Record<string, ManifestFileFeatureData> = {};
    if (this.isFeatureDeprecated(manifest.features)) {
      // Parse metadata from deprecated manifest format, and add missing properties
      // to make it compatible with the new FeatureMetadata.
      featuresToMetadata = Object.keys(manifest.features).reduce((result, name) => {
        const featurePath = (manifest.features as DeprecatedFeatureMap)[name];
        const featureMetadata = (manifest.featureMetadata || {})[name] || {};
        result[name] = {
          data: featurePath,
          units: featureMetadata.units || undefined,
          type: featureMetadata.type || undefined,
          categories: featureMetadata.categories || undefined,
        };
        return result;
      }, {} as FeatureMap);
    } else {
      featuresToMetadata = manifest.features as FeatureMap;
    }

    const featuresPromises: Promise<void>[] = Object.keys(featuresToMetadata).map((name) =>
      this.loadFeature.bind(this)(name, featuresToMetadata[name])
    );

    const result = await Promise.all([
      this.loadToTexture(FeatureDataType.U8, this.outlierFile),
      this.loadToBuffer(FeatureDataType.U32, this.tracksFile),
      this.loadToBuffer(FeatureDataType.U32, this.timesFile),
      this.loadToBuffer(FeatureDataType.U16, this.centroidsFile),
      this.loadToBuffer(FeatureDataType.U16, this.boundsFile),
      ...featuresPromises,
    ]);
    const [outliers, tracks, times, centroids, bounds] = result;

    this.outliers = outliers;
    this.trackIds = tracks;
    this.times = times;
    this.centroids = centroids;
    this.bounds = bounds;

    // TODO: Dynamically fetch features
    // TODO: Pre-process feature data to handle outlier values by interpolating between known good values (#21)
  }

  /** Frees the GPU resources held by this dataset */
  public dispose(): void {
    Object.values(this.features).forEach(({ tex }) => tex.dispose());
    this.frames?.dispose();
  }

  /** get frame index of a given cell id */
  public getTime(index: number): number {
    return this.times?.[index] || 0;
  }

  /** get track id of a given cell id */
  public getTrackId(index: number): number {
    return this.trackIds?.[index] || 0;
  }

  private getIdsOfTrack(trackId: number): number[] {
    return this.trackIds?.reduce((arr: number[], elem: number, ind: number) => {
      if (elem === trackId) arr.push(ind);
      return arr;
    }, []) as number[];
  }

  public buildTrack(trackId: number): Track {
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

    return new Track(trackId, times, ids, centroids, bounds);
  }

  // get the times and values of a track for a given feature
  // this data is suitable to hand to d3 or plotly as two arrays of domain and range values
  public buildTrackFeaturePlot(track: Track, feature: string): { domain: number[]; range: number[] } {
    const range = track.ids.map((i) => this.features[feature].data[i]);
    const domain = track.times;
    return { domain, range };
  }
}
