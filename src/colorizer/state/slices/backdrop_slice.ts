import { clamp } from "three/src/math/MathUtils";
import { StateCreator } from "zustand";

import { DatasetSlice } from "./dataset_slice";

type BackdropSliceState = {
  backdropKey: string | null;
  backdropVisible: boolean;
  /** Brightness, as a percentage in the `[0, 200]` range. 100 by default. */
  backdropBrightness: number;
  /** Saturation, as a percentage in the `[0, 100]` range. */
  backdropSaturation: number;
  /** Object opacity when backdrop is visible, as a percentage in the `[0, 100]`
   * range. 50 by default. */
  objectOpacity: number;
};

type BackdropSliceActions = {
  setBackdropKey: (key: string | null) => void;
  setBackdropVisible: (visible: boolean) => void;
  setBackdropBrightness: (brightness: number) => void;
  setBackdropSaturation: (saturation: number) => void;
};

export type BackdropSlice = BackdropSliceState & BackdropSliceActions;

export const createBackdropSlice: StateCreator<BackdropSlice & DatasetSlice, [], [], BackdropSlice> = (set, get) => ({
  backdropKey: null,
  backdropVisible: false,
  backdropBrightness: 100,
  backdropSaturation: 100,
  objectOpacity: 50,

  // Only allow keys that are in the dataset.
  setBackdropKey: (key: string | null) => set({ backdropKey: key && get().dataset?.hasBackdrop(key) ? key : null }),
  setBackdropVisible: (visible: boolean) => set({ backdropVisible: visible }),
  setBackdropBrightness: (brightness: number) => set({ backdropBrightness: clamp(brightness, 0, 200) }),
  setBackdropSaturation: (saturation: number) => set({ backdropSaturation: clamp(saturation, 0, 100) }),
  setObjectOpacity: (opacity: number) => set({ objectOpacity: clamp(opacity, 0, 100) }),
});
