import { Color } from "three";
import { StateCreator } from "zustand";

import {
  getDefaultVectorConfig,
  isVectorTooltipMode,
  VECTOR_KEY_MOTION_DELTA,
  VectorConfig,
  VectorTooltipMode,
} from "src/colorizer";
import {
  decodeBoolean,
  decodeFloat,
  decodeHexColor,
  decodeInt,
  encodeMaybeBoolean,
  encodeMaybeColor,
  encodeMaybeNumber,
  UrlParam,
} from "src/colorizer/utils/url_utils";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import type { SerializedStoreData, SubscribableStore } from "src/state/types";
import { setValueIfDefined, validateFiniteValue } from "src/state/utils/data_validation";
import { addDerivedStateSubscriber, makeDebouncedCallback } from "src/state/utils/store_utils";

import type { DatasetSlice } from "./dataset_slice";

export type VectorSliceState = {
  vectorVisible: boolean;
  vectorKey: string;
  vectorColor: Color;
  vectorScaleFactor: number;
  vectorTooltipMode: VectorTooltipMode;
  /**
   * Number of time intervals to smooth vector motion deltas over when the
   * `vectorKey` is `VECTOR_KEY_MOTION_DELTA`, as an integer. 5 by default.
   */
  vectorMotionTimeIntervals: number;

  // Derived state
  /**
   * Vector motion deltas for all objects in the dataset, as a flat array of 2D
   * vector coordinates. Motion deltas are smoothed over
   * `vectorMotionTimeIntervals`.
   *
   * Set to `null` if the current `vectorKey` is not `VECTOR_KEY_MOTION_DELTA`,
   * or if the dataset is `null`.
   */
  vectorMotionDeltas: Float32Array | null;
};

export type VectorSliceSerializableState = Pick<
  VectorSliceState,
  | "vectorVisible"
  | "vectorKey"
  | "vectorColor"
  | "vectorScaleFactor"
  | "vectorTooltipMode"
  | "vectorMotionTimeIntervals"
>;

export type VectorSliceActions = {
  setVectorVisible: (visible: boolean) => void;
  setVectorKey: (key: string) => void;
  setVectorColor: (color: Color) => void;
  setVectorScaleFactor: (scale: number) => void;
  setVectorTooltipMode: (mode: VectorTooltipMode) => void;
  /** Note: Motion intervals are rounded to integers and are clamped to be >= 1. */
  setVectorMotionTimeIntervals: (timeIntervals: number) => void;
};

export type VectorSlice = VectorSliceState & VectorSliceActions;

const defaultConfig = getDefaultVectorConfig();

export const createVectorSlice: StateCreator<VectorSlice & DatasetSlice, [], [], VectorSlice> = (set, _get) => ({
  vectorVisible: defaultConfig.visible,
  vectorKey: defaultConfig.key,
  vectorMotionTimeIntervals: defaultConfig.timeIntervals,
  vectorColor: defaultConfig.color,
  vectorScaleFactor: defaultConfig.scaleFactor,
  vectorTooltipMode: defaultConfig.tooltipMode,

  // Derived state
  vectorMotionDeltas: null,

  setVectorVisible: (visible: boolean) => set({ vectorVisible: visible }),
  setVectorKey: (key: string) => {
    // TODO: Validate with dataset when vector features are added
    if (key !== VECTOR_KEY_MOTION_DELTA) {
      throw new Error(
        `VectorSlice.setVectorKey: Invalid key '${key}'. Only motion delta vectors (key '${VECTOR_KEY_MOTION_DELTA}') are currently supported.`
      );
    }
    set({ vectorKey: key });
  },
  setVectorMotionTimeIntervals: (timeIntervals: number) => {
    let value = validateFiniteValue(timeIntervals, "setVectorMotionTimeIntervals");
    value = Math.max(1, Math.round(value));
    set({ vectorMotionTimeIntervals: value });
  },
  setVectorColor: (color: Color) => set({ vectorColor: color }),
  setVectorScaleFactor: (scale: number) =>
    set({ vectorScaleFactor: validateFiniteValue(scale, "setVectorScaleFactor") }),
  setVectorTooltipMode: (mode: VectorTooltipMode) => set({ vectorTooltipMode: mode }),
});

export const addVectorDerivedStateSubscribers = (store: SubscribableStore<VectorSlice & DatasetSlice>): void => {
  // Update motion deltas when the dataset, vector key, or motion time intervals change.
  addDerivedStateSubscriber(
    store,
    (state) => [state.dataset, state.vectorKey, state.vectorMotionTimeIntervals, state.vectorScaleFactor],
    makeDebouncedCallback(([dataset, vectorKey, vectorMotionTimeIntervals]) => {
      const updateMotionDeltas = async (): Promise<void> => {
        if (vectorKey !== VECTOR_KEY_MOTION_DELTA || dataset === null) {
          store.setState({ vectorMotionDeltas: null });
          return;
        }
        const workerPool = getSharedWorkerPool();
        const motionDeltas = await workerPool.getMotionDeltas(dataset, vectorMotionTimeIntervals);
        store.setState({ vectorMotionDeltas: motionDeltas });
      };
      updateMotionDeltas();
    }, 250)
  );
};

/** Selector that returns a VectorConfig object from a store containing vector
 * state.
 * @example
 * ```
 * import { useShallow } from "zustand/shallow";
 *
 * const vectorConfig = useViewerStateStore(useShallow(selectVectorConfigFromState));
 * ```
 */
export const selectVectorConfigFromState = (state: VectorSlice): VectorConfig => ({
  visible: state.vectorVisible,
  key: state.vectorKey,
  timeIntervals: state.vectorMotionTimeIntervals,
  color: state.vectorColor,
  scaleFactor: state.vectorScaleFactor,
  tooltipMode: state.vectorTooltipMode,
});

export const serializeVectorSlice = (slice: Partial<VectorSlice>): SerializedStoreData => {
  return {
    [UrlParam.SHOW_VECTOR]: encodeMaybeBoolean(slice.vectorVisible),
    [UrlParam.VECTOR_KEY]: slice.vectorKey,
    [UrlParam.VECTOR_COLOR]: encodeMaybeColor(slice.vectorColor),
    [UrlParam.VECTOR_SCALE]: encodeMaybeNumber(slice.vectorScaleFactor),
    [UrlParam.VECTOR_TOOLTIP_MODE]: slice.vectorTooltipMode?.toString(),
    [UrlParam.VECTOR_TIME_INTERVALS]: encodeMaybeNumber(slice.vectorMotionTimeIntervals),
  };
};

/** Selects state values that serialization depends on. */
export const selectVectorSliceSerializationDeps = (slice: VectorSlice): Partial<VectorSliceState> => ({
  vectorVisible: slice.vectorVisible,
  vectorKey: slice.vectorKey,
  vectorColor: slice.vectorColor,
  vectorScaleFactor: slice.vectorScaleFactor,
  vectorTooltipMode: slice.vectorTooltipMode,
  vectorMotionTimeIntervals: slice.vectorMotionTimeIntervals,
});

export function loadVectorSliceFromParams(slice: VectorSlice, params: URLSearchParams): void {
  setValueIfDefined(decodeBoolean(params.get(UrlParam.SHOW_VECTOR)), slice.setVectorVisible);

  const vectorKey = params.get(UrlParam.VECTOR_KEY);
  // TODO: Do validation for vector keys if added to Dataset
  if (vectorKey === VECTOR_KEY_MOTION_DELTA) {
    slice.setVectorKey(vectorKey);
  }

  const vectorColor = decodeHexColor(params.get(UrlParam.VECTOR_COLOR));
  if (vectorColor !== undefined) {
    slice.setVectorColor(new Color(vectorColor));
  }

  const vectorScale = decodeFloat(params.get(UrlParam.VECTOR_SCALE));
  if (vectorScale !== undefined && Number.isFinite(vectorScale)) {
    slice.setVectorScaleFactor(vectorScale);
  }

  const vectorTooltipMode = params.get(UrlParam.VECTOR_TOOLTIP_MODE);
  if (vectorTooltipMode && isVectorTooltipMode(vectorTooltipMode)) {
    slice.setVectorTooltipMode(vectorTooltipMode);
  }

  const vectorTimeIntervals = decodeInt(params.get(UrlParam.VECTOR_TIME_INTERVALS));
  if (vectorTimeIntervals !== undefined && Number.isFinite(vectorTimeIntervals)) {
    slice.setVectorMotionTimeIntervals(vectorTimeIntervals);
  }
}
