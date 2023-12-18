import { RGBAFormat, RGBAIntegerFormat, Texture, Vector2 } from "three";

import { IArrayLoader, IFrameLoader } from "./loaders/ILoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import JsonArrayLoader from "./loaders/JsonArrayLoader";

import FrameCache from "./FrameCache";
import Track from "./Track";

import { MAX_FEATURE_CATEGORIES } from "../constants";
import { FeatureArrayType, FeatureDataType } from "./types";
import { AnyManifestFile, ManifestFile, ManifestFileMetadata, updateManifestVersion } from "./utils/dataset_utils";
import * as urlUtils from "./utils/url_utils";

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

const defaultMetadata: ManifestFileMetadata = {
  frameDims: {
    width: 0,
    height: 0,
    units: "",
  },
  frameDurationSeconds: 0,
  startTimeSeconds: 0,
};

const MAX_CACHED_FRAMES = 60;

export default class Dataset {
  private frameLoader: IFrameLoader;
  private frameFiles: string[];
  private frames: FrameCache | null;
  private frameDimensions: Vector2 | null;

  private backdropLoader: IFrameLoader;
  private backdropFiles: Map<string, string[]>;
  // TODO: Implement caching for overlays-- extend FrameCache to allow multiple frames per index -> string name?
  // private backdrops: Map<string, FrameCache | null>;

  private arrayLoader: IArrayLoader;
  // Use map to enforce ordering
  private features: Map<string, FeatureData>;

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

    this.frameLoader = frameLoader || new ImageFrameLoader(RGBAIntegerFormat);
    this.frameFiles = [];
    this.frames = null;
    this.frameDimensions = null;

    this.backdropLoader = frameLoader || new ImageFrameLoader(RGBAFormat);
    this.backdropFiles = new Map();

    this.arrayLoader = arrayLoader || new JsonArrayLoader();
    this.features = new Map();
    this.metadata = defaultMetadata;
  }

  private resolveUrl = (url: string): string => `${this.baseUrl}/${url}`;

  private async fetchJson(url: string): Promise<AnyManifestFile> {
    const response = await urlUtils.fetchWithTimeout(url, urlUtils.DEFAULT_FETCH_TIMEOUT_MS);
    return await response.json();
  }

  private parseFeatureType(inputType: string | undefined, defaultType = FeatureType.CONTINUOUS): FeatureType {
    const isFeatureType = (inputType: string): inputType is FeatureType => {
      return Object.values(FeatureType).includes(inputType as FeatureType);
    };

    inputType = inputType?.toLowerCase() || "";
    return isFeatureType(inputType) ? inputType : defaultType;
  }

  /**
   * Loads a feature from the dataset, fetching its data from the provided url.
   * @returns A promise of an array tuple containing the feature name and its FeatureData.
   */
  private async loadFeature(metadata: ManifestFile["features"][number]): Promise<[string, FeatureData]> {
    const name = metadata.name;
    const url = this.resolveUrl(metadata.data);
    const source = await this.arrayLoader.load(url);
    const featureType = this.parseFeatureType(metadata.type);

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
      name,
      {
        tex: source.getTexture(FeatureDataType.F32),
        data: source.getBuffer(FeatureDataType.F32),
        min: source.getMin(),
        max: source.getMax(),
        units: metadata?.units || "",
        type: featureType,
        categories: featureCategories || null,
      },
    ];
  }

  public hasFeature(name: string): boolean {
    return this.featureNames.includes(name);
  }

  public getFeatureData(name: string): FeatureData {
    const featureData = this.features.get(name);
    if (!featureData) {
      throw new Error(`getFeatureData: Feature ${name} does not exist.`);
    }
    return featureData;
  }

  public getFeatureNameWithUnits(name: string): string {
    const units = this.getFeatureUnits(name);
    if (units) {
      return `${name} (${units})`;
    } else {
      return name;
    }
  }

  /**
   * Gets the feature's units if it exists; otherwise returns an empty string.
   */
  public getFeatureUnits(name: string): string {
    return this.getFeatureData(name).units || "";
  }

  /**
   * Returns the FeatureType of the given feature, if it exists.
   * @param name Feature name to retrieve
   * @throws An error if the feature does not exist.
   * @returns The FeatureType of the given feature (categorical, continuous, or discrete)
   */
  public getFeatureType(name: string): FeatureType {
    const featureData = this.getFeatureData(name);
    return featureData.type;
  }

  /**
   * Returns the array of string categories for the given feature, if it exists and is categorical.
   * @param name Feature name to retrieve.
   * @returns The array of string categories for the given feature, or null if the feature is not categorical.
   */
  public getFeatureCategories(name: string): string[] | null {
    const featureData = this.getFeatureData(name);
    if (featureData.type === FeatureType.CATEGORICAL) {
      return featureData.categories;
    }
    return null;
  }

  /** Returns whether the given feature represents categorical data. */
  public isFeatureCategorical(name: string): boolean {
    return this.getFeatureData(name).type === FeatureType.CATEGORICAL;
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
    return Array.from(this.features.keys());
  }

  public get numObjects(): number {
    return this.getFeatureData(this.featureNames[0]).data.length;
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

  public hasBackdrop(name: string): boolean {
    return this.backdropFiles.has(name);
  }

  public getBackdropNames(): string[] {
    return Array.from(this.backdropFiles.keys());
  }

  public async loadBackdrop(name: string, index: number): Promise<Texture | undefined> {
    // TODO: Implement caching
    const files = this.backdropFiles.get(name);
    if (!files || index < 0 || index >= files.length) {
      return undefined;
    }
    const fullUrl = this.resolveUrl(files[index]);
    const loadedFrame = await this.backdropLoader.load(fullUrl);
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

    const manifest = updateManifestVersion(await manifestLoader(this.manifestUrl));

    this.frameFiles = manifest.frames;
    this.outlierFile = manifest.outliers;
    this.metadata = { ...defaultMetadata, ...manifest.metadata };

    this.tracksFile = manifest.tracks;
    this.timesFile = manifest.times;
    this.centroidsFile = manifest.centroids;

    if (manifest.backdrops) {
      for (const { name, frames } of manifest.backdrops) {
        this.backdropFiles.set(name, frames);
        if (frames.length !== this.frameFiles.length || 0) {
          console.warn(
            `Number of frames (${this.frameFiles.length}) does not match number of overlays (${frames.length}) for overlay ${name}.`
          );
        }
      }
    }

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);

    // Load feature data
    const featuresPromises: Promise<[string, FeatureData]>[] = manifest.features.map((data) => this.loadFeature(data));

    const result = await Promise.all([
      this.loadToTexture(FeatureDataType.U8, this.outlierFile),
      this.loadToBuffer(FeatureDataType.U32, this.tracksFile),
      this.loadToBuffer(FeatureDataType.U32, this.timesFile),
      this.loadToBuffer(FeatureDataType.U16, this.centroidsFile),
      this.loadToBuffer(FeatureDataType.U16, this.boundsFile),
      ...featuresPromises,
    ]);
    const [outliers, tracks, times, centroids, bounds, ...featureResults] = result;

    this.outliers = outliers;
    this.trackIds = tracks;
    this.times = times;
    this.centroids = centroids;
    this.bounds = bounds;

    // Keep original sorting order of features by inserting in promise order.
    featureResults.forEach(([name, data]) => {
      this.features.set(name, data);
    });

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
    const range = track.ids.map((i) => this.getFeatureData(feature).data[i]);
    const domain = track.times;
    return { domain, range };
  }
}
