import { DataTexture, Color, ColorRepresentation, RGBAFormat, FloatType, LinearFilter } from "three";

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

  public sample(t: number): Color {
    // Clamp t
    t = Math.min(Math.max(t, 0), 1);

    const tIndex = t * (this.colorStops.length - 1);
    const minIndex = Math.floor(tIndex);
    const maxIndex = Math.ceil(tIndex);

    if (maxIndex === minIndex) {
      return new Color(this.colorStops[minIndex]);
    }
    // Get a new normalized t value between the min and max indices

    const tNormalized = (tIndex - minIndex) / (maxIndex - minIndex);
    const minColor = new Color(this.colorStops[minIndex]);
    const maxColor = new Color(this.colorStops[maxIndex]);

    return minColor.lerp(maxColor, tNormalized);
  }
}
