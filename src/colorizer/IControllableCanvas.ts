import Dataset from "./Dataset";

export interface IControllableCanvas {
  getTotalFrames: () => number;
  getCurrentFrame: () => number;
  setFrame: (frame: number) => Promise<void>;
  setFeatureKey: (key: string) => void;
  setDataset: (dataset: Dataset) => void;
  setSize: (width: number, height: number) => void;
  render: () => void;
  domElement: HTMLCanvasElement;
}
