import { Color, type ColorRepresentation } from "three";
import { type StateCreator } from "zustand";

import { isThresholdNumeric, MAX_FEATURE_CATEGORIES } from "src/colorizer";
import ColorRamp, { ColorRampType } from "src/colorizer/ColorRamp";
import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "src/colorizer/colors/categorical_palettes";
import { DEFAULT_COLOR_RAMP_KEY, KNOWN_COLOR_RAMPS } from "src/colorizer/colors/color_ramps";
import { arrayElementsAreEqual, getColorMap, thresholdMatchFinder } from "src/colorizer/utils/data_utils";
import {
  decodeBoolean,
  decodeString,
  encodeColor,
  encodeMaybeBoolean,
  encodeNumber,
  URL_COLOR_RAMP_REVERSED_SUFFIX,
  UrlParam,
} from "src/colorizer/utils/url_utils";
import { COLOR_RAMP_RANGE_DEFAULT } from "src/constants";
import { type SerializedStoreData, type SubscribableStore } from "src/state/types";
import { addDerivedStateSubscriber } from "src/state/utils/store_utils";

import { type DatasetSlice } from "./dataset_slice";
import { type ThresholdSlice } from "./threshold_slice";

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
  /**
   * The current `categoricalPalette`, as a `ColorRamp` object.
   *
   * This is equivalent to calling `new ColorRamp(categoricalPalette)`, but
   * handles initialization and disposal of the `ColorRamp` object.
   */
  categoricalPaletteRamp: ColorRamp;
};

export type ColorRampSliceSerializableState = Pick<
  ColorRampSliceState,
  | "colorRampKey"
  | "isColorRampReversed"
  | "keepColorRampRange"
  | "colorRampRange"
  | "categoricalPalette"
  | "categoricalPaletteKey"
>;

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

const defaultCategoricalPalette = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!;

export const createColorRampSlice: StateCreator<ColorRampSlice> = (set, _get) => ({
  // State
  colorRampKey: DEFAULT_COLOR_RAMP_KEY,
  keepColorRampRange: false,
  isColorRampReversed: false,
  colorRampRange: COLOR_RAMP_RANGE_DEFAULT,
  categoricalPalette: defaultCategoricalPalette.colors,

  // Derived state
  colorRamp: getColorMap(KNOWN_COLOR_RAMPS, DEFAULT_COLOR_RAMP_KEY, false),
  categoricalPaletteKey: DEFAULT_CATEGORICAL_PALETTE_KEY,
  categoricalPaletteRamp: new ColorRamp(defaultCategoricalPalette.colors, ColorRampType.CATEGORICAL),

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
    if (arrayElementsAreEqual(palette, paletteData.colors)) {
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
    ([palette]) => {
      // Dispose of old palette ramp
      store.getState().categoricalPaletteRamp.dispose();
      return {
        categoricalPaletteKey: getPaletteKey(palette),
        categoricalPaletteRamp: new ColorRamp(palette, ColorRampType.CATEGORICAL),
      };
    }
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
    (state) => state.thresholds,
    (thresholds, prevThresholds) => {
      const dataset = store.getState().dataset;
      const featureKey = store.getState().featureKey;
      if (dataset === null || featureKey === null) {
        return;
      }
      const featureData = dataset.getFeatureData(featureKey);
      if (!featureData) {
        throw new Error(
          `ViewerStateStore: Expected feature data not found for key '${featureKey}' in Dataset when updating color ramp range from threshold.`
        );
      }
      // Check if the threshold on the currently selected feature has changed. If so, reset the color ramp range to match
      // the new threshold.
      const prevThreshold = prevThresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
      const newThreshold = thresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
      if (newThreshold && isThresholdNumeric(newThreshold)) {
        if (
          !prevThreshold ||
          !isThresholdNumeric(prevThreshold) ||
          newThreshold.min !== prevThreshold.min ||
          newThreshold.max !== prevThreshold.max
        ) {
          return { colorRampRange: [newThreshold.min, newThreshold.max] as [number, number] };
        }
      }
      return undefined;
    }
  );

  // Update the color ramp range when the dataset or feature changes
  addDerivedStateSubscriber(
    store,
    (state) => ({ dataset: state.dataset, featureKey: state.featureKey }),
    ({ dataset, featureKey }) => {
      if (store.getState().keepColorRampRange) {
        return undefined;
      } else if (dataset === null || featureKey === null) {
        return { colorRampRange: COLOR_RAMP_RANGE_DEFAULT };
      } else {
        // Reset should occur. If a threshold is set on the selected feature,
        // reset to the threshold range. Otherwise, reset to the feature data
        // range.
        const featureData = dataset.getFeatureData(featureKey);
        if (!featureData) {
          throw new Error(
            `ViewerStateStore: Expected feature data not found for key '${featureKey}' in Dataset when updating color ramp range.`
          );
        }
        const matchingThreshold = store.getState().thresholds.find(thresholdMatchFinder(featureKey, featureData.unit));
        if (matchingThreshold && isThresholdNumeric(matchingThreshold)) {
          return {
            colorRampRange: [matchingThreshold.min, matchingThreshold.max] as [number, number],
          };
        } else {
          return {
            colorRampRange: [featureData.min, featureData.max] as [number, number],
          };
        }
      }
    }
  );
};

export const serializeColorRampSlice = (slice: Partial<ColorRampSliceSerializableState>): SerializedStoreData => {
  const ret: SerializedStoreData = {};

  // Ramp + reversed
  if (slice.colorRampKey !== undefined) {
    ret[UrlParam.COLOR_RAMP] = slice.colorRampKey + (slice.isColorRampReversed ? URL_COLOR_RAMP_REVERSED_SUFFIX : "");
  }

  ret[UrlParam.KEEP_RANGE] = encodeMaybeBoolean(slice.keepColorRampRange);

  if (slice.colorRampRange !== undefined) {
    const range = slice.colorRampRange;
    ret[UrlParam.RANGE] = range.map(encodeNumber).join(",");
  }

  // Palette key takes precedence over palette
  if (slice.categoricalPaletteKey !== undefined && slice.categoricalPaletteKey !== null) {
    ret[UrlParam.PALETTE_KEY] = slice.categoricalPaletteKey;
  } else if (slice.categoricalPalette !== undefined) {
    ret[UrlParam.PALETTE] = slice.categoricalPalette.map(encodeColor).join("-");
  }

  return ret;
};

/** Selects state values that serialization depends on. */
export const selectColorRampSliceSerializationDeps = (slice: ColorRampSlice): ColorRampSliceSerializableState => ({
  colorRampKey: slice.colorRampKey,
  isColorRampReversed: slice.isColorRampReversed,
  keepColorRampRange: slice.keepColorRampRange,
  colorRampRange: slice.colorRampRange,
  categoricalPalette: slice.categoricalPalette,
  categoricalPaletteKey: slice.categoricalPaletteKey,
});

export const loadColorRampSliceFromParams = (slice: ColorRampSlice, params: URLSearchParams): void => {
  const colorRampParam = params.get(UrlParam.COLOR_RAMP);
  if (colorRampParam) {
    const [key, reversed] = colorRampParam.split(URL_COLOR_RAMP_REVERSED_SUFFIX);
    if (KNOWN_COLOR_RAMPS.has(key)) {
      slice.setColorRampKey(key);
      slice.setColorRampReversed(reversed !== undefined);
    }
  }

  const keepRange = decodeBoolean(params.get(UrlParam.KEEP_RANGE));
  if (keepRange !== undefined) {
    slice.setKeepColorRampRange(keepRange);
  }

  // Parse range
  const rangeParam = decodeString(params.get(UrlParam.RANGE));
  if (rangeParam) {
    const [min, max] = rangeParam.split(",").map((value) => parseFloat(value));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      slice.setColorRampRange([min, max]);
    }
  }

  // If both are provided, palette key overrides palette
  const paletteKeyParam = params.get(UrlParam.PALETTE_KEY);
  const paletteParam = params.get(UrlParam.PALETTE);
  if (paletteKeyParam) {
    const paletteData = KNOWN_CATEGORICAL_PALETTES.get(paletteKeyParam);
    if (paletteData) {
      slice.setCategoricalPalette(paletteData.colors);
    }
  } else if (paletteParam) {
    const defaultPalette = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!;

    // Parse into color objects
    const hexColors: ColorRepresentation[] = paletteParam.split("-").map((hex) => "#" + hex) as ColorRepresentation[];
    if (hexColors.length < MAX_FEATURE_CATEGORIES) {
      // backfill extra colors to meet max length using default palette
      hexColors.push(...defaultPalette.colorStops.slice(hexColors.length));
    }
    slice.setCategoricalPalette(hexColors.map((hex) => new Color(hex)));
  }
};
