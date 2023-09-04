import { HexColorString } from "three";
import { ColorRamp } from "./colorizer";

// https://developers.arcgis.com/javascript/latest/visualization/symbols-color-ramps/esri-color-ramps/
const colorStops: [string, HexColorString[]][] = [
  // Matplotlib - cool
  ["matplotlib-cool", ["#00ffff", "#ff00ff"]],
  // Esri color ramps - Red 5
  ["esri-red_5", ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"]],
  // Esri color ramps - Orange 5
  ["esri-orange_5", ["#dfe1e6", "#bbbfc9", "#b39e93", "#c4703e", "#8c4a23"]],
  // Esri color ramps - Yellow 2
  ["esri-yellow_2", ["#ffc800", "#e7a300", "#b78300", "#886200", "#584100"]],
  // Esri color ramps - Green 4
  ["esri-green_4", ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"]],
  // Esri color ramps - Blue 14
  ["esri-blue_14", ["#ffec99", "#ccbe6a", "#799a96", "#3d6da2", "#3a4d6b"]],
  // Esri color ramps - Purple 4
  ["esri-purple_5", ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"]],
  // Esri color ramps - Mentone Beach
  ["esri-mentone_beach", ["#fee086", "#fc9a59", "#db4a5b", "#995375", "#48385f"]],
  // Esri color ramps - Retro Flow
  [
    "esri-retro_flow",
    ["#ebe498", "#c4dc66", "#adbf27", "#b6a135", "#d9874c", "#d43f70", "#bf00bf", "#881fc5", "#443dbf", "#007fd9"],
  ],
  // Esri color ramps - Heatmap 4
  [
    "esri-heatmap_4",
    [
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
  ],
  // Esri color ramps - Blue and Red 9
  ["esri-blue_red_9", ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"]],
  // Esri color ramps - Blue and Red 8
  ["esri-blue_red_8", ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"]],
  // Esri color ramps - Red and Green 9
  ["esri-red_green_9", ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"]],
  // Esri color ramps - Purple and Red 2
  ["esri-purple_red_2", ["#a53217", "#d2987f", "#fffee6", "#ab84a0", "#570959"]],
  // Esri color ramps - Green and Brown 1
  ["esri-green_brown_1", ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"]],
];

export const DEFAULT_COLOR_RAMPS = new Map(colorStops.map(([name, ramp]) => [name, new ColorRamp(ramp)]));
export const DEFAULT_COLOR_RAMP_ID = colorStops[0][0];
export const DEFAULT_COLOR_RAMP = new ColorRamp(["#ffffff", "#000000"]);
