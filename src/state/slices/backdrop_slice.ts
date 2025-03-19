import { StateCreator } from "zustand";

import {
  BACKDROP_BRIGHTNESS_DEFAULT,
  BACKDROP_BRIGHTNESS_MAX,
  BACKDROP_BRIGHTNESS_MIN,
  BACKDROP_OBJECT_OPACITY_DEFAULT,
  BACKDROP_OBJECT_OPACITY_MAX,
  BACKDROP_OBJECT_OPACITY_MIN,
  BACKDROP_SATURATION_DEFAULT,
  BACKDROP_SATURATION_MAX,
  BACKDROP_SATURATION_MIN,
} from "../../constants";
import { SubscribableStore } from "../types";
import { clampWithNanCheck } from "../utils/data_validation";
import { DatasetSlice } from "./dataset_slice";

type BackdropSliceState = {
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
   * Sets the visibility of the backdrop layer. The backdrop will be hidden if
   * the current backdrop key is `null`.
   */
  setBackdropVisible: (visible: boolean) => void;
  /**
   * Sets the brightness of the backdrop image, clamped to a percentage in the
   * `[0, 200]` range.
   * @throws {Error} If the brightness is `NaN`.
   */
  setBackdropBrightness: (brightness: number) => void;
  /**
   * Sets the saturation of the backdrop image, clamped to a percentage in the `[0,
   * 100]` range.
   * @throws {Error} If the saturation is `NaN`.
   */
  setBackdropSaturation: (saturation: number) => void;
  /**
   * Sets the opacity of objects when the backdrop is visible, clamped to a
   * percentage in the `[0, 100]` range.
   * @throws {Error} If the opacity is `NaN`.
   */
  setObjectOpacity: (opacity: number) => void;
};

export type BackdropSlice = BackdropSliceState & BackdropSliceActions;

export const createBackdropSlice: StateCreator<BackdropSlice & DatasetSlice, [], [], BackdropSlice> = (set, get) => ({
  backdropKey: null,
  backdropVisible: false,
  backdropBrightness: BACKDROP_BRIGHTNESS_DEFAULT,
  backdropSaturation: BACKDROP_SATURATION_DEFAULT,
  objectOpacity: BACKDROP_OBJECT_OPACITY_DEFAULT,

  // Only enable when backdrop key is not null
  setBackdropVisible: (visible: boolean) => set({ backdropVisible: visible && get().backdropKey !== null }),
  setBackdropBrightness: (brightness: number) =>
    set({ backdropBrightness: clampWithNanCheck(brightness, BACKDROP_BRIGHTNESS_MIN, BACKDROP_BRIGHTNESS_MAX) }),
  setBackdropSaturation: (saturation: number) =>
    set({ backdropSaturation: clampWithNanCheck(saturation, BACKDROP_SATURATION_MIN, BACKDROP_SATURATION_MAX) }),
  setObjectOpacity: (opacity: number) =>
    set({ objectOpacity: clampWithNanCheck(opacity, BACKDROP_OBJECT_OPACITY_MIN, BACKDROP_OBJECT_OPACITY_MAX) }),
});

export const addBackdropDerivedStateSubscribers = (store: SubscribableStore<BackdropSlice & DatasetSlice>): void => {
  // Hide backdrop when backdrop key is null
  store.subscribe(
    (state) => state.backdropKey,
    (backdropKey) => store.setState({ backdropVisible: store.getState().backdropVisible && backdropKey !== null })
  );
};
