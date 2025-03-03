import { Color } from "three";
import { StateCreator } from "zustand";

import { isThresholdNumeric } from "../../colorizer";
import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  KNOWN_CATEGORICAL_PALETTES,
} from "../../colorizer/colors/categorical_palettes";
import { DEFAULT_COLOR_RAMP_KEY, KNOWN_COLOR_RAMPS } from "../../colorizer/colors/color_ramps";
import { arrayDeepEquals, getColorMap, thresholdMatchFinder } from "../../colorizer/utils/data_utils";
import { COLOR_RAMP_RANGE_DEFAULT } from "../../constants";
import { SubscribableStore } from "../types";
import { addDerivedStateSubscriber } from "../utils/store_utils";
import { DatasetSlice } from "./dataset_slice";
import { ThresholdSlice } from "./threshold_slice";

import ColorRamp from "../../colorizer/ColorRamp";

export type ColorRampSliceState = {
  colorRampKey: string;
  isColorRampReversed: boolean;
  /**
   * Keeps the color ramp range fixed when selected dataset or feature changes.
   */
  keepColorRampRange: boolean;
  /**
   *Range of feature values over which the color ramp is applied, as `[min,
   * max]`.
   */
  colorRampRange: [number, number];
  categoricalPalette: Color[];

  //// Derived values ////
  /**
   * The current `ColorRamp`, calculated from the selected `colorRampKey` and
   * optionally reversed.
   */
  colorRamp: ColorRamp;
  /**
   * The key of the categorical palette, if its color stops match an entry in
   * `KNOWN_CATEGORICAL_PALETTES`. `null` if the palette has no match.
   */
  categoricalPaletteKey: string | null;
};

export type ColorRampSliceActions = {
  /**
   * Changes the key of the current color ramp to one in `KNOWN_COLOR_RAMPS`.
   * Resets the reversed state when set.
   * @throws an error if the key is not found in `KNOWN_COLOR_RAMPS`.
   */
  setColorRampKey: (key: string) => void;
  setColorRampReversed: (reversed: boolean) => void;
  setColorRampRange: (range: [number, number]) => void;
  setCategoricalPalette: (palette: Color[]) => void;
  setKeepColorRampRange: (keepColorRampRange: boolean) => void;
};

export type ColorRampSlice = ColorRampSliceState & ColorRampSliceActions;

export const createColorRampSlice: StateCreator<ColorRampSlice> = (set, _get) => ({
  // State
  colorRampKey: DEFAULT_COLOR_RAMP_KEY,
  keepColorRampRange: false,
  isColorRampReversed: false,
  colorRampRange: COLOR_RAMP_RANGE_DEFAULT,
  categoricalPalette: KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!.colors,

  // Derived state
  colorRamp: getColorMap(KNOWN_COLOR_RAMPS, DEFAULT_COLOR_RAMP_KEY, false),
  categoricalPaletteKey: DEFAULT_CATEGORICAL_PALETTE_KEY,

  // Actions
  setColorRampKey: (key: string) =>
    set((state) => {
      if (!KNOWN_COLOR_RAMPS.has(key)) {
        throw new Error(`Unknown color ramp key: ${key}`);
      }
      if (key === state.colorRampKey) {
        return {};
      }
      return {
        colorRampKey: key,
        isColorRampReversed: false,
      };
    }),
  setColorRampReversed: (reversed: boolean) =>
    set((_state) => ({
      isColorRampReversed: reversed,
    })),
  setKeepColorRampRange: (keepColorRampRange: boolean) =>
    set((_state) => ({
      keepColorRampRange,
    })),
  // Enforce min/max
  setColorRampRange: (range: [number, number]) =>
    set((_state) => {
      const [min, max] = [Math.min(...range), Math.max(...range)];
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error(`Color ramp range must be a finite number (received [${min}, ${max}])`);
      }
      return {
        colorRampRange: [min, max],
      };
    }),
  // TODO: All the categorical palettes are 12 colors by default, but there is
  // no hard-coded enforcement on length. Should there be one?
  setCategoricalPalette: (palette: Color[]) =>
    set((_state) => ({
      categoricalPalette: palette,
    })),
});

const getPaletteKey = (palette: Color[]): string | null => {
  for (const [key, paletteData] of KNOWN_CATEGORICAL_PALETTES) {
    if (arrayDeepEquals(palette, paletteData.colors)) {
      return key;
    }
  }
  return null;
};

export const addColorRampDerivedStateSubscribers = (
  store: SubscribableStore<DatasetSlice & ColorRampSlice & ThresholdSlice>
): void => {
  // Calculate color ramp and categorical palette
  addDerivedStateSubscriber(
    store,
    (state) => [state.categoricalPalette],
    ([palette]) => ({
      categoricalPaletteKey: getPaletteKey(palette),
    })
  );
  addDerivedStateSubscriber(
    store,
    (state) => [state.colorRampKey, state.isColorRampReversed],
    ([key, reversed]) => ({
      colorRamp: getColorMap(KNOWN_COLOR_RAMPS, key, reversed),
    })
  );

  // Update color ramp range if the threshold changes for the currently selected feature
  addDerivedStateSubscriber(
    store,
    (state) => [state.thresholds],
    ([thresholds], [prevThresholds]) => {
      const dataset = store.getState().dataset;
      const featureKey = store.getState().featureKey;
      if (dataset === null || featureKey === null) {
        return;
      }
      const featureData = dataset.getFeatureData(featureKey);
      if (!featureData) {
        throw new Error(
          `ViewerStateStore: Expected feature data not found for key '${featureKey}' in Dataset when updating color ramp range.`
        );
      }
      // Check if the threshold on the currently selected feature has changed. If so, reset the color ramp range to match
      // the new threshold.
      const oldThreshold = thresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
      const newThreshold = prevThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
      if (newThreshold && oldThreshold && isThresholdNumeric(newThreshold) && isThresholdNumeric(oldThreshold)) {
        if (newThreshold.min !== oldThreshold.min || newThreshold.max !== oldThreshold.max) {
          return { colorRampRange: [newThreshold.min, newThreshold.max] as [number, number] };
        }
      }
      return;
    }
  );

  // Update the color ramp range when the dataset or feature changes
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset, featureKey: state.featureKey }),
    ({ dataset, featureKey }) => {
      if (store.getState().keepColorRampRange) {
        return;
      } else if (dataset === null || featureKey === null) {
        return { colorRampRange: COLOR_RAMP_RANGE_DEFAULT };
      } else {
        const featureData = dataset.getFeatureData(featureKey);
        if (!featureData) {
          throw new Error(
            `ViewerStateStore: Expected feature data not found for key '${featureKey}' in Dataset when updating color ramp range.`
          );
        }
        return {
          colorRampRange: [featureData.min, featureData.max] as [number, number],
        };
      }
    }
  );
};
