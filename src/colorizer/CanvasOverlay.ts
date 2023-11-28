import { numberToSciNotation } from "./utils/math_utils";

export type StyleOptions = {
  fontSizePx: number;
  fontFamily: string;
  fontColor: string;
};

export type ScaleBarOptions = StyleOptions & {
  minWidthPx: number;
  visible: boolean;
  unitsPerScreenPixel: number;
  units: string;
};

export type TimestampOptions = StyleOptions & {
  visible: boolean;
  maxTimestampSeconds: number;
  currentTimestampSeconds: number;
};

const defaultStyleOptions: StyleOptions = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
};

const defaultScaleBarOptions: ScaleBarOptions = {
  ...defaultStyleOptions,
  minWidthPx: 80,
  visible: false,
  unitsPerScreenPixel: 1,
  units: "",
};

const defaultTimestampOptions: TimestampOptions = {
  ...defaultStyleOptions,
  visible: false,
  maxTimestampSeconds: 1,
  currentTimestampSeconds: 0,
};

/**
 * A canvas used for drawing UI overlays over another screen region. (intended for use
 * with `ColorizeCanvas`.)
 */
export default class CanvasOverlay {
  private canvas: HTMLCanvasElement;
  private scaleBarOptions: ScaleBarOptions;
  private timestampOptions: TimestampOptions;

  constructor(
    scaleBarOptions: ScaleBarOptions = defaultScaleBarOptions,
    timestampOptions: TimestampOptions = defaultTimestampOptions
  ) {
    this.canvas = document.createElement("canvas");
    // Disable pointer events on the canvas overlay so it doesn't block mouse events on the main canvas.
    this.canvas.style.pointerEvents = "none";
    this.scaleBarOptions = scaleBarOptions;
    this.timestampOptions = timestampOptions;
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

  updateTimestampOptions(options: Partial<TimestampOptions>): void {
    this.timestampOptions = { ...this.timestampOptions, ...options };
  }

  private renderRightAlignedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    bottomOffsetPx: number,
    horizontalMarginPx: number,
    verticalMarginPx: number,
    options: StyleOptions
  ): void {
    ctx.font = `${options.fontSizePx}px ${options.fontFamily}`;
    ctx.fillStyle = options.fontColor;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(
      text,
      this.canvas.width - textWidth - horizontalMarginPx,
      this.canvas.height - verticalMarginPx - bottomOffsetPx
    );
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

  /**
   * Renders the scale bar, if enabled.
   * @param yOffsetPx The y offset above the bottom of the canvas to render the scale bar from, in pixels.
   * @returns The height taken up by the scale bar, in pixels.
   */
  private renderScaleBar(yOffsetPx: number): number {
    if (!this.scaleBarOptions.unitsPerScreenPixel || !this.scaleBarOptions.visible) {
      return 0;
    }

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return 0;
    }

    const minWidthUnits = this.scaleBarOptions.minWidthPx * this.scaleBarOptions.unitsPerScreenPixel;
    // Here we get the power of the most significant digit (MSD) of the minimum width converted to units.
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
    const scaleBarWidthPx = Math.round(scaleBarWidthInUnits / this.scaleBarOptions.unitsPerScreenPixel);

    const textContent = `${this.formatScaleBarValue(scaleBarWidthInUnits)} ${this.scaleBarOptions.units}`;

    // Draw the scale bar line
    const scaleBarMarginPx = { v: 0, h: 20 }; // L/R margin
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
    const scaleBarX = this.canvas.width - scaleBarMarginPx.h + 0.5;
    const scaleBarY = this.canvas.height - yOffsetPx + 0.5;
    ctx.beginPath();
    ctx.strokeStyle = this.scaleBarOptions.fontColor;
    ctx.lineWidth = 1;
    ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
    ctx.lineTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY);
    ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY - scaleBarHeight);
    ctx.stroke();

    // Draw the scale bar text label
    // TODO: This looks bad at high magnification. A workaround would be to use CSS2DRenderer to
    // render the text normally and then hotswap it for a regular canvas when recording occurs.
    // (but most likely a non-issue.)
    const marginPx = { v: 6, h: scaleBarMarginPx.h + 6 };
    this.renderRightAlignedText(ctx, textContent, yOffsetPx, marginPx.h, marginPx.v, this.scaleBarOptions);

    return 2 * scaleBarMarginPx.v + this.scaleBarOptions.fontSizePx + 10;
  }

  private renderTimestamp(yOffsetPx: number): number {
    if (!this.timestampOptions.visible) {
      return 0;
    }

    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return 0;
    }

    // Determine maximum units (hours, minutes, or seconds) that the timestamp should display, using the
    // max timestamp parameter.
    // Then, format the resulting timestamp based on that format (Ideally close to HH:mm:ss`s`), with extra
    // precision if only using seconds/minutes (mm:ss.ss`s` or ss.ss`s`).
    // TODO: Handle timestamps where only hours/minutes are used. This would require the
    // frame duration to be passed in.
    const useMinutes = this.timestampOptions.maxTimestampSeconds >= 60;
    const useHours = this.timestampOptions.maxTimestampSeconds >= 60 * 60;
    const useHighPrecisionSeconds = !useHours;

    const seconds = this.timestampOptions.currentTimestampSeconds % 60; // Ignore minutes/hours
    let timestampFormatted = "";
    if (useHighPrecisionSeconds) {
      timestampFormatted = seconds.toFixed(2).padStart(5, "0") + "s";
    } else {
      timestampFormatted = seconds.toFixed(0).padStart(2, "0") + "s";
    }
    if (useMinutes) {
      const minutes = Math.floor(this.timestampOptions.currentTimestampSeconds / 60) % 60;
      timestampFormatted = `${minutes.toString().padStart(2, "0")}:${timestampFormatted}`;
    }
    if (useHours) {
      const hours = Math.floor(this.timestampOptions.currentTimestampSeconds / (60 * 60));
      timestampFormatted = `${hours.toString().padStart(2, "0")}:${timestampFormatted}`;
    }
    console.log(timestampFormatted);

    // Render the resulting timestamp in the bottom left corner of the canvas.
    const marginPx = { v: 0, h: 20 };
    this.renderRightAlignedText(ctx, timestampFormatted, yOffsetPx, marginPx.h, marginPx.v, this.scaleBarOptions);

    return marginPx.v * 2 + this.timestampOptions.fontSizePx;
  }

  render(): void {
    const ctx = this.canvas.getContext("2d");
    if (ctx === null) {
      console.error("Could not get canvas context");
      return;
    }
    //Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw scale bar and timestamp
    let yOffset = 20;
    yOffset += this.renderScaleBar(yOffset);
    yOffset += this.renderTimestamp(yOffset);
  }

  get domElement(): HTMLElement {
    return this.canvas;
  }
}
