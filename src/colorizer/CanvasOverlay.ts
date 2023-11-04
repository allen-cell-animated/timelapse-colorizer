// NOTE: This is different from the way the documentation imports it (via addons rather than examples).
// This may need to update if we change three.js verisons.
// https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer

import { AppTheme } from "../components/AppStyle";
import { numberToSciNotation } from "./utils/math_utils";

const MIN_SCALE_BAR_WIDTH_PX = 80;

/**
 * A canvas used for drawing UI overlays over another screen region. (intended for use
 * with `ColorizeCanvas`.)
 */
export default class CanvasOverlay {
  private canvas: HTMLCanvasElement;

  private scaleBarVisible = false;
  private unitsPerScreenPixel: number = 1;
  private scaleBarUnit: string = "";

  private theme?: AppTheme;

  constructor() {
    this.canvas = document.createElement("canvas");
    // Disable pointer events on the canvas overlay so it doesn't block mouse events on the main canvas.
    this.canvas.style.pointerEvents = "none";
  }

  setTheme(theme: AppTheme): void {
    this.theme = theme;
  }

  /**
   * Set the size of the canvas overlay.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Update the scaling of the scale bar and the displayed units.
   * @param unitsPerScreenPixel The number of units each pixel on the screen represents
   * (assuming 100% magnification).
   * @param unit The unit to display in the scale bar.
   */
  setScaleBarProperties(unitsPerScreenPixel: number, unit: string): void {
    this.unitsPerScreenPixel = unitsPerScreenPixel;
    this.scaleBarUnit = unit;
  }

  setScaleBarVisibility(visible: boolean): void {
    this.scaleBarVisible = visible;
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
    if (this.unitsPerScreenPixel === 0 || Number.isNaN(this.unitsPerScreenPixel) || !this.scaleBarVisible) {
      return;
    }

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
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
    const textColor = this.theme?.color.text.primary || "black";
    const fontSize = this.theme?.font.size.content || 14;

    // Draw the scale bar line
    const scaleBarMargin = 20;
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
    const scaleBarX = this.canvas.width - scaleBarMargin + 0.5;
    const scaleBarY = this.canvas.height - scaleBarMargin + 0.5;
    ctx.beginPath();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
    ctx.lineTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthInPixels, scaleBarY - scaleBarHeight);
    ctx.stroke();

    // Draw the scale bar text label
    // TODO: This looks bad at high magnification.
    const margin = scaleBarMargin + 6;
    ctx.font = `${fontSize}px ${this.theme?.font.family || "Lato"}`;
    ctx.fillStyle = textColor;
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
