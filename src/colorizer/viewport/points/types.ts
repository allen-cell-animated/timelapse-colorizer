import Dataset from "src/colorizer/Dataset";

export type PointRendererParams = {
  dataset: Dataset | null;
  showCentroids: boolean;
  centroidRadiusPx: number;
};
