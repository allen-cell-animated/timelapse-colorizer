import { Color } from "three";
import { StateCreator } from "zustand";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "../../colors/categorical_palettes";
import { DEFAULT_COLOR_RAMP_KEY, KNOWN_COLOR_RAMPS } from "../../colors/color_ramps";
import { arrayDeepEquals, getColorMap } from "../../utils/data_utils";
import { addDerivedStateSubscriber, SubscribableStore } from "../utils/store_utils";

import ColorRamp from "../../ColorRamp";

export type ColorRampSliceState = {
  colorRampKey: string;
  isColorRampReversed: boolean;
  colorRampRange: [number, number];
  categoricalPalette: Color[];

  // Derived values
  colorRamp: ColorRamp;
  categoricalPaletteKey: string | null;
};

export type ColorRampSliceActions = {
  /** Changes the key of the current color ramp. Must be a known color ramp
   * key from `KNOWN_COLOR_RAMPS`. Resets the reversed state when set.
   */
  setColorRampKey: (key: string) => void;
  setColorRampReversed: (reversed: boolean) => void;
  // TODO: Merge into a single range?
  setColorRampMin: (min: number) => void;
  setColorRampMax: (max: number) => void;
  setCategoricalPalette: (palette: Color[]) => void;
};

export type ColorRampSlice = ColorRampSliceState & ColorRampSliceActions;

const getPaletteKey = (palette: Color[]): string | null => {
  for (const [key, paletteData] of KNOWN_CATEGORICAL_PALETTES) {
    if (arrayDeepEquals(paletteData.colors, palette)) {
      return key;
    }
  }
  return null;
};

export const createColorRampSlice: StateCreator<ColorRampSlice> = (set, _get) => ({
  // State
  colorRampKey: DEFAULT_COLOR_RAMP_KEY,
  isColorRampReversed: false,
  colorRampRange: [0, 0],
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
  // Enforce min/max
  setColorRampMin: (min: number) =>
    set((state) => ({
      colorRampRange: [Math.min(min, state.colorRampRange[1]), Math.max(min, state.colorRampRange[1])],
    })),
  setColorRampMax: (max: number) =>
    set((state) => ({
      colorRampRange: [Math.min(max, state.colorRampRange[0]), Math.max(max, state.colorRampRange[0])],
    })),
  setCategoricalPalette: (palette: Color[]) =>
    set((_state) => ({
      categoricalPalette: palette,
    })),
});

export const addColorRampDerivedStateSubscribers = (store: SubscribableStore<ColorRampSlice>): void => {
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
};
