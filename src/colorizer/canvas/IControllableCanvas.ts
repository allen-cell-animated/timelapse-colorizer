import Dataset from "../Dataset";

export interface IControllableCanvas {
  getTotalFrames(): number;
  getCurrentFrame(): number;
  setFrame(frame: number): Promise<void>;

  render(): void;

  setDataset(dataset: Dataset): void;
  setFeatureKey(key: string): void;

  domElement: HTMLCanvasElement;
}
