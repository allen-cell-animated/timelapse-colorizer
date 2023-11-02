// TODO: This is different from the way the documentation imports it (via addons rather than examples)
// https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer

import { numberToSciNotation } from "./utils/math_utils";

const MIN_SCALE_BAR_WIDTH_PX = 80;

export default class CanvasOverlay {
  private canvas: HTMLCanvasElement;

  private scaleBarVisible = false;
  private unitsPerScreenPixel: number = 1;
  private scaleBarUnit: string = "";

  constructor() {
    this.canvas = document.createElement("canvas");
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  updateScaleBar(unitsPerScreenPixel: number, unit: string): void {
    this.unitsPerScreenPixel = unitsPerScreenPixel;
    this.scaleBarUnit = unit;
  }

  setScaleBarVisibility(visible: boolean): void {
    this.scaleBarVisible = visible;
  }

  private formatScaleBarValue(value: number): string {
    if (value < 0.01 || value >= 10_000) {
      return numberToSciNotation(value, 0);
    } else if (value < 1) {
      // Fixes float error for unrepresentable values (0.30000000000004 => 0.3)
      return value.toPrecision(1);
    } else {
      return value.toFixed(0);
    }
  }

  private renderScaleBar(): void {
    if (this.unitsPerScreenPixel === 0 || Number.isNaN(this.unitsPerScreenPixel) || !this.scaleBarVisible) {
      return;
    }

    const minWidthUnits = MIN_SCALE_BAR_WIDTH_PX * this.unitsPerScreenPixel;
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
    const nextIncrement = allowedIncrements.find((inc) => inc > msdDigit) || 10;
    const scaleBarWidthInUnits = nextIncrement * 10 ** (msdPower - 1);
    // Convert back into pixels for rendering.
    // Cheat very slightly by rounding to the nearest pixel for cleaner rendering.
    const scaleBarWidthInPixels = Math.round(scaleBarWidthInUnits / this.unitsPerScreenPixel);

    const displayUnits = this.formatScaleBarValue(scaleBarWidthInUnits);
    const textContent = `${displayUnits} ${this.scaleBarUnit}`;

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return;
    }

    // Draw the scale bar line
    const scaleBarMargin = 20;
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply as 1px wide
    const scaleBarX = this.canvas.width - scaleBarMargin + 0.5;
    const scaleBarY = this.canvas.height - scaleBarMargin + 0.5;
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.strokeStyle = "1px solid black";
    ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
    ctx.lineTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY - scaleBarHeight);
    ctx.stroke();

    // TODO: This looks bad at high magnification.
    const fontHeight = 14; // TODO: Get from theme?
    const margin = 20 + 6;
    ctx.font = `${fontHeight}px Lato`;
    ctx.fillStyle = "black";
    const textWidth = ctx.measureText(textContent).width;
    console.log(textWidth);
    ctx.fillText(textContent, this.canvas.width - textWidth - margin, this.canvas.height - margin);
  }

  render() {
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
