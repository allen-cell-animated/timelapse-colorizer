import { Vector2 } from "three";

import { ViewerStoreState } from "../state/slices";

const canvasStateDeps = [
  "dataset",
  "featureKey",
  "track",
  "showTrackPath",
  "colorRamp",
  "colorRampRange",
  "categoricalPalette",
  "outlineColor",
  "outlierDrawSettings",
  "outOfRangeDrawSettings",
  "inRangeLUT",
  "vectorMotionDeltas",
  "vectorVisible",
  "vectorColor",
  "vectorScaleFactor",
  "backdropKey",
  "backdropVisible",
  "objectOpacity",
  "backdropSaturation",
  "backdropBrightness",
] as const;

export type CanvasStateParams = Pick<ViewerStoreState, (typeof canvasStateDeps)[number]>;

export const canvasStateParamsSelector = (state: ViewerStoreState): CanvasStateParams => {
  const entries = canvasStateDeps.map((key) => [key, state[key]]);
  return Object.fromEntries(entries);
};

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
