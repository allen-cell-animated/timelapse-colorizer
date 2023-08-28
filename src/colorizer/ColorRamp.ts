import { DataTexture, Color, ColorRepresentation, RGBAFormat, FloatType, LinearFilter } from "three";
import { HexColorString } from "three";

export default class ColorRamp {
  private colorStops: Color[];
  public readonly texture: DataTexture;

  constructor(colorStops: ColorRepresentation[]) {
    this.colorStops = colorStops.map((color) => new Color(color));
    const dataArr = this.colorStops.flatMap((col) => [col.r, col.g, col.b, 1]);
    this.texture = new DataTexture(new Float32Array(dataArr), this.colorStops.length, 1, RGBAFormat, FloatType);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.internalFormat = "RGBA32F";
    this.texture.needsUpdate = true;
  }

  /** Creates a canvas filled in with this color ramp, to present as an option in a menu e.g. */
  public createGradientCanvas(width: number, height: number, vertical = false): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    if (this.colorStops.length < 2) {
      ctx.fillStyle = `#${this.colorStops[0].getHexString()}`;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, vertical ? 0 : width, vertical ? height : 0);
      const step = 1 / (this.colorStops.length - 1);
      this.colorStops.forEach((color, idx) => {
        gradient.addColorStop(step * idx, `#${color.getHexString()}`);
      });
      ctx.fillStyle = gradient;
    }

    ctx.fillRect(0, 0, width, height);
    return canvas;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

// https://developers.arcgis.com/javascript/latest/visualization/symbols-color-ramps/esri-color-ramps/
const colorStops: HexColorString[][] = [
  // Esri color ramps - Red 5
  ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  // Esri color ramps - Orange 5
  ["#dfe1e6", "#bbbfc9", "#b39e93", "#c4703e", "#8c4a23"],
  // Esri color ramps - Yellow 2
  ["#584100", "#886200", "#b78300", "#e7a300", "#ffc800"],
  // Esri color ramps - Green 4
  ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"],
  // Esri color ramps - Blue 14
  ["#3a4d6b", "#3d6da2", "#799a96", "#ccbe6a", "#ffec99"],
  // Esri color ramps - Purple 4
  ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"],
  // Esri color ramps - Mentone Beach
  ["#48385f", "#995375", "#db4a5b", "#fc9a59", "#fee086"],
  // Esri color ramps - Retro Flow
  ["#007fd9", "#443dbf", "#881fc5", "#bf00bf", "#d43f70", "#d9874c", "#b6a135", "#adbf27", "#c4dc66", "#ebe498"],
  // Esri color ramps - Heatmap 4
  [
    "#0022c8",
    "#2b1ca7",
    "#551785",
    "#801164",
    "#aa0b43",
    "#d50621",
    "#ff0000",
    "#ff3900",
    "#ff7100",
    "#ffaa00",
    "#ffc655",
    "#ffe3aa",
    "#ffffff",
  ],
  // Esri color ramps - Blue and Red 9
  ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"],
  // Esri color ramps - Blue and Red 8
  ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
  // Esri color ramps - Red and Green 9
  ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
  // Esri color ramps - Purple and Red 2
  ["#a53217", "#d2987f", "#fffee6", "#ab84a0", "#570959"],
  // Esri color ramps - Green and Brown 1
  ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"],
];

export const colorRamps = colorStops.map((ramp) => new ColorRamp(ramp));
