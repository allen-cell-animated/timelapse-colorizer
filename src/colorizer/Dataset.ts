import { DataTexture, DataTextureLoader } from "three";

type FeatureDataJson = {
  data: number[];
  min: number;
  max: number;
}

export type FeatureData = {
  data: Float32Array;
  min: number;
  max: number;
}

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
}

type OnProgressType = (event: ProgressEvent<EventTarget>) => void;

export default class Dataset {
  private loader: DataTextureLoader;
  private frameData: (DataTexture | null)[];
  public readonly featureData: Record<string, FeatureData>;

  private frames: string[];
  private features: Record<string, string>;
  
  public baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loader = new DataTextureLoader();

    this.frames = [];
    this.frameData = [];
    this.features = {};
    this.featureData = {};
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
    const { data, min, max }: FeatureDataJson = await this.fetchJson(this.features[name]);
    this.featureData[name] = {
      data: new Float32Array(data),
      min,
      max,
    };
  }

  public getNumberOfFrames(): number {
    return this.frames.length;
  }

  public async loadFrame(index: number): Promise<DataTexture | undefined> {
    if (index < 0 || index >= this.frameData.length) {
      return undefined;
    }

    const cachedFrame = this.frameData[index];
    if (cachedFrame !== null) {
      return cachedFrame;
    }

    this.frameData[index] = await this.fetchTexture(this.frames[index]);
    return this.frameData[index]!;
  }

  /** Performs initial dataset loading: manifest, features */
  public async open(): Promise<void> {
    const manifest: DatasetManifest = await this.fetchJson("manifest.json");

    this.frames = manifest.frames;
    this.features = manifest.features;

    this.frameData = new Array(this.frames.length).fill(null);
    await Promise.all(Object.keys(this.features).map(this.loadOneFeature.bind(this)));
  }
}
