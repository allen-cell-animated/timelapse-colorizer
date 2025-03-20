import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";

export type CanvasStateParams = Pick<
  ViewerStoreState,
  | "dataset"
  | "featureKey"
  | "track"
  | "showTrackPath"
  | "colorRamp"
  | "colorRampRange"
  | "categoricalPalette"
  | "outlineColor"
  | "outlierDrawSettings"
  | "outOfRangeDrawSettings"
  | "inRangeLUT"
  | "vectorMotionDeltas"
  | "vectorVisible"
  | "vectorColor"
  | "vectorScaleFactor"
  | "backdropKey"
  | "backdropVisible"
  | "objectOpacity"
  | "backdropSaturation"
  | "backdropBrightness"
>;

export const canvasStateParamsSelector = (state: ViewerStoreState): CanvasStateParams => ({
  dataset: state.dataset,
  featureKey: state.featureKey,
  track: state.track,
  showTrackPath: state.showTrackPath,
  colorRamp: state.colorRamp,
  colorRampRange: state.colorRampRange,
  categoricalPalette: state.categoricalPalette,
  outlineColor: state.outlineColor,
  outlierDrawSettings: state.outlierDrawSettings,
  outOfRangeDrawSettings: state.outOfRangeDrawSettings,
  inRangeLUT: state.inRangeLUT,
  vectorMotionDeltas: state.vectorMotionDeltas,
  vectorVisible: state.vectorVisible,
  vectorColor: state.vectorColor,
  vectorScaleFactor: state.vectorScaleFactor,
  backdropKey: state.backdropKey,
  backdropVisible: state.backdropVisible,
  objectOpacity: state.objectOpacity,
  backdropSaturation: state.backdropSaturation,
  backdropBrightness: state.backdropBrightness,
});

export interface ICanvas {
  get domElement(): HTMLCanvasElement;
  get resolution(): Vector2;
  setResolution(width: number, height: number): void;
  setParams(params: CanvasStateParams): void;
  setFrame(frame: number): Promise<void>;
  render(): void;
  dispose(): void;
  getIdAtPixel(x: number, y: number): number;
}
