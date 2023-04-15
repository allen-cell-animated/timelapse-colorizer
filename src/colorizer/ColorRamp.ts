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

  // TODO add a method to generate a canvas with a horizontal gradient, for dropdowns

  public dispose(): void {
    this.texture.dispose();
  }
}
