import { DataTexture, Texture } from "three";

import { FeatureData, IFeatureLoader, IFrameLoader } from "./loaders/ILoader";
import JsonFeatureLoader from "./loaders/JsonFeatureLoader";
import ImageFrameLoader from "./loaders/ImageFrameLoader";

import FrameCache from "./FrameCache";

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
  outliers?: string;
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

  public baseUrl: string;
  private hasOpened: boolean;

  constructor(baseUrl: string, frameLoader?: IFrameLoader, featureLoader?: IFeatureLoader) {
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

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);
    const promises = this.featureNames.map(this.loadFeature.bind(this));
    promises.push(this.loadOutliers());
    await Promise.all(promises);
  }

  /** Frees the GPU resources held by this dataset */
  public dispose(): void {
    Object.values(this.features).forEach(({ tex }) => tex.dispose());
    this.frames?.dispose();
  }
}
