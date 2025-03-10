import { Color } from "three";
import { StateCreator } from "zustand";

import { getDefaultVectorConfig, VECTOR_KEY_MOTION_DELTA, VectorConfig, VectorTooltipMode } from "../../colorizer";
import { SubscribableStore } from "../types";
import { validateFiniteValue } from "../utils/data_validation";
import { addDerivedStateSubscriber, makeDebouncedCallback } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";
import { getSharedWorkerPool } from "../../colorizer/workers/SharedWorkerPool";

type VectorSliceState = {
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

type VectorSliceActions = {
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

export const addVectorDerivedStateSubscribers = (
  store: SubscribableStore<VectorSlice & DatasetSlice>
): void => {
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
