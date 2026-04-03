import Dataset from "src/colorizer/Dataset";

export type PointRendererParams = {
  dataset: Dataset | null;
  centroidRadiusPx: number;
};
