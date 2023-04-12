import { DataTexture, FloatType, RedFormat, RedIntegerFormat, UnsignedIntType } from "three";

import { IFeatureLoader, IFrameLoader } from "./loader/ILoader";
import ImageFrameLoader from "./loader/ImageFrameLoader";
import JsonFeatureLoader from "./loader/JsonFeatureLoader";

import FrameCache from "./FrameCache";

type FeatureData = {
  data: DataTexture;
  min: number;
  max: number;
};

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
};

const MAX_CACHED_FRAMES = 15;
const MANIFEST_FILENAME = "manifest.json";

export default class Dataset {
  private frameLoader: IFrameLoader;
  private frameFiles: string[];
  private frames: FrameCache | null;

  private featureLoader: IFeatureLoader;
  private featureFiles: Record<string, string>;
  public readonly features: Record<string, FeatureData>;

  public baseUrl: string;
  private hasOpened: boolean;

  constructor(baseUrl: string, frameLoader?: IFrameLoader, featureLoader?: IFeatureLoader) {
    this.baseUrl = baseUrl;
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
    const { data, min, max } = await this.featureLoader.load(url);
    const dataTex = new DataTexture(data, data.length, 1, RedFormat, FloatType);
    dataTex.internalFormat = "R32F";
    dataTex.needsUpdate = true;
    this.features[name] = { data: dataTex, min, max };
  }

  public get numberOfFrames(): number {
    return this.frameFiles.length;
  }

  public get featureNames(): string[] {
    return Object.keys(this.featureFiles);
  }

  public async loadFrame(index: number): Promise<DataTexture | undefined> {
    if (index < 0 || index >= this.frameFiles.length) {
      return undefined;
    }

    const cachedFrame = this.frames?.get(index);
    if (cachedFrame) {
      return cachedFrame;
    }

    const fullUrl = this.resolveUrl(this.frameFiles[index]);
    const { data, width, height } = await this.frameLoader.load(fullUrl);
    const loadedFrame = new DataTexture(data, width, height, RedIntegerFormat, UnsignedIntType);
    loadedFrame.internalFormat = "R32UI";
    loadedFrame.needsUpdate = true;
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

    this.frames = new FrameCache(this.frameFiles.length, MAX_CACHED_FRAMES);
    await Promise.all(this.featureNames.map(this.loadFeature.bind(this)));
  }

  public dispose(): void {
    Object.values(this.features).forEach(({ data }) => data.dispose());
    this.frames?.dispose();
  }
}
