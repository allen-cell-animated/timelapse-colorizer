import { clamp } from "three/src/math/MathUtils";
import { StateCreator } from "zustand";

import Dataset from "../../Dataset";

type BackdropSliceState = {
  /** The key of the backdrop image set in the current dataset. `null` if there
   * is no Dataset loaded or if the dataset does not have backdrops. */
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
  /**
   * Sets the backdrop key. Will be ignored if it does not exist in the dataset.
   */
  setBackdropKey: (dataset: Dataset, key: string) => void;
  /**
   * Sets the visibility of the backdrop layer. The backdrop will be hidden if
   * the current backdrop key is `null`.
   */
  setBackdropVisible: (visible: boolean) => void;
  setBackdropBrightness: (brightness: number) => void;
  setBackdropSaturation: (saturation: number) => void;
  setObjectOpacity: (opacity: number) => void;
};

export type BackdropSlice = BackdropSliceState & BackdropSliceActions;

export const createBackdropSlice: StateCreator<BackdropSlice, [], [], BackdropSlice> = (set, get) => ({
  backdropKey: null,
  backdropVisible: false,
  backdropBrightness: 100,
  backdropSaturation: 100,
  objectOpacity: 50,

  setBackdropKey: (dataset: Dataset, key: string) => {
    if (key !== null && !dataset.hasBackdrop(key)) {
      // Ignore if key is not in the dataset
      return;
    }
    const backdropVisible = get().backdropVisible && key !== null;
    set({ backdropKey: key, backdropVisible });
  },
  // Only enable when backdrop key is not null
  setBackdropVisible: (visible: boolean) => set({ backdropVisible: visible && get().backdropKey !== null }),
  setBackdropBrightness: (brightness: number) => set({ backdropBrightness: clamp(brightness, 0, 200) }),
  setBackdropSaturation: (saturation: number) => set({ backdropSaturation: clamp(saturation, 0, 100) }),
  setObjectOpacity: (opacity: number) => set({ objectOpacity: clamp(opacity, 0, 100) }),
});
