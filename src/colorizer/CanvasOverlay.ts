import { Vector2 } from "three";
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
  maxTimeSec: number;
  currTimeSec: number;
  frameDurationSec: number;
  startTimeSec: number;
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
  frameDurationSec: 1,
  startTimeSec: 0,
  maxTimeSec: 1,
  currTimeSec: 0,
};

type SizeAndRender = {
  size: Vector2;
  render: () => void;
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

  private getTextDimensions(ctx: CanvasRenderingContext2D, text: string, options: StyleOptions): Vector2 {
    ctx.font = `${options.fontSizePx}px ${options.fontFamily}`;
    ctx.fillStyle = options.fontColor;
    const textWidth = ctx.measureText(text).width;
    return new Vector2(textWidth, options.fontSizePx);
  }

  /**
   * Renders text on the canvas
   * @param ctx the canvas context to render to.
   * @param text the text to render.
   * @param originPx the origin of the text, from the lower right corner, in pixels.
   * @param options style options for the text.
   * @returns the width and height of the text, as a Vector2.
   */
  private renderRightAlignedText(
    ctx: CanvasRenderingContext2D,
    originPx: Vector2,
    text: string,
    options: StyleOptions
  ): Vector2 {
    ctx.font = `${options.fontSizePx}px ${options.fontFamily}`;
    ctx.fillStyle = options.fontColor;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, this.canvas.width - textWidth - originPx.x, this.canvas.height - originPx.y);
    return new Vector2(textWidth, options.fontSizePx);
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

  // NOTE: Rendering of the scale bar and timestamp is deferred here, since we need to draw a background behind them
  // with an appropriate size. These methods return a callback that renders the scale bar or timestamp to the canvas,
  // and provide the dimensions of the rendered element.

  /**
   * Gets the size of the scale bar and a callback to render it to the canvas.
   * @param originPx The origin of the scale bar, from the lower right corner, in pixels.
   * @returns an object with two properties:
   *  - `size`: a vector representing the width and height of the rendered scale bar, in pixels.
   *  - `render`: a callback that renders the scale bar to the canvas.
   */
  private getScaleBarRenderer(ctx: CanvasRenderingContext2D, originPx: Vector2): SizeAndRender {
    if (!this.scaleBarOptions.unitsPerScreenPixel || !this.scaleBarOptions.visible) {
      return { size: new Vector2(0, 0), render: () => {} };
    }

    ///////// Determine the scale bar width and label /////////
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

    ///////// Calculate the padding and origins for drawing and size /////////
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
    const scaleBarX = this.canvas.width - originPx.x + 0.5;
    const scaleBarY = this.canvas.height - originPx.y + 0.5;

    const renderScaleBar = () => {
      // Render the scale bar
      ctx.beginPath();
      ctx.strokeStyle = this.scaleBarOptions.fontColor;
      ctx.lineWidth = 1;
      ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
      ctx.lineTo(scaleBarX, scaleBarY);
      ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY);
      ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY - scaleBarHeight);
      ctx.stroke();
    };

    // TODO: This looks bad at high magnification. A workaround would be to use CSS2DRenderer to
    // render the text normally and then hotswap it for a regular canvas when recording occurs.
    // (but most likely a non-issue?)
    const textPaddingPx = new Vector2(6, 6);
    const textOriginPx = new Vector2(originPx.x + textPaddingPx.x, originPx.y + textPaddingPx.y);
    const renderScaleBarText = () => {
      this.renderRightAlignedText(ctx, textOriginPx, textContent, this.scaleBarOptions);
    };

    return {
      size: new Vector2(scaleBarWidthPx, this.scaleBarOptions.fontSizePx + textPaddingPx.y * 2),
      render: () => {
        renderScaleBar();
        renderScaleBarText();
      },
    };
  }

  /**
   * Draws the timestamp, if visible, and returns the rendered height and width.
   * @param originPx The origin of the timestamp, from the lower right corner, in pixels.
   * @returns A vector representing the width and height of the rendered timestamp, in pixels.
   */
  private renderTimestamp(ctx: CanvasRenderingContext2D, originPx: Vector2): SizeAndRender {
    if (!this.timestampOptions.visible) {
      return { size: new Vector2(0, 0), render: () => {} };
    }

    ////////////////// Format timestamp as text //////////////////
    // Determine maximum units (hours, minutes, or seconds) that the timestamp should display, using the
    // max timestamp parameter.
    // Then, format the resulting timestamp based on that format (Ideally close to HH:mm:ss`s`), with extra
    // precision if only using seconds/minutes (mm:ss.ss`s` or ss.ss`s`).

    const useMinutes = this.timestampOptions.maxTimeSec >= 60;
    const useHours = this.timestampOptions.maxTimeSec >= 60 * 60;
    // Ignore seconds if the frame duration is in minute increments AND the start time is also in minute increments.
    const useSeconds = !(
      this.timestampOptions.frameDurationSec % 60 === 0 && this.timestampOptions.startTimeSec % 60 === 0
    );

    let timestampDigits: string[] = [];
    let timestampUnits: string[] = [];

    if (useHours) {
      const hours = Math.floor(this.timestampOptions.currTimeSec / (60 * 60));
      timestampDigits.push(hours.toString().padStart(2, "0"));
      timestampUnits.push("h");
    }
    if (useMinutes) {
      const minutes = Math.floor(this.timestampOptions.currTimeSec / 60) % 60;
      timestampDigits.push(minutes.toString().padStart(2, "0"));
      timestampUnits.push("m");
    }
    if (useSeconds) {
      const seconds = this.timestampOptions.currTimeSec % 60;
      if (!useHours && this.timestampOptions.frameDurationSec % 1.0 !== 0) {
        // Duration increment is smaller than a second and we're not showing hours, so show milliseconds.
        timestampDigits.push(seconds.toFixed(3).padStart(6, "0"));
      } else {
        timestampDigits.push(seconds.toFixed(0).padStart(2, "0"));
      }
      timestampUnits.push("s");
    }
    const timestampFormatted = timestampDigits.join(":") + " (" + timestampUnits.join(", ") + ")";

    const timestampPaddingPx = new Vector2(2, 2);
    const timestampOriginPx = new Vector2(originPx.x + timestampPaddingPx.x, originPx.y + timestampPaddingPx.y);
    // Save the render function for later.
    const render = () => {
      this.renderRightAlignedText(ctx, timestampOriginPx, timestampFormatted, this.scaleBarOptions);
    };

    return {
      size: new Vector2(
        this.getTextDimensions(ctx, timestampFormatted, this.timestampOptions).x,
        timestampPaddingPx.x * 2 + this.timestampOptions.fontSizePx
      ),
      render,
    };
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
    const boxMargin = new Vector2(20, 20);
    const boxPadding = new Vector2(10, 10);
    let origin = boxMargin.clone().add(boxPadding);
    console.log("origin:");
    console.log(origin);

    // Get dimensions of the components
    const { size: scaleBarDimensions, render: renderScaleBar } = this.getScaleBarRenderer(ctx, origin);
    origin.y += scaleBarDimensions.y;
    const { size: timestampDimensions, render: renderTimestamp } = this.renderTimestamp(ctx, origin);
    console.log(scaleBarDimensions);
    console.log(timestampDimensions);

    const contentSize = new Vector2(
      Math.max(scaleBarDimensions.x, timestampDimensions.x),
      scaleBarDimensions.y + timestampDimensions.y
    );
    console.log(contentSize);
    const boxSize = contentSize.clone().add(boxPadding.clone().multiplyScalar(2.0));
    console.log(boxSize);

    // Draw background box around the components
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(
      this.canvas.width - boxSize.x - boxMargin.x,
      this.canvas.height - boxSize.y - boxMargin.y,
      boxSize.x,
      boxSize.y
    );

    // Draw components over the box
    renderScaleBar();
    renderTimestamp();
  }

  get domElement(): HTMLElement {
    return this.canvas;
  }
}
