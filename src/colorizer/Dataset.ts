import { DataTexture, Texture } from "three";

import { FeatureData, IFeatureLoader, IFrameLoader, ITracksLoader } from "./loaders/ILoader";
import JsonFeatureLoader from "./loaders/JsonFeatureLoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";
import JsonTracksLoader from "./loaders/JsonTracksLoader";

import FrameCache from "./FrameCache";

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
  outliers?: string;
  tracks?: string;
};

const MAX_CACHED_FRAMES = 60;
const MANIFEST_FILENAME = "manifest.json";

export default class Dataset {
  private frameLoader: IFrameLoader;
  private frameFiles: string[];
  private frames: FrameCache | null;

  private featureLoader: IFeatureLoader;
  private featureFiles: Record<string, string>;
  public features: Record<string, FeatureData>;

  private outlierFile?: string;
  public outliers?: DataTexture;

  private tracksLoader: ITracksLoader;
  private tracksFile?: string;
  public trackIds?: Uint32Array;
  public times?: Uint32Array;

  public baseUrl: string;
  private hasOpened: boolean;

  constructor(
    baseUrl: string,
    frameLoader?: IFrameLoader,
    featureLoader?: IFeatureLoader,
    tracksLoader?: ITracksLoader
  ) {
    this.baseUrl = baseUrl;
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, this.baseUrl.length - 1);
    }
    this.hasOpened = false;

    this.frameLoader = frameLoader || new ImageFrameLoader();
    this.frameFiles = [];
    this.frames = null;

    this.featureLoader = featureLoader || new JsonFeatureLoader();
    this.featureFiles = {};
    this.features = {};

    this.tracksLoader = tracksLoader || new JsonTracksLoader();
  }

  private resolveUrl = (url: string): string => `${this.baseUrl}/${url}`;

  private async fetchManifest(): Promise<DatasetManifest> {
    const response = await fetch(this.resolveUrl(MANIFEST_FILENAME));
    return await response.json();
  }

  private async loadFeature(name: string): Promise<void> {
    const url = this.resolveUrl(this.featureFiles[name]);
    this.features[name] = await this.featureLoader.load(url);
  }

  private async loadOutliers(): Promise<void> {
    if (!this.outlierFile) {
      return;
    }
    const url = this.resolveUrl(this.outlierFile);
    this.outliers = (await this.featureLoader.load(url)).tex;
  }

  private async loadTracks(): Promise<void> {
    if (!this.tracksFile) {
      return;
    }
    const url = this.resolveUrl(this.tracksFile);
    const { trackIds, times } = await this.tracksLoader.load(url);
    this.trackIds = trackIds;
    this.times = times;
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
    this.frames?.insert(index, loadedFrame);
    return loadedFrame;
  }

  /** Loads the dataset manifest and features */
  public async open(): Promise<void> {
    if (this.hasOpened) {
      return;
    }
    this.hasOpened = true;

    const manifest = await this.fetchManifest();

    this.frameFiles = manifest.frames;
    this.featureFiles = manifest.features;
    this.outlierFile = manifest.outliers;
    this.tracksFile = manifest.tracks;

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);
    const promises = this.featureNames.map(this.loadFeature.bind(this));
    promises.push(this.loadOutliers());
    promises.push(this.loadTracks());
    await Promise.all(promises);
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

  // get the times and values of a track for a given feature
  // this data is suitable to hand to d3 or plotly as two arrays of domain and range values
  public buildTrack(trackId: number, feature: string): { domain: number[]; range: number[] } {
    // if we don't have track info then return empty arrays
    if (!this.trackIds || !this.times) {
      return { domain: [], range: [] };
    }
    console.time("buildTrack");
    // trackIds contains a track id for every cell id in order.
    // get all cell ids for given track
    const track = this.trackIds.reduce(function (arr: number[], elem: number, ind: number) {
      if (elem === trackId) arr.push(ind);
      return arr;
    }, []);
    // track now contains all cell ids that have trackId.
    // get all the times and the feature values for those cell, in the same order
    const domain = track.map((i) => (this.times ? this.times[i] : 0));
    const range = track.map((i) => this.features[feature].data[i]);

    let sortedDomain = domain;
    let sortedRange = range;

    // TODO sort both, ascending by domain?
    // I have no idea if the domain would be presorted or not
    const shouldSort = false;
    if (shouldSort) {
      const indices = [...domain.keys()];
      indices.sort((a, b) => (domain[a] < domain[b] ? -1 : domain[a] === domain[b] ? 0 : 1));
      sortedDomain = indices.map((i) => domain[i]);
      sortedRange = indices.map((i) => range[i]);
    }

    console.timeEnd("buildTrack");
    console.log(
      `Track ${trackId} has ${track.length} timepoints starting from ${sortedDomain[0]} to ${
        sortedDomain[domain.length - 1]
      }`
    );
    return { domain: sortedDomain, range: sortedRange };
  }
}
