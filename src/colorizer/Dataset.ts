import { Texture, Vector2 } from "three";

import { IArrayLoader, IFrameLoader } from "./loaders/ILoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import JsonArrayLoader from "./loaders/JsonArrayLoader";

import FrameCache from "./FrameCache";
import Track from "./Track";

import { FeatureArrayType, FeatureDataType } from "./types";
import * as urlUtils from "./utils/url_utils";

export type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
  featureMetadata?: Record<string, Partial<FeatureMetadata>>;
  outliers?: string;
  tracks?: string;
  times?: string;
  centroids?: string;
  bounds?: string;
};

export type FeatureMetadata = {
  units: string | null;
};

export type FeatureData = {
  data: Float32Array;
  tex: Texture;
  min: number;
  max: number;
  units?: string;
};

const MAX_CACHED_FRAMES = 60;

export default class Dataset {
  private frameLoader: IFrameLoader;
  private frameFiles: string[];
  private frames: FrameCache | null;
  private frameDimensions: Vector2 | null;

  private arrayLoader: IArrayLoader;
  private featureFiles: Record<string, string>;
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
    this.featureFiles = {};
    this.features = {};
  }

  private resolveUrl = (url: string): string => `${this.baseUrl}/${url}`;

  private async fetchJson(url: string): Promise<DatasetManifest> {
    const response = await urlUtils.fetchWithTimeout(url, urlUtils.DEFAULT_FETCH_TIMEOUT_MS);
    return await response.json();
  }

  private async loadFeature(name: string, metadata: Partial<FeatureMetadata>): Promise<void> {
    const url = this.resolveUrl(this.featureFiles[name]);
    const source = await this.arrayLoader.load(url);
    this.features[name] = {
      tex: source.getTexture(FeatureDataType.F32),
      data: source.getBuffer(FeatureDataType.F32),
      min: source.getMin(),
      max: source.getMax(),
    };
    if (metadata && metadata.units !== undefined && metadata.units !== null) {
      this.features[name].units = metadata.units;
    }
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

  public getFeatureUnits(name: string): string | undefined {
    return this.features[name]?.units;
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
    return Object.keys(this.featureFiles);
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
    this.featureFiles = manifest.features;

    const featuresToMetadata: Record<string, Partial<FeatureMetadata>> = {};
    for (const featureName of Object.keys(this.featureFiles)) {
      featuresToMetadata[featureName] = manifest.featureMetadata ? manifest.featureMetadata[featureName] : {};
    }

    this.tracksFile = manifest.tracks;
    this.timesFile = manifest.times;
    this.centroidsFile = manifest.centroids;

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);
    const featuresPromises: Promise<void>[] = this.featureNames.map((name) =>
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
