import { StateCreator } from "zustand";

import {
  decodeBoolean,
  decodeFloat,
  encodeMaybeBoolean,
  encodeMaybeNumber,
  UrlParam,
} from "../../colorizer/utils/url_utils";
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
import { SerializedStoreData, SubscribableStore } from "../types";
import { clampWithNanCheck } from "../utils/data_validation";
import { DatasetSlice } from "./dataset_slice";

export type BackdropSliceState = {
  backdropVisible: boolean;
  /** Brightness, as a percentage in the `[0, 200]` range. 100 by default. */
  backdropBrightness: number;
  /** Saturation, as a percentage in the `[0, 100]` range. */
  backdropSaturation: number;
  /** Object opacity when backdrop is visible, as a percentage in the `[0, 100]`
   * range. 50 by default. */
  objectOpacity: number;
};

export type BackdropSliceSerializableState = Pick<
  BackdropSliceState,
  "backdropVisible" | "backdropBrightness" | "backdropSaturation" | "objectOpacity"
>;

export type BackdropSliceActions = {
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

export const serializeBackdropSlice = (state: Partial<BackdropSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};
  ret[UrlParam.SHOW_BACKDROP] = encodeMaybeBoolean(state.backdropVisible);
  ret[UrlParam.BACKDROP_BRIGHTNESS] = encodeMaybeNumber(state.backdropBrightness);
  ret[UrlParam.BACKDROP_SATURATION] = encodeMaybeNumber(state.backdropSaturation);
  ret[UrlParam.OBJECT_OPACITY] = encodeMaybeNumber(state.objectOpacity);
  return ret;
};

/** Selects state values that serialization depends on. */
export const backdropSliceSerializationDependencies = (slice: BackdropSlice): BackdropSliceSerializableState => ({
  backdropVisible: slice.backdropVisible,
  backdropBrightness: slice.backdropBrightness,
  backdropSaturation: slice.backdropSaturation,
  objectOpacity: slice.objectOpacity,
});

export const loadBackdropSliceFromParams = (slice: BackdropSlice, params: URLSearchParams): void => {
  const showBackdrop = decodeBoolean(params.get(UrlParam.SHOW_BACKDROP));
  if (showBackdrop !== undefined) {
    slice.setBackdropVisible(showBackdrop);
  }
  const backdropBrightness = decodeFloat(params.get(UrlParam.BACKDROP_BRIGHTNESS));
  if (backdropBrightness !== undefined && Number.isFinite(backdropBrightness)) {
    slice.setBackdropBrightness(backdropBrightness);
  }
  const backdropSaturation = decodeFloat(params.get(UrlParam.BACKDROP_SATURATION));
  if (backdropSaturation !== undefined && Number.isFinite(backdropSaturation)) {
    slice.setBackdropSaturation(backdropSaturation);
  }
  const objectOpacity = decodeFloat(params.get(UrlParam.OBJECT_OPACITY));
  if (objectOpacity !== undefined && Number.isFinite(objectOpacity)) {
    slice.setObjectOpacity(objectOpacity);
  }
};
