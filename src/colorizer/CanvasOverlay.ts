// NOTE: This is different from the way the documentation imports it (via addons rather than examples).
// This may need to update if we change three.js verisons.
// https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer

import { numberToSciNotation } from "./utils/math_utils";

export type ScaleBarOptions = {
  minWidthPx: number;
  fontSizePx: number;
  fontFamily: string;
  fontColor: string;
  visible: boolean;
  unitsPerScreenPixel: number;
  units: string;
};

const defaultScaleBarOptions: ScaleBarOptions = {
  minWidthPx: 80,
  fontSizePx: 14,
  fontFamily: "Lato",
  fontColor: "black",
  visible: false,
  unitsPerScreenPixel: 1,
  units: "",
};

/**
 * A canvas used for drawing UI overlays over another screen region. (intended for use
 * with `ColorizeCanvas`.)
 */
export default class CanvasOverlay {
  private canvas: HTMLCanvasElement;
  private scaleBarOptions: ScaleBarOptions;

  constructor(scaleBarOptions: ScaleBarOptions = defaultScaleBarOptions) {
    this.canvas = document.createElement("canvas");
    // Disable pointer events on the canvas overlay so it doesn't block mouse events on the main canvas.
    this.canvas.style.pointerEvents = "none";
    this.scaleBarOptions = scaleBarOptions;
  }

  /**
   * Set the size of the canvas overlay.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  updateScaleBarOptions(options: Partial<ScaleBarOptions>): void {
    this.scaleBarOptions = { ...this.scaleBarOptions, ...options };
  }

  /**
   * Formats a number to be displayed in the scale bar to a reasonable number of significant digits,
   * also handling float errors.
   */
  private formatScaleBarValue(value: number): string {
    if (value < 0.01 || value >= 10_000) {
      return numberToSciNotation(value, 0);
    } else if (value < 1) {
      // Fixes float error for unrepresentable values (0.30000000000004 => 0.3)
      return value.toPrecision(1);
    } else {
      // Format integers
      return value.toFixed(0);
    }
  }

  private renderScaleBar(): void {
    if (!this.scaleBarOptions.unitsPerScreenPixel || !this.scaleBarOptions.visible) {
      return;
    }

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return;
    }

    const minWidthUnits = this.scaleBarOptions.minWidthPx * this.scaleBarOptions.unitsPerScreenPixel;
    // Here we get the power of the most significant digit (MSD) of the minimum width in units.
    const msdPower = Math.ceil(Math.log10(minWidthUnits));

    // Only show increments of 1, 2, and 5, because they're easier to read and reason about.
    // Get the next allowed value in the place of the MSD that is greater than the minimum width.
    // This means that the displayed unit in the scale bar only changes at its MSD.
    // Allowed scale bar values will look like this:
    // 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, ...
    const allowedIncrements = [1, 2, 5, 10];
    const msdDigit = minWidthUnits / 10 ** (msdPower - 1);
    // Find the next greatest allowed increment to the MSD digit
    const nextIncrement = allowedIncrements.find((inc) => inc >= msdDigit) || 10;
    const scaleBarWidthInUnits = nextIncrement * 10 ** (msdPower - 1);
    // Convert back into pixels for rendering.
    // Cheat very slightly by rounding to the nearest pixel for cleaner rendering.
    const scaleBarWidthInPixels = Math.round(scaleBarWidthInUnits / this.scaleBarOptions.unitsPerScreenPixel);

    const textContent = `${this.formatScaleBarValue(scaleBarWidthInUnits)} ${this.scaleBarOptions.units}`;

    // Draw the scale bar line
    const scaleBarMargin = 20;
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
    const scaleBarX = this.canvas.width - scaleBarMargin + 0.5;
    const scaleBarY = this.canvas.height - scaleBarMargin + 0.5;
    ctx.beginPath();
    ctx.strokeStyle = this.scaleBarOptions.fontColor;
    ctx.lineWidth = 1;
    ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
    ctx.lineTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY - scaleBarHeight);
    ctx.stroke();

    // Draw the scale bar text label
    // TODO: This looks bad at high magnification. A workaround would be to use CSS2DRenderer to
    // render the text normally and then hotswap it for a regular canvas when recording occurs.
    // (but most likely a non-issue.)
    const margin = scaleBarMargin + 6;
    ctx.font = `${this.scaleBarOptions.fontSizePx}px ${this.scaleBarOptions.fontFamily}`;
    ctx.fillStyle = this.scaleBarOptions.fontColor;
    const textWidth = ctx.measureText(textContent).width;
    console.log(textWidth);
    ctx.fillText(textContent, this.canvas.width - textWidth - margin, this.canvas.height - margin);
  }

  render(): void {
    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return;
    }
    //Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw scale bar and other elements
    this.renderScaleBar();
  }

  get domElement(): HTMLElement {
    return this.canvas;
  }
}
