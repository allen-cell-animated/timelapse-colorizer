import { Color } from "three";

import { MAX_FEATURE_CATEGORIES } from "../../constants";
import { RawColorData } from "./color_ramps";

export type PaletteData = RawColorData & {
  colors: Color[];
};

// DO NOT REMOVE PALETTES FROM THIS LIST OR CHANGE THEIR KEYS. This will break backwards compatibility with URLs.
// Instead, remove them from `DISPLAY_CATEGORICAL_PALETTE_KEYS` to omit them from the UI.
const rawPaletteData: RawColorData[] = [
  {
    // https://spectrum.adobe.com/page/color-for-data-visualization/
    key: "adobe",
    name: "Adobe Categorical",
    colorStops: [
      "#27B4AE",
      "#4047C4",
      "#F48730",
      "#DB4281",
      "#7E84F4",
      "#78DF76",
      "#1C7AED",
      "#7129CD",
      "#E7C73B",
      "#C95F1E",
      "#188E61",
      "#BEE952",
    ],
  },
  {
    // https://spectrum.adobe.com/page/color-for-data-visualization/
    key: "adobe_light",
    name: "Adobe Categorical 50%",
    colorStops: [
      "#93D9D7",
      "#8DBCF6",
      "#F9C397",
      "#EDA0C0",
      "#BEC1F9",
      "#BBEFBA",
      "#9FA3E1",
      "#B894E6",
      "#F3E39D",
      "#E4AF8E",
      "#8BC7B0",
      "#DFF4A8",
    ],
  },
  {
    key: "matplotlib_paired",
    name: "Paired",
    colorStops: [
      "#A8CEE2",
      "#2678B0",
      "#B4DF92",
      "#3C9F3C",
      "#F99C9B",
      "#E02626",
      "#FCC079",
      "#FC822A",
      "#C9B3D4",
      "#693E96",
      "#CC967B",
      "#AF5B31",
    ],
  },
  {
    // https://matplotlib.org/stable/gallery/color/colormap_reference.html
    key: "matplotlib_accent",
    name: "Accent",
    colorStops: [
      "#7FC97F",
      "#BEAED2",
      "#FDC086",
      "#FFFFA4",
      "#3A6CAC",
      "#5D5D6A",
      "#BD5D26",
      "#ED1B7D",
      "#9467BD",
      "#F25FA4",
      "#7598C5",
      "#A8D9AA",
    ],
  },
  {
    // https://matplotlib.org/stable/gallery/color/colormap_reference.html
    key: "matplotlib_tab10",
    name: "Matplotlib - Tab 10",
    colorStops: [
      "#2677B0",
      "#FC822E",
      "#369F3C",
      "#9368B9",
      "#8B574D",
      "#E179BF",
      "#8A0115",
      "#64637C",
      "#BCBD40",
      "#2CBDCD",
      // TODO: This color is very difficult to distinguish from the other orange.
      "#FF8964",
      "#862CCD",
    ],
  },
  {
    // https://medialab.github.io/iwanthue/
    // TODO: Potentially remove or rename
    key: "iwanthue_set2",
    name: "Random - Tea Party",
    colorStops: [
      "#E085FB",
      "#8BE56C",
      "#D12983",
      "#03BD7D",
      "#F16741",
      "#FCCE6F",
      "#0047AA",
      "#8A0115",
      "#64E9CB",
      "#DC9F1C",
      "#BDB0FF",
      "#00B69C",
    ],
  },
  {
    // https://medialab.github.io/iwanthue/
    // TODO: Potentially remove or rename
    key: "iwanthue_set3",
    name: "Random - Chiclets",
    colorStops: [
      "#F769CD",
      "#FFC140",
      "#FF6B76",
      "#0080EA",
      "#007631",
      "#6CBA3A",
      "#7E0046",
      "#832093",
      "#4BADCA",
      "#8CA252",
      "#990004",
      "#00B69C",
    ],
  },
  {
    key: "neon",
    name: "Neon",
    colorStops: [
      "#33FCFE",
      "#F91EF8",
      "#49FE86",
      "#FAEC4C",
      "#AF26F3",
      "#FFB800",
      "#6822F2",
      "#F72B75",
      "#F88538",
      "#003AFF",
      "#CFFA4E",
      "#3EBAFB",
    ],
  },
  {
    // https://medialab.github.io/iwanthue/
    key: "iwanthue_dark",
    name: "Dark",
    colorStops: [
      "#44C098",
      "#A2408D",
      "#6A70D7",
      "#9B8034",
      "#B94858",
      "#543889",
      "#67A852",
      "#BA4B7D",
      "#FCCE6F",
      "#BA5436",
      "#638ED5",
      "#C6A940",
    ],
  },
  {
    // https://matplotlib.org/stable/gallery/color/colormap_reference.html
    key: "matplotlib_pastel1",
    name: "Pastel 1",
    colorStops: [
      "#90D3C8",
      "#BB81BA",
      "#FBB56D",
      "#82B1D1",
      "#B5DE76",
      "#F88376",
      "#DDC09E",
      "#BEBAD8",
      "#9EDADD",
      "#FBCEE4",
      "#FFED7F",
      "#DD9ED3",
    ],
  },
  {
    // https://matplotlib.org/stable/gallery/color/colormap_reference.html
    key: "matplotlib_pastel2",
    name: "Pastel 2",
    colorStops: [
      "#F9B5B0",
      "#B4CDE2",
      "#CDEBC8",
      "#DECBE3",
      "#FDDAAB",
      "#F1E2CE",
      "#F3CBE3",
      "#B5E2CE",
      "#E5D8C0",
      "#CCD5E7",
      "#CBF3D6",
      "#FCCEB0",
    ],
  },
  {
    // https://medialab.github.io/iwanthue/
    key: "iwanthue_pastel_3",
    name: "Pastel 3",
    colorStops: [
      "#9CD2B8",
      "#AAF1D9",
      "#89BAA9",
      "#7CD7D5",
      "#D3C998",
      "#99C2EC",
      "#D6EDB5",
      "#C4B7EA",
      "#9EC991",
      "#EAACCD",
      "#5ECDE9",
      "#E8B297",
    ],
  },
];

// Format the array so it can be read as a map
const keyedPaletteData: [string, PaletteData][] = rawPaletteData.map((value) => {
  const colors = value.colorStops.map((color) => new Color(color));
  return [value.key, { colors, ...value }];
});
const paletteMap: Map<string, PaletteData> = new Map(keyedPaletteData);

/**
 * Returns the string key of a palette if it matches an existing palette; otherwise, returns null.
 */
export const getKeyFromPalette = (palette: Color[]): string | null => {
  for (const data of paletteMap.values()) {
    let matches = true;
    for (let i = 0; i < MAX_FEATURE_CATEGORIES; i++) {
      const paletteColor = palette[i].getHexString().toLowerCase();
      if (paletteColor !== data.colorStops[i].toLowerCase().slice(1)) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return data.key;
    }
  }
  return null;
};

export const KNOWN_CATEGORICAL_PALETTES = paletteMap;
/**
 * List of categorical palettes keys that should be visible on the UI, in order of display.
 * Palettes should never be removed from `KNOWN_CATEGORICAL_PALETTES` to maintain backwards
 * compatibility with URLs, only removed here to omit them from the UI.
 */
export const DISPLAY_CATEGORICAL_PALETTE_KEYS = [
  "adobe",
  // "adobe_light",
  "matplotlib_paired",
  // "matplotlib_accent",
  "matplotlib_tab10",
  // "iwanthue_set2",
  // "iwanthue_set3",
  "neon",
  // "iwanthue_dark",
  "matplotlib_pastel1",
  // "matplotlib_pastel2",
  // "iwanthue_pastel_3",
  // "matplotlib_paired",
];

export const DEFAULT_CATEGORICAL_PALETTE_KEY = "adobe";
