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
    colorStops: ["#440154", "#3a528b", "#20908c", "#5ec961", "#fde724"],
  },
  {
    key: "matplotlib-plasma",
    name: "Matplotlib - Plasma",
    colorStops: ["#0c0786", "#5c00a5", "#9b179e", "#cb4777", "#ec7853", "#fdb32e", "#eff821"],
  },
  {
    key: "matplotlib-inferno",
    name: "Matplotlib - Inferno",
    colorStops: ["#000003", "#410967", "#932567", "#dc5039", "#fba40a", "#fcfea4"],
  },
  {
    key: "matplotlib-magma",
    name: "Matplotlib - Magma",
    colorStops: ["#000003", "#3b0f6f", "#8c2980", "#dd4968", "#fd9f6c", "#fbfcbf"],
  },
  {
    key: "seaborn-mako",
    name: "Seaborn - Mako",
    colorStops: ["#0b0305", "#382a54", "#395d9b", "#3496a9", "#5fceac", "#def4e4"],
  },
  {
    key: "matplotlib-turbo",
    name: "Matplotlib - Turbo",
    colorStops: [
      "#30123b",
      "#3c358b",
      "#4458cb",
      "#467af2",
      "#3e9bfe",
      "#28bbeb",
      "#18d5cc",
      "#20e9ac",
      "#46f783",
      "#78fe59",
      "#a4fc3b",
      "#c3f133",
      "#e1dc37",
      "#f6c23a",
      "#fda330",
      "#fa7d20",
      "#ef5a11",
      "#dd3c07",
      "#c32402",
      "#a01101",
      "#7a0402",
    ],
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
    colorStops: ["#48385f", "#995375", "#db4a5b", "#fc9a59", "#fee086"],
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
    colorStops: ["#2c7bb6", "#abd9e9", "#ffffbf", "#fdae61", "#d7191c"],
  },
  {
    key: "esri-blue_red_8",
    name: "ESRI - Blue Red 8",
    colorStops: ["#0571b0", "#92c5de", "#f7f7f7", "#f4a582", "#ca0020"],
  },
  {
    key: "esri-red_green_9",
    name: "ESRI - Red Green 9",
    colorStops: ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
  },
  {
    key: "esri-purple_red_2",
    name: "ESRI - Purple Red 2",
    colorStops: ["#570959", "#ab84a0", "#fffee6", "#d2987f", "#a53217"],
  },
  {
    key: "esri-green_brown_1",
    name: "ESRI - Green Brown 1",
    colorStops: ["#018571", "#80cdc1", "#f5f5f5", "#dfc27d", "#a6611a"],
  },
  {
    key: "matplotlib-purple_orange",
    name: "Matplotlib - Purple Orange",
    colorStops: ["#2d004b", "#998fbf", "#f7f6f5", "#ed9b39", "#7f3b08"],
  },
  {
    key: "seaborn-cubehelix_blue",
    name: "Seaborn - Cubehelix Blue",
    // seaborn.cubehelix_palette(start=0.2, rot=-0.3, as_cmap=True, reverse=True)
    colorStops: ["#27203f", "#48507e", "#6585ab", "#8cb8c9", "#c2e2e2"],
  },
  {
    key: "seaborn-cubehelix_purple",
    name: "Seaborn - Cubehelix Purple",
    // seaborn.cubehelix_palette(as_cmap=True, reverse=True)
    colorStops: ["#2c1e3d", "#6d3f71", "#aa678f", "#d499a7", "#edd1cb"],
  },
  {
    key: "seaborn-cubehelix_green",
    name: "Seaborn - Cubehelix Green",
    // seaborn.cubehelix_palette(start=2.3, rot=-0.3, as_cmap=True, reverse=True)
    colorStops: ["#0f3221", "#31673d", "#64945a", "#a0ba84", "#d9ddbf"],
  },
  {
    key: "fabio_crameri-romao",
    name: "Crameri - RomaO (Cyclical)",
    // Note: this is reversed from the original to match the other palettes
    // which typically reserve warm colors for higher values.
    colorStops: [
      "#733957",
      "#664476",
      "#585893",
      "#4F76AE",
      "#5494C0",
      "#6AB2CB",
      "#8DCEDB",
      "#B1DDD7",
      "#CCE1B1",
      "#D6D790",
      "#CFBC66",
      "#BC9540",
      "#A9732E",
      "#98572C",
      "#8B4433",
      "#7E3943",
      "#733957",
    ],
  },
  {
    key: "fabio_crameri-viko",
    name: "Crameri - VikO (Cyclical)",
    colorStops: [
      "#4F1A3D",
      "#442551",
      "#38396C",
      "#345487",
      "#43739F",
      "#6895B6",
      "#90AFC5",
      "#BAC1C6",
      "#D5BEB3",
      "#D9AC94",
      "#D0916F",
      "#BE714B",
      "#A34D2D",
      "#842E1F",
      "#6C1B21",
      "#5B152C",
      "#50193C",
    ],
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
  "seaborn-mako",
  "matplotlib-plasma",
  "matplotlib-inferno",
  "matplotlib-magma",
  "seaborn-cubehelix_purple",
  "seaborn-cubehelix_green",
  "seaborn-cubehelix_blue",
  "matplotlib-turbo",
  "esri-blue_red_8",
  "esri-green_brown_1",
  "matplotlib-purple_orange",
  "fabio_crameri-romao",
  "fabio_crameri-viko",
];
export const DEFAULT_COLOR_RAMP_KEY = Array.from(colorRampMap.keys())[0];
