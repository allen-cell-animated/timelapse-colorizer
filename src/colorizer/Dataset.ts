import { DataTexture, FloatType, RedFormat, Texture, TextureLoader } from "three";

type FeatureDataJson = {
  data: number[];
  min: number;
  max: number;
};

export type FeatureData = {
  data: DataTexture;
  min: number;
  max: number;
};

type DatasetManifest = {
  frames: string[];
  features: Record<string, string>;
};

export default class Dataset {
  private loader: TextureLoader;
  private frames: (Texture | null)[];
  public readonly features: Record<string, FeatureData>;

  private frameFiles: string[];
  private featureFiles: Record<string, string>;

  public baseUrl: string;
  private hasOpened: boolean;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.hasOpened = false;
    this.loader = new TextureLoader();

    this.frameFiles = [];
    this.frames = [];
    this.featureFiles = {};
    this.features = {};
  }

  private async fetchJson(filename: string): Promise<any> {
    const fullUrl = `${this.baseUrl}/${filename}`;
    const response = await fetch(fullUrl);
    return await response.json();
  }

  private async loadOneFeature(name: string): Promise<void> {
    const { data, min, max }: FeatureDataJson = await this.fetchJson(this.featureFiles[name]);
    this.features[name] = {
      data: new DataTexture(new Float32Array(data), data.length, 1, RedFormat, FloatType),
      min,
      max,
    };
  }

  public get numberOfFrames(): number {
    return this.frameFiles.length;
  }

  public get featureNames(): string[] {
    return Object.keys(this.featureFiles);
  }

  public get isLoaded(): boolean {
    return this.frames.length > 0;
  }

  public async loadFrame(index: number): Promise<Texture | undefined> {
    if (index < 0 || index >= this.frames.length) {
      return undefined;
    }

    const cachedFrame = this.frames[index];
    if (cachedFrame !== null) {
      return cachedFrame;
    }

    const fullUrl = `${this.baseUrl}/${this.frameFiles[index]}`;
    const loadedFrame = await this.loader.loadAsync(fullUrl);
    this.frames[index] = loadedFrame;
    return loadedFrame;
  }

  /** Loads the dataset manifest and features */
  public async open(): Promise<void> {
    if (this.hasOpened) {
      return;
    }
    this.hasOpened = true;

    const manifest: DatasetManifest = await this.fetchJson("manifest.json");

    this.frameFiles = manifest.frames;
    this.featureFiles = manifest.features;

    this.frames = new Array(this.frameFiles.length).fill(null);
    await Promise.all(this.featureNames.map(this.loadOneFeature.bind(this)));
  }

  public dispose(): void {
    this.frames.forEach((frame) => frame?.dispose());
    Object.values(this.features).forEach(({ data }) => data.dispose());
    this.frames = [];
  }
}
