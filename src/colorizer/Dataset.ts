import { DataTexture, DataTextureLoader } from "three";

type FeatureDataJson = {
  data: number[];
  min: number;
  max: number;
};

export type FeatureData = {
  data: Float32Array;
  min: number;
  max: number;
};

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
};

type OnProgressType = (event: ProgressEvent<EventTarget>) => void;

export default class Dataset {
  private loader: DataTextureLoader;
  private frames: (DataTexture | null)[];
  public readonly features: Record<string, FeatureData>;

  private frameFiles: string[];
  private featureFiles: Record<string, string>;

  public baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loader = new DataTextureLoader();

    this.frameFiles = [];
    this.frames = [];
    this.featureFiles = {};
    this.features = {};
  }

  /**
   * Promise-ified `DataTextureLoader.load`
   * @param filename The url of the image to load
   * @param onProgress Optional progress callback
   */
  private async fetchTexture(filename: string, onProgress?: OnProgressType): Promise<DataTexture> {
    const fullUrl = `${this.baseUrl}/${filename}`;
    return new Promise((resolve, reject) => this.loader.load(fullUrl, resolve, onProgress, reject));
  }

  private async fetchJson(filename: string): Promise<any> {
    const fullUrl = `${this.baseUrl}/${filename}`;
    const response = await fetch(fullUrl);
    return await response.json();
  }

  private async loadOneFeature(name: string): Promise<void> {
    const { data, min, max }: FeatureDataJson = await this.fetchJson(this.featureFiles[name]);
    this.features[name] = {
      data: new Float32Array(data),
      min,
      max,
    };
  }

  public getNumberOfFrames(): number {
    return this.frameFiles.length;
  }

  public async loadFrame(index: number): Promise<DataTexture | undefined> {
    if (index < 0 || index >= this.frames.length) {
      return undefined;
    }

    const cachedFrame = this.frames[index];
    if (cachedFrame !== null) {
      return cachedFrame;
    }

    this.frames[index] = await this.fetchTexture(this.frameFiles[index]);
    return this.frames[index]!;
  }

  /** Performs initial dataset loading: manifest, features */
  public async open(): Promise<void> {
    const manifest: DatasetManifest = await this.fetchJson("manifest.json");

    this.frameFiles = manifest.frames;
    this.featureFiles = manifest.features;

    this.frames = new Array(this.frameFiles.length).fill(null);
    await Promise.all(Object.keys(this.featureFiles).map(this.loadOneFeature.bind(this)));
  }
}
