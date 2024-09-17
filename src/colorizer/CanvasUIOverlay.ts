import { Color, ColorRepresentation, Vector2 } from "three";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "./colors/categorical_palettes";
import { DEFAULT_COLOR_RAMP_KEY, KNOWN_COLOR_RAMPS } from "./colors/color_ramps";
import { FontStyleOptions } from "./types";
import { configureCanvasText, renderCanvasText } from "./utils/canvas_utils";
import { numberToSciNotation } from "./utils/math_utils";

import ColorizeCanvas from "./ColorizeCanvas";
import ColorRamp from "./ColorRamp";

const MAX_CATEGORIES_PER_COLUMN = 4;

type ScaleBarOptions = FontStyleOptions & {
  minWidthPx: number;
  visible: boolean;
};

type TimestampOptions = FontStyleOptions & {
  visible: boolean;
};

type OverlayFillOptions = {
  fill: string;
  stroke: string;
  paddingPx: Vector2;
  marginPx: Vector2;
  radiusPx: number;
};

type KeyOptions = FontStyleOptions & {
  stroke: string;
  labelFontSizePx: number;
  labelFontColor: string;
  selectedFeatureName: string;
  type: "numeric" | "categorical";
  numeric: {
    colorRamp: ColorRepresentation[];
    min: number;
    max: number;
  };
  categorical: {
    categories: string[];
    categoricalPalette: ColorRepresentation[];
    paddingPx: Vector2;
    gapPx: number;
  };
  maxWidthPx: number;
  rampRadiusPx: number;
};

type HeaderOptions = FontStyleOptions & {
  fill: string;
  stroke: string;
  paddingPx: Vector2;
};

type FooterOptions = HeaderOptions & {
  heightPx: number;
};

const defaultStyleOptions: FontStyleOptions = {
  fontColor: "black",
  fontSizePx: 14,
  fontFamily: "Lato",
  fontWeight: "400",
};

const defaultScaleBarOptions: ScaleBarOptions = {
  ...defaultStyleOptions,
  minWidthPx: 80,
  visible: true,
};

const defaultTimestampOptions: TimestampOptions = {
  ...defaultStyleOptions,
  visible: true,
};

const defaultBackgroundOptions: OverlayFillOptions = {
  fill: "rgba(255, 255, 255, 0.8)",
  stroke: "rgba(0, 0, 0, 0.2)",
  paddingPx: new Vector2(10, 10),
  marginPx: new Vector2(12, 12),
  radiusPx: 4,
};

const defaultHeaderOptions: HeaderOptions = {
  ...defaultStyleOptions,
  fontSizePx: 16,
  fill: "rgba(255, 255, 255, 0.8)",
  stroke: "rgba(0, 0, 0, 0.2)",
  paddingPx: new Vector2(10, 10),
};

const defaultFooterOptions: FooterOptions = {
  ...defaultHeaderOptions,
  heightPx: 88,
  paddingPx: new Vector2(10, 10),
};

const defaultKeyOptions: KeyOptions = {
  ...defaultStyleOptions,
  stroke: "rgba(0, 0, 0, 0.2)",
  labelFontSizePx: 12,
  labelFontColor: "black",
  selectedFeatureName: "Some example feature (m)",
  type: "numeric",
  numeric: {
    colorRamp: KNOWN_COLOR_RAMPS.get(DEFAULT_COLOR_RAMP_KEY)!.colorStops,
    min: 0,
    max: 1,
  },
  categorical: {
    categories: ["test1", "test2", "test 3 long name oopsie!!!!"],
    categoricalPalette: KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!.colorStops,
    paddingPx: new Vector2(2, 2),
    gapPx: 32,
  },
  maxWidthPx: 200,
  rampRadiusPx: 4,
};

type RenderInfo = {
  /** Size of the element, in pixels. */
  sizePx: Vector2;
  /** Callback to render the element. */
  render: () => void;
};

const EMPTY_RENDER_INFO: RenderInfo = { sizePx: new Vector2(0, 0), render: () => {} };

/**
 * Extends the ColorizeCanvas class by overlaying and compositing additional
 * dynamic elements (like a scale bar, timestamp, etc.) on top of the
 * base rendered image.
 */
export default class CanvasOverlay extends ColorizeCanvas {
  private canvas: HTMLCanvasElement;

  private scaleBarOptions: ScaleBarOptions;
  private timestampOptions: TimestampOptions;
  private backgroundOptions: OverlayFillOptions;
  private canvasWidth: number;
  private canvasHeight: number;
  private showHeader: boolean;
  private showFooter: boolean;

  constructor(options?: { scaleBar?: ScaleBarOptions; timestamp?: TimestampOptions; background?: OverlayFillOptions }) {
    super();

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";

    this.scaleBarOptions = options?.scaleBar || defaultScaleBarOptions;
    this.timestampOptions = options?.timestamp || defaultTimestampOptions;
    this.backgroundOptions = options?.background || defaultBackgroundOptions;
    this.canvasWidth = 1;
    this.canvasHeight = 1;
    this.showHeader = true;
    this.showFooter = true;
  }

  // Wrapped ColorizeCanvas functions ///////

  get domElement(): HTMLCanvasElement {
    // Override base ColorizeCanvas getter with the composited canvas.
    return this.canvas;
  }

  public setSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    super.setSize(width, height);
  }

  // Rendering ////////////////////////////////

  private getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  updateScaleBarOptions(options: Partial<ScaleBarOptions>): void {
    this.scaleBarOptions = { ...this.scaleBarOptions, ...options };
  }

  updateTimestampOptions(options: Partial<TimestampOptions>): void {
    this.timestampOptions = { ...this.timestampOptions, ...options };
  }

  updateBackgroundOptions(options: Partial<OverlayFillOptions>): void {
    this.backgroundOptions = { ...this.backgroundOptions, ...options };
  }

  private static getTextDimensions(ctx: CanvasRenderingContext2D, text: string, options: FontStyleOptions): Vector2 {
    configureCanvasText(ctx, options);
    const textWidth = ctx.measureText(text).width;
    return new Vector2(textWidth, options.fontSizePx);
  }

  /**
   * Formats a number to be displayed in the scale bar to a reasonable number of significant digits,
   * also handling float errors.
   */
  private static formatScaleBarValue(value: number): string {
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
   * Determine a reasonable width for the scale bar, in units, and the corresponding width in pixels.
   * Unit widths will always have values `nx10^m`, where `n` is 1, 2, or 5, and `m` is an integer. Pixel widths
   * will always be greater than or equal to the `scaleBarOptions.minWidthPx`.
   * @param scaleBarOptions Configuration for the scale bar
   * @param unitsPerScreenPixel The number of units per pixel on the screen.
   * @returns An object, containing keys for the width in pixels and units.
   */
  private static getScaleBarWidth(
    scaleBarOptions: ScaleBarOptions,
    unitsPerScreenPixel: number
  ): {
    scaleBarWidthPx: number;
    scaleBarWidthInUnits: number;
  } {
    const minWidthUnits = scaleBarOptions.minWidthPx * unitsPerScreenPixel;
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
    // Scale also by device pixel ratio so units are in terms of the screen size (and not any canvas scaling).
    const scaleBarWidthPx = Math.round(scaleBarWidthInUnits / unitsPerScreenPixel / devicePixelRatio);
    return { scaleBarWidthPx, scaleBarWidthInUnits };
  }

  /**
   * Gets the size of the scale bar and a callback to render it to the canvas.
   * @param originPx The origin of the scale bar, from the lower right corner, in pixels.
   * @returns an object with two properties:
   *  - `size`: a vector representing the width and height of the rendered scale bar, in pixels.
   *  - `render`: a callback that renders the scale bar to the canvas.
   */
  private getScaleBarRenderer(ctx: CanvasRenderingContext2D, originPx: Vector2): RenderInfo {
    const frameDims = this.dataset?.metadata.frameDims;
    const hasFrameDims = frameDims && frameDims.width !== 0 && frameDims.height !== 0;

    if (!hasFrameDims || !this.scaleBarOptions.visible) {
      return EMPTY_RENDER_INFO;
    }

    const canvasWidthInUnits = frameDims.width / this.frameSizeInCanvasCoordinates.x;
    const unitsPerScreenPixel = canvasWidthInUnits / this.canvasWidth / this.getPixelRatio();

    ///////// Get scale bar width and unit label /////////
    const { scaleBarWidthPx, scaleBarWidthInUnits } = CanvasOverlay.getScaleBarWidth(
      this.scaleBarOptions,
      unitsPerScreenPixel
    );
    const textContent = `${CanvasOverlay.formatScaleBarValue(scaleBarWidthInUnits)} ${frameDims.units}`;

    ///////// Calculate the padding and origins for drawing and size /////////
    const scaleBarHeight = 10;
    // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
    const scaleBarX = this.canvasWidth - originPx.x + 0.5;
    const scaleBarY = this.canvasHeight - originPx.y + 0.5;

    const renderScaleBar = (): void => {
      // Render the scale bar
      ctx.beginPath();
      ctx.strokeStyle = this.scaleBarOptions.fontColor;
      ctx.lineWidth = 1;
      // Draw, starting from the top right corner and going clockwise.
      ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
      ctx.lineTo(scaleBarX, scaleBarY);
      ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY);
      ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY - scaleBarHeight);
      ctx.stroke();
    };

    // TODO: This looks bad at high magnification. A workaround would be to use CSS2DRenderer to
    // render the text normally and then hotswap it for a regular canvas when recording occurs.
    // (but most likely a non-issue?)
    const textPaddingPx = new Vector2(6, 4);
    const textOriginPx = new Vector2(
      this.canvasWidth - originPx.x - textPaddingPx.x,
      this.canvasHeight - originPx.y - textPaddingPx.y
    );
    const renderScaleBarText = (): void => {
      configureCanvasText(ctx, this.scaleBarOptions, "right", "bottom");
      renderCanvasText(ctx, textOriginPx.x, textOriginPx.y, textContent);
    };

    return {
      sizePx: new Vector2(scaleBarWidthPx, this.scaleBarOptions.fontSizePx + textPaddingPx.y * 2),
      render: () => {
        renderScaleBar();
        renderScaleBarText();
      },
    };
  }

  /**
   * Calculates a timestamp based on the current timestamp configuration.
   * @param timestampOptions Configuration for the timestamp, including the frame duration,
   * current time, and maximum time.
   * @returns a string timestamp. Units for the timestamp are determined by the units
   * present in the maximum time possible. Millisecond precision will be shown if the frame
   * duration is less than a second and the max time is < 1 hour.
   *
   * Valid example timestamps:
   * - `HH:mm:ss (h, m, s)`
   * - `HH:mm (h, m)`
   * - `mm:ss (m, s)`
   * - `mm:ss.sss (m, s)`
   * - `ss (s)`
   * - `ss.sss (s)`.
   */
  private getTimestampLabel(): string | undefined {
    if (!this.dataset || !this.dataset.metadata.frameDurationSeconds) {
      return undefined;
    }

    const frameDurationSec = this.dataset.metadata.frameDurationSeconds;
    const startTimeSec = this.dataset.metadata.startTimeSeconds;
    const currTimeSec = this.getCurrentFrame() * frameDurationSec + startTimeSec;
    const maxTimeSec = this.dataset.numberOfFrames * frameDurationSec + startTimeSec;

    const useHours = maxTimeSec >= 60 * 60;
    const useMinutes = maxTimeSec >= 60;
    // Ignore seconds if the frame duration is in minute increments AND the start time is also in minute increments.
    const useSeconds = !(frameDurationSec % 60 === 0 && startTimeSec % 60 === 0);

    const timestampDigits: string[] = [];
    const timestampUnits: string[] = [];

    if (useHours) {
      const hours = Math.floor(currTimeSec / (60 * 60));
      timestampDigits.push(hours.toString().padStart(2, "0"));
      timestampUnits.push("h");
    }
    if (useMinutes) {
      const minutes = Math.floor(currTimeSec / 60) % 60;
      timestampDigits.push(minutes.toString().padStart(2, "0"));
      timestampUnits.push("m");
    }
    if (useSeconds) {
      const seconds = currTimeSec % 60;
      if (!useHours && frameDurationSec % 1.0 !== 0) {
        // Duration increment is smaller than a second and we're not showing hours, so show milliseconds.
        timestampDigits.push(seconds.toFixed(3).padStart(6, "0"));
      } else {
        timestampDigits.push(seconds.toFixed(0).padStart(2, "0"));
      }
      timestampUnits.push("s");
    }

    return timestampDigits.join(":") + " (" + timestampUnits.join(", ") + ")";
  }

  /**
   * Draws the timestamp, if visible, and returns the rendered height and width.
   * @param originPx The origin of the timestamp, from the lower right corner, in pixels.
   * @returns an object with two properties:
   *  - `size`: a vector representing the width and height of the rendered scale bar, in pixels.
   *  - `render`: a callback that renders the scale bar to the canvas.
   */
  private getTimestampRenderer(ctx: CanvasRenderingContext2D, originPx: Vector2): RenderInfo {
    if (!this.timestampOptions.visible) {
      return { sizePx: new Vector2(0, 0), render: () => {} };
    }

    ////////////////// Format timestamp as text //////////////////
    const timestampFormatted = this.getTimestampLabel();
    if (!timestampFormatted) {
      return EMPTY_RENDER_INFO;
    }

    // TODO: Would be nice to configure top/bottom/left/right padding separately.
    const timestampPaddingPx = new Vector2(6, 2);
    const timestampOriginPx = new Vector2(
      this.canvasWidth - originPx.x - timestampPaddingPx.x,
      this.canvasHeight - originPx.y - timestampPaddingPx.y
    );
    // Save the render function for later.
    const render = (): void => {
      configureCanvasText(ctx, this.timestampOptions, "right", "bottom");
      renderCanvasText(ctx, timestampOriginPx.x, timestampOriginPx.y, timestampFormatted);
    };

    return {
      sizePx: new Vector2(
        timestampPaddingPx.x * 2 + CanvasOverlay.getTextDimensions(ctx, timestampFormatted, this.timestampOptions).x,
        timestampPaddingPx.y * 2 + this.timestampOptions.fontSizePx
      ),
      render,
    };
  }

  /**
   * Draws the background overlay in the bottom right corner of the canvas.
   * @param ctx Canvas context to render to.
   * @param size Size of the background overlay.
   * @param options Configuration for the background overlay.
   */
  private renderBackground(ctx: CanvasRenderingContext2D, size: Vector2, options: OverlayFillOptions): void {
    ctx.fillStyle = options.fill;
    ctx.strokeStyle = options.stroke;
    ctx.beginPath();
    ctx.roundRect(
      Math.round(this.canvasWidth - size.x - options.marginPx.x) + 0.5,
      Math.round(this.canvasHeight - size.y - options.marginPx.y) + 0.5,
      Math.round(size.x),
      Math.round(size.y),
      options.radiusPx
    );
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  public getHeaderSizePx(ctx: CanvasRenderingContext2D, header: string, options: FontStyleOptions): Vector2 {
    return CanvasOverlay.getTextDimensions(ctx, header, options);
  }

  private renderHeader(ctx: CanvasRenderingContext2D, options: HeaderOptions): void {
    if (!this.showHeader) {
      return;
    }
    // Fill in the background area
    const height = options.fontSizePx + options.paddingPx.y * 2;

    ctx.fillStyle = options.fill;
    ctx.strokeStyle = options.stroke;
    ctx.fillRect(-0.5, -0.5, this.canvasWidth + 1, height);
    ctx.strokeRect(-0.5, -0.5, this.canvasWidth + 1, height);

    const fontOptions = { maxWidth: this.canvasWidth - options.paddingPx.x * 2, ...options };

    configureCanvasText(ctx, options, "center", "top");
    renderCanvasText(ctx, this.canvasWidth / 2, options.paddingPx.y, "Header", fontOptions);
  }

  private renderFooter(ctx: CanvasRenderingContext2D, options: FooterOptions): void {
    if (!this.showFooter) {
      return;
    }
    // Fill in the background area
    const height = options.heightPx;

    ctx.fillStyle = options.fill;
    ctx.strokeStyle = options.stroke;
    ctx.beginPath();
    ctx.rect(-0.5, this.canvasHeight - 0.5 - height, this.canvasWidth + 1, height + 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private renderCategoricalKey(ctx: CanvasRenderingContext2D, options: KeyOptions): void {
    const origin = new Vector2(20, this.canvasHeight - defaultFooterOptions.heightPx + 14);

    const maxWidthPx = options.maxWidthPx;
    const featureLabelFontStyle: FontStyleOptions = { ...options };
    configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
    renderCanvasText(ctx, origin.x, origin.y, options.selectedFeatureName, { maxWidth: maxWidthPx });
    origin.y += featureLabelFontStyle.fontSizePx + 4; // Padding

    const { categories, categoricalPalette } = options.categorical;

    const numColumns = Math.ceil(categories.length / MAX_CATEGORIES_PER_COLUMN);

    const categoryHeight = options.labelFontSizePx + options.categorical.paddingPx.y * 2;
    const categoryOrigin = origin.clone();
    // for (let i = 0; i < categories.length; i++) {
    //   const category = categories[i];
    //   const color = new Color(categoricalPalette[i]);
    //   ctx.fillStyle = color.getStyle();
    //   ctx.strokeStyle = "transparent";
    //   ctx.beginPath();
    //   ctx.rect(categoryOrigin.x, categoryOrigin.y, categoryWidth, categoryHeight);
    //   ctx.fill();
    //   ctx.stroke();
    //   ctx.closePath();
    //   configureCanvasText(ctx, options, "left", "top");
    //   renderCanvasText(ctx, categoryOrigin.x + categoryWidth + categoryPadding, categoryOrigin.y, category);
    //   categoryOrigin.y += categoryHeight + category;
    // }
  }

  renderNumericKey(ctx: CanvasRenderingContext2D, options: KeyOptions): void {
    const origin = new Vector2(20, this.canvasHeight - defaultFooterOptions.heightPx + 14);

    const maxWidthPx = options.maxWidthPx;
    const featureLabelFontStyle: FontStyleOptions = { ...options };
    configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
    renderCanvasText(ctx, origin.x, origin.y, options.selectedFeatureName, { maxWidth: maxWidthPx });
    origin.y += featureLabelFontStyle.fontSizePx + 4; // Padding

    const { colorRamp } = options.numeric;
    const colorStops = colorRamp.map((c) => new Color(c));
    const gradient = ColorRamp.linearGradientFromColors(ctx, colorStops, maxWidthPx, 0, origin.x, origin.y);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = options.stroke;
    ctx.beginPath();
    ctx.roundRect(origin.x + 0.5, origin.y + 0.5, maxWidthPx - 2, 28, options.rampRadiusPx);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    origin.y += 28 + 4; // Padding

    const rangeLabelFontStyle: FontStyleOptions = { ...options, fontSizePx: options.labelFontSizePx };
    configureCanvasText(ctx, rangeLabelFontStyle, "left", "top");
    renderCanvasText(ctx, origin.x, origin.y, "Min");
    configureCanvasText(ctx, rangeLabelFontStyle, "right", "top");
    renderCanvasText(ctx, origin.x + maxWidthPx, origin.y, "Max");
  }

  /**
   * Render the overlay to the canvas.
   */
  render(): void {
    const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (ctx === null) {
      console.error("Could not get canvas context");
      return;
    }

    const devicePixelRatio = this.getPixelRatio();
    this.canvas.width = this.canvasWidth * devicePixelRatio;
    this.canvas.height = this.canvasHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    //Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render the viewport
    super.render();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(super.domElement, 0, 0);

    // Get dimensions + render methods for the elements, but don't render yet so we can draw the background
    // behind them.
    const origin = this.backgroundOptions.marginPx.clone().add(this.backgroundOptions.paddingPx);
    const { sizePx: scaleBarDimensions, render: renderScaleBar } = this.getScaleBarRenderer(ctx, origin);
    origin.y += scaleBarDimensions.y;
    const { sizePx: timestampDimensions, render: renderTimestamp } = this.getTimestampRenderer(ctx, origin);

    // If both elements are invisible, don't render the background.
    if (scaleBarDimensions.equals(new Vector2(0, 0)) && timestampDimensions.equals(new Vector2(0, 0))) {
      return;
    }

    this.renderHeader(ctx, defaultHeaderOptions);
    this.renderFooter(ctx, defaultFooterOptions);
    this.renderNumericKey(ctx, defaultKeyOptions);

    // Draw background box behind the elements
    const contentSize = new Vector2(
      Math.max(scaleBarDimensions.x, timestampDimensions.x),
      scaleBarDimensions.y + timestampDimensions.y
    );
    const boxSize = contentSize.clone().add(this.backgroundOptions.paddingPx.clone().multiplyScalar(2.0));
    this.renderBackground(ctx, boxSize, this.backgroundOptions);

    // Draw elements over the background
    renderScaleBar();
    renderTimestamp();
  }
}
