import { Color } from "three";
import { StateCreator } from "zustand";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "../../colors/categorical_palettes";
import { DEFAULT_COLOR_RAMP_KEY, KNOWN_COLOR_RAMPS } from "../../colors/color_ramps";
import { arrayDeepEquals, getColorMap } from "../../utils/data_utils";
import { computed } from "../utils/store_utils";

import ColorRamp from "../../ColorRamp";

export type ColorRampSliceState = {
  colorRampKey: string;
  isColorRampReversed: boolean;
  colorRampMin: number;
  colorRampMax: number;
  categoricalPalette: Color[];
};

export type ColorRampSliceSelectors = {
  /** The current ColorRamp, based on the selected key and optionally reversed. */
  colorRamp: () => ColorRamp;
  /** The key of the categorical palette, if it matches a known palette. `null`
   * if the palette does not match. */
  categoricalPaletteKey: () => string | null;
};

export type ColorRampSliceActions = {
  /** Changes the key of the current color ramp. Must be a known color ramp
   * key from `KNOWN_COLOR_RAMPS`. Resets the reversed state when set.
   */
  setColorRampKey: (key: string) => void;
  setColorRampReversed: (reversed: boolean) => void;
  // TODO: Merge into a single range
  setColorRampMin: (min: number) => void;
  setColorRampMax: (max: number) => void;
  setCategoricalPalette: (palette: Color[]) => void;
};

export type ColorRampSlice = ColorRampSliceState & ColorRampSliceSelectors & ColorRampSliceActions;

const getPaletteKey = (palette: Color[]): string | null => {
  for (const [key, paletteData] of KNOWN_CATEGORICAL_PALETTES) {
    if (arrayDeepEquals(paletteData.colors, palette)) {
      return key;
    }
  }
  return null;
};

export const createColorRampSlice: StateCreator<ColorRampSlice> = (set, get) => ({
  // State
  colorRampKey: DEFAULT_COLOR_RAMP_KEY,
  isColorRampReversed: false,
  colorRampMin: 0,
  colorRampMax: 1,
  categoricalPalette: KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!.colors,

  // Selectors
  categoricalPaletteKey: computed(() => [get().categoricalPalette], getPaletteKey),
  colorRamp: computed(
    () => [get().colorRampKey, get().isColorRampReversed],
    (key, reversed) => getColorMap(KNOWN_COLOR_RAMPS, key, reversed)
  ),

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
      colorRampMin: Math.min(min, state.colorRampMax),
      colorRampMax: Math.max(min, state.colorRampMax),
    })),
  setColorRampMax: (max: number) =>
    set((state) => ({
      colorRampMin: Math.min(max, state.colorRampMin),
      colorRampMax: Math.max(max, state.colorRampMin),
    })),
  setCategoricalPalette: (palette: Color[]) =>
    set((_state) => ({
      categoricalPalette: palette,
    })),
});
