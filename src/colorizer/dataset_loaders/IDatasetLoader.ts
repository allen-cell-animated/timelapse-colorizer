import Dataset from "src/colorizer/Dataset";

export interface IDatasetLoader {
  open(): Promise<Dataset>;
  dispose(): void;
}
