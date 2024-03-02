import ColorRamp from "../ColorRamp";

// TODO: Could add additional tags for filtering, etc. to each color ramp!
export type RawColorData = {
  /** Internal key name, to be stored in the URL. CHANGING THIS WILL BREAK COMPATIBILITY. */
  key: string;
  /** Display name. */
  name: string;
  colorStops: `#${string}`[];
};

export type ColorRampData = RawColorData & {
  colorRamp: ColorRamp;
};

// https://developers.arcgis.com/javascript/latest/visualization/symbols-color-ramps/esri-color-ramps/
// NOTE: All color ramps must not have the suffix "!". This is reserved for the reversed color ramp URL parameter.
// DO NOT REMOVE COLOR RAMPS FROM THIS LIST OR CHANGE THEIR KEYS. This will break backwards compatibility with URLs.
// Instead, remove them from `DISPLAY_COLOR_RAMP_KEYS` to omit them from the UI.
const rawColorRampData: RawColorData[] = [
  { key: "matplotlib-cool", name: "Matplotlib - Cool", colorStops: ["#00ffff", "#ff00ff"] },
  {
    key: "matplotlib-viridis",
    name: "Matplotlib - Viridis",
    colorStops: ["#fde725", "#5ec962", "#21908c", "#3b528b", "#440154"],
  },
  {
    key: "matplotlib-inferno",
    name: "Matplotlib - Inferno",
    colorStops: ["#fcffa4", "#fca50a", "#dd513a", "#932667", "#420a68", "#000004"],
  },
  {
    key: "matplotlib-magma",
    name: "Matplotlib - Magma",
    colorStops: ["#fcfdbf", "#fe9f6d", "#de4968", "#8c2981", "#3b0f70", "#000004"],
  },
  {
    key: "seaborn-mako",
    name: "Seaborn - Mako",
    colorStops: ["#def4e4", "#5fceac", "#3496a9", "#395d9b", "#382a54", "#0b0305"],
  },
  {
    key: "seaborn-crest",
    name: "Seaborn - Crest",
    colorStops: ["#a4cc90", "#6cb190", "#44948e", "#23758b", "#205583", "#2c3071"],
  },
  { key: "esri-red_5", name: "ESRI - Red 5", colorStops: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"] },
  {
    key: "esri-orange_5",
    name: "ESRI - Orange 5",
    colorStops: ["#dfe1e6", "#bbbfc9", "#b39e93", "#c4703e", "#8c4a23"],
  },
  {
    key: "esri-yellow_2",
    name: "ESRI - Yellow 2",
    colorStops: ["#ffc800", "#e7a300", "#b78300", "#886200", "#584100"],
  },
  {
    key: "esri-green_4",
    name: "ESRI - Green 4",
    colorStops: ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"],
  },
  {
    key: "esri-blue_14",
    name: "ESRI - Blue 14",
    colorStops: ["#ffec99", "#ccbe6a", "#799a96", "#3d6da2", "#3a4d6b"],
  },
  {
    key: "esri-purple_4",
    name: "ESRI - Purple 4",
    colorStops: ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"],
  },
  {
    key: "esri-mentone_beach",
    name: "ESRI - Mentone Beach",
    colorStops: ["#fee086", "#fc9a59", "#db4a5b", "#995375", "#48385f"],
  },
  {
    key: "esri-retro_flow",
    name: "ESRI - Retro Flow",
    colorStops: [
      "#ebe498",
      "#c4dc66",
      "#adbf27",
      "#b6a135",
      "#d9874c",
      "#d43f70",
      "#bf00bf",
      "#881fc5",
      "#443dbf",
      "#007fd9",
    ],
  },
  {
    key: "esri-heatmap_4",
    name: "ESRI - Heatmap 4",
    colorStops: [
      "#ffffff",
      "#ffe3aa",
      "#ffc655",
      "#ffaa00",
      "#ff7100",
      "#ff3900",
      "#ff0000",
      "#d50621",
      "#aa0b43",
      "#801164",
      "#551785",
      "#2b1ca7",
      "#0022c8",
    ],
  },
  {
    key: "esri-blue_red_9",
    name: "ESRI - Blue Red 9",
    colorStops: ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"],
  },
  {
    key: "esri-blue_red_8",
    name: "ESRI - Blue Red 8",
    colorStops: ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
  },
  {
    key: "esri-red_green_9",
    name: "ESRI - Red Green 9",
    colorStops: ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
  },
  {
    key: "esri-purple_red_2",
    name: "ESRI - Purple Red 2",
    colorStops: ["#a53217", "#d2987f", "#fffee6", "#ab84a0", "#570959"],
  },
  {
    key: "esri-green_brown_1",
    name: "ESRI - Green Brown 1",
    colorStops: ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"],
  },
];

// Convert the color stops into color ramps
const colorRampData: ColorRampData[] = rawColorRampData.map((value) => {
  return {
    ...value,
    colorRamp: new ColorRamp(value.colorStops),
  };
});

// Format the array so it can be read as a map
const keyedColorRampData: [string, ColorRampData][] = colorRampData.map((value) => {
  return [value.key, value];
});
const colorRampMap = new Map(keyedColorRampData);

export const KNOWN_COLOR_RAMPS = colorRampMap;
/**
 * List of color ramp keys that should be visible on the UI, in order of display.
 * Color ramps should never be removed from `KNOWN_COLOR_RAMPS` to maintain backwards
 * compatibility with URLs, only removed here to omit them from the UI.
 */
export const DISPLAY_COLOR_RAMP_KEYS = [
  "matplotlib-cool",
  "matplotlib-viridis",
  "matplotlib-inferno",
  "matplotlib-magma",
  "seaborn-mako",
  "seaborn-crest",
  "esri-red_5",
  // "esri-orange_5",
  // "esri-yellow_2",
  "esri-green_4",
  "esri-blue_14",
  // "esri-purple_4",
  "esri-mentone_beach",
  "esri-retro_flow",
  // "esri-heatmap_4",
  "esri-blue_red_9",
  "esri-blue_red_8",
  "esri-red_green_9",
  "esri-purple_red_2",
  "esri-green_brown_1",
];
export const DEFAULT_COLOR_RAMP_KEY = Array.from(colorRampMap.keys())[0];
