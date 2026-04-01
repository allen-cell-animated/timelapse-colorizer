import Dataset from "src/colorizer/Dataset";

export type PointRendererParams = {
  dataset: Dataset | null;
  pointRadiusPx: number;
  // pointRadii: number[] | null;
};
