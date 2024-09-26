import { Color, Vector2 } from "three";

import { FontStyleOptions } from "./types";
import { configureCanvasText, renderCanvasText } from "./utils/canvas_utils";
import { numberToSciNotation, numberToStringDecimal } from "./utils/math_utils";

import { IControllableCanvas } from "./canvas/IControllableCanvas";
import Collection from "./Collection";
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

type LegendOptions = FontStyleOptions & {
  stroke: string;
  labelFontSizePx: number;
  labelFontColor: string;
  visible: boolean;

  maxColorRampWidthPx: number;
  rampRadiusPx: number;

  categoryPaddingPx: Vector2;
  categoryLabelGapPx: number;
  categoryColGapPx: number;
  maxCategoricalWidthPx: number;
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
  fill: "rgba(255, 255, 255, 1.0)",
  stroke: "rgba(203, 203, 204, 1.0)",
  paddingPx: new Vector2(10, 10),
};

const defaultFooterOptions: FooterOptions = {
  ...defaultHeaderOptions,
  heightPx: 100,
  paddingPx: new Vector2(10, 10),
};

const defaultLegendOptions: LegendOptions = {
  ...defaultStyleOptions,
  stroke: "rgba(203, 203, 204, 1.0)",
  labelFontSizePx: 12,
  labelFontColor: "black",
  visible: true,

  categoryPaddingPx: new Vector2(2, 2),
  categoryLabelGapPx: 6,
  categoryColGapPx: 32,
  maxCategoricalWidthPx: 800,

  maxColorRampWidthPx: 300,
  rampRadiusPx: 4,
};

type RenderCallback = (origin: Vector2) => void;

type RenderInfo = {
  /** Size of the element, in pixels. */
  sizePx: Vector2;
  /** Callback to render the element. */
  render: RenderCallback;
};

const EMPTY_RENDER_INFO: RenderInfo = { sizePx: new Vector2(0, 0), render: () => {} };

/**
 * Extends the ColorizeCanvas class by overlaying and compositing additional
 * dynamic elements (like a scale bar, timestamp, etc.) on top of the
 * base rendered image.
 */
export default class CanvasWithOverlay extends ColorizeCanvas implements IControllableCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private collection: Collection | null;
  private datasetKey: string | null;

  private scaleBarOptions: ScaleBarOptions;
  private timestampOptions: TimestampOptions;
  private backgroundOptions: OverlayFillOptions;
  private legendOptions: LegendOptions;
  private headerOptions: HeaderOptions;
  private footerOptions: FooterOptions;
  private canvasWidth: number;
  private canvasHeight: number;
  private showHeader: boolean;
  private showFooter: boolean;
  private headerSize: Vector2;
  private footerSize: Vector2;

  constructor(options?: {
    scaleBar?: ScaleBarOptions;
    timestamp?: TimestampOptions;
    background?: OverlayFillOptions;
    legend?: LegendOptions;
    header?: HeaderOptions;
    footer?: FooterOptions;
  }) {
    super();

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";

    this.collection = null;
    this.datasetKey = null;

    this.scaleBarOptions = options?.scaleBar || defaultScaleBarOptions;
    this.timestampOptions = options?.timestamp || defaultTimestampOptions;
    this.backgroundOptions = options?.background || defaultBackgroundOptions;
    this.legendOptions = options?.legend || defaultLegendOptions;
    this.headerOptions = options?.header || defaultHeaderOptions;
    this.footerOptions = options?.footer || defaultFooterOptions;
    this.canvasWidth = 1;
    this.canvasHeight = 1;
    this.showHeader = false;
    this.showFooter = false;
    this.headerSize = new Vector2(0, 0);
    this.footerSize = new Vector2(0, 0);

    const canvasContext = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    if (canvasContext === null) {
      throw new Error("CanvasWithOverlay: Could not get canvas context; canvas.getContext('2d') returned null.");
    }
    this.ctx = canvasContext;
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

  public getIdAtPixel(x: number, y: number): number {
    const headerHeight = this.headerSize.y;
    return super.getIdAtPixel(x, y - headerHeight);
  }

  // Getters/Setters ////////////////////////////////

  updateScaleBarOptions(options: Partial<ScaleBarOptions>): void {
    this.scaleBarOptions = { ...this.scaleBarOptions, ...options };
  }

  updateTimestampOptions(options: Partial<TimestampOptions>): void {
    this.timestampOptions = { ...this.timestampOptions, ...options };
  }

  updateBackgroundOptions(options: Partial<OverlayFillOptions>): void {
    this.backgroundOptions = { ...this.backgroundOptions, ...options };
  }

  updateLegendOptions(options: Partial<LegendOptions>): void {
    this.legendOptions = { ...this.legendOptions, ...options };
  }

  setCollection(collection: Collection | null): void {
    this.collection = collection;
  }

  setDatasetKey(datasetKey: string | null): void {
    this.datasetKey = datasetKey;
  }

  // Utility functions //////////////////////////////

  private getPixelRatio(): number {
    return window.devicePixelRatio || 1;
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
  private getScaleBarWidth(
    scaleBarOptions: ScaleBarOptions,
    unitsPerScreenPixel: number
  ): {
    scaleBarWidthPx: number;
    scaleBarWidthInUnits: number;
  } {
    const minWidthUnits = scaleBarOptions.minWidthPx * unitsPerScreenPixel * this.getPixelRatio();
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

  // Rendering functions ////////////////////////////

  /**
   * Gets the size of the scale bar and a callback to render it to the canvas.
   * @returns an object with two properties:
   *  - `size`: a vector representing the width and height of the rendered scale bar, in pixels.
   *  - `render`: a callback that renders the scale bar to the canvas.
   */
  private getScaleBarRenderer(): RenderInfo {
    const frameDims = this.dataset?.metadata.frameDims;
    const hasFrameDims = frameDims && frameDims.width !== 0 && frameDims.height !== 0;

    if (!hasFrameDims || !this.scaleBarOptions.visible) {
      return EMPTY_RENDER_INFO;
    }

    const canvasWidthInUnits = frameDims.width / this.frameSizeInCanvasCoordinates.x;
    const unitsPerScreenPixel = canvasWidthInUnits / this.canvasWidth / this.getPixelRatio();

    ///////// Get scale bar width and unit label /////////
    const { scaleBarWidthPx, scaleBarWidthInUnits } = this.getScaleBarWidth(this.scaleBarOptions, unitsPerScreenPixel);
    const textContent = `${CanvasWithOverlay.formatScaleBarValue(scaleBarWidthInUnits)} ${frameDims.units}`;

    // Calculate the padding and origins for drawing and size
    const scaleBarHeight = 10;

    const renderScaleBar = (scaleBarX: number, scaleBarY: number): void => {
      // Render the scale bar
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.scaleBarOptions.fontColor;
      this.ctx.moveTo(scaleBarX, scaleBarY - scaleBarHeight);
      this.ctx.lineTo(scaleBarX, scaleBarY);
      this.ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY);
      this.ctx.lineTo(scaleBarX - scaleBarWidthPx, scaleBarY - scaleBarHeight);
      this.ctx.stroke();
    };

    const textPaddingPx = new Vector2(6, 4);
    const renderScaleBarText = (origin: Vector2): void => {
      const textOriginPx = new Vector2(origin.x - textPaddingPx.x, origin.y - textPaddingPx.y);

      configureCanvasText(this.ctx, this.scaleBarOptions, "right", "bottom");
      renderCanvasText(this.ctx, textOriginPx.x, textOriginPx.y, textContent);
    };

    return {
      sizePx: new Vector2(scaleBarWidthPx, this.scaleBarOptions.fontSizePx + textPaddingPx.y * 2),
      render: (origin = new Vector2(0, 0)) => {
        // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
        const scaleBarX = origin.x + 0.5;
        const scaleBarY = origin.y + 0.5;

        renderScaleBar(scaleBarX, scaleBarY);
        renderScaleBarText(origin);
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
  private getTimestampRenderer(): RenderInfo {
    if (!this.timestampOptions.visible) {
      return { sizePx: new Vector2(0, 0), render: () => {} };
    }

    ////////////////// Format timestamp as text //////////////////
    const timestampFormatted = this.getTimestampLabel();
    if (!timestampFormatted) {
      return EMPTY_RENDER_INFO;
    }

    // Save the render function for later.
    const timestampPaddingPx = new Vector2(6, 2);
    const render = (origin: Vector2): void => {
      const timestampOriginPx = new Vector2(origin.x - timestampPaddingPx.x, origin.y - timestampPaddingPx.y);
      configureCanvasText(this.ctx, this.timestampOptions, "right", "bottom");
      renderCanvasText(this.ctx, timestampOriginPx.x, timestampOriginPx.y, timestampFormatted);
    };

    return {
      sizePx: new Vector2(
        timestampPaddingPx.x * 2 +
          CanvasWithOverlay.getTextDimensions(this.ctx, timestampFormatted, this.timestampOptions).x,
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
  private renderBackground(origin: Vector2, size: Vector2, options: OverlayFillOptions): void {
    this.ctx.fillStyle = options.fill;
    this.ctx.strokeStyle = options.stroke;
    this.ctx.beginPath();
    this.ctx.roundRect(
      Math.round(origin.x) + 0.5,
      Math.round(origin.y) + 0.5,
      Math.round(size.x),
      Math.round(size.y),
      options.radiusPx
    );
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.closePath();
  }

  private getHeaderText(): string | undefined {
    if (!this.dataset || !this.collection || !this.datasetKey) {
      return undefined;
    }
    const datasetName = this.collection.getDatasetName(this.datasetKey);
    if (this.collection.metadata.name) {
      return `${this.collection.metadata.name} - ${datasetName}`;
    }
    return datasetName;
  }

  private getHeaderRenderer(ctx: CanvasRenderingContext2D): RenderInfo {
    const headerText = this.getHeaderText();
    if (!this.showHeader || !headerText) {
      return EMPTY_RENDER_INFO;
    }
    const options = this.headerOptions;
    // Fill in the background area
    const height = options.fontSizePx + options.paddingPx.y * 2;
    const width = this.canvasWidth;

    return {
      sizePx: new Vector2(width, height),
      render: () => {
        ctx.fillStyle = options.fill;
        ctx.strokeStyle = options.stroke;
        ctx.fillRect(-0.5, -0.5, this.canvasWidth + 1, height);
        ctx.strokeRect(-0.5, -0.5, this.canvasWidth + 1, height);

        const fontOptions = { maxWidth: this.canvasWidth - options.paddingPx.x * 2, ...options };
        configureCanvasText(ctx, options, "center", "top");
        renderCanvasText(ctx, this.canvasWidth / 2, options.paddingPx.y, headerText, fontOptions);
      },
    };
  }

  private getOverlayBoxRenderer(): RenderInfo {
    // Get dimensions + render methods for the elements, but don't render yet so we can draw the background
    // behind them.
    // const origin = this.backgroundOptions.marginPx.clone().add(this.backgroundOptions.paddingPx);
    const { sizePx: scaleBarDimensions, render: renderScaleBar } = this.getScaleBarRenderer();
    const { sizePx: timestampDimensions, render: renderTimestamp } = this.getTimestampRenderer();
    // origin.y += scaleBarDimensions.y;

    // If both elements are invisible, don't render the background.
    if (scaleBarDimensions.equals(new Vector2(0, 0)) && timestampDimensions.equals(new Vector2(0, 0))) {
      return EMPTY_RENDER_INFO;
    }

    // Draw background box behind the elements
    const contentSize = new Vector2(
      Math.max(scaleBarDimensions.x, timestampDimensions.x),
      scaleBarDimensions.y + timestampDimensions.y
    );
    const boxSize = contentSize.clone().add(this.backgroundOptions.paddingPx.clone().multiplyScalar(2.0));

    return {
      sizePx: boxSize,
      render: (origin: Vector2) => {
        this.renderBackground(origin, boxSize, this.backgroundOptions);

        // Lower right corner of scale bar
        const scaleBarOrigin = origin.clone().add(boxSize).sub(this.backgroundOptions.paddingPx);
        renderScaleBar(scaleBarOrigin);

        scaleBarOrigin.y -= scaleBarDimensions.y;
        renderTimestamp(scaleBarOrigin);
      },
    };
  }

  private getSelectedFeatureName(): string | undefined {
    if (!this.dataset || !this.featureKey) {
      return undefined;
    }
    return this.dataset.getFeatureNameWithUnits(this.featureKey);
  }

  private getCategoricalKeyRenderer(ctx: CanvasRenderingContext2D, options: LegendOptions): RenderInfo {
    const maxWidthPx = options.maxCategoricalWidthPx;
    if (!this.dataset || !this.featureKey) {
      return EMPTY_RENDER_INFO;
    }

    const featureData = this.dataset.getFeatureData(this.featureKey);
    const featureName = this.getSelectedFeatureName();
    if (!featureData || !featureData.categories || !featureName) {
      return EMPTY_RENDER_INFO;
    }

    // Render feature label
    const featureLabelHeightPx = options.fontSizePx + 6;
    const categoryHeightPx = options.labelFontSizePx + options.categoryPaddingPx.y * 2;
    const categoryColumnHeight = Math.min(featureData.categories.length, 4) * categoryHeightPx;
    const heightPx = featureLabelHeightPx + categoryColumnHeight;

    return {
      sizePx: new Vector2(maxWidthPx, heightPx),
      render: (origin: Vector2) => {
        const featureLabelFontStyle: FontStyleOptions = { ...options };
        configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
        renderCanvasText(ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
        const labelHeight = featureLabelFontStyle.fontSizePx + 6; // Padding
        origin.y += labelHeight; // Padding

        // Render categories
        const categories = featureData.categories || [];

        const numColumns = Math.ceil(categories.length / MAX_CATEGORIES_PER_COLUMN);
        const categoryWidth = Math.floor(maxWidthPx / numColumns - options.categoryColGapPx);

        const categoryHeight = options.labelFontSizePx + options.categoryPaddingPx.y * 2;
        const colOrigin = origin.clone();

        for (let colIndex = 0; colIndex < numColumns; colIndex++) {
          // Calculate starting point for the column
          const currCategoryOrigin = colOrigin.clone();
          // Offset column origin by number of categories in the column
          // const numItems = Math.min(MAX_CATEGORIES_PER_COLUMN, categories.length - colIndex * MAX_CATEGORIES_PER_COLUMN);
          // const columnHeight = numItems * categoryHeight;
          // currCategoryOrigin.y += Math.floor((MAX_CATEGORIES_PER_COLUMN * categoryHeight - columnHeight) / 2);

          let maxCategoryWidth = Number.NEGATIVE_INFINITY;
          for (
            let categoryIndex = colIndex * MAX_CATEGORIES_PER_COLUMN;
            categoryIndex < Math.min((colIndex + 1) * MAX_CATEGORIES_PER_COLUMN, categories.length);
            categoryIndex++
          ) {
            const category = categories[categoryIndex];

            // Color label
            const color = new Color(this.categoricalPalette.colorStops[categoryIndex]);
            ctx.fillStyle = color.getStyle();
            ctx.strokeStyle = "transparent";
            ctx.beginPath();
            ctx.roundRect(
              currCategoryOrigin.x,
              currCategoryOrigin.y,
              options.labelFontSizePx,
              options.labelFontSizePx,
              2
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            configureCanvasText(ctx, options, "left", "top");
            const maxTextWidth = categoryWidth - options.labelFontSizePx - options.categoryLabelGapPx;
            const textSize = renderCanvasText(
              ctx,
              currCategoryOrigin.x + options.labelFontSizePx + options.categoryLabelGapPx,
              currCategoryOrigin.y,
              category,
              {
                maxWidth: maxTextWidth,
              }
            );
            maxCategoryWidth = Math.max(
              maxCategoryWidth,
              textSize.x + options.labelFontSizePx + options.categoryLabelGapPx
            );
            currCategoryOrigin.y += categoryHeight;
          }

          colOrigin.x += maxCategoryWidth + options.categoryColGapPx;
        }
      },
    };
  }

  private getNumericKeyRenderer(ctx: CanvasRenderingContext2D, options: LegendOptions): RenderInfo {
    const featureName = this.getSelectedFeatureName();
    if (!featureName) {
      return EMPTY_RENDER_INFO;
    }
    const maxWidthPx = options.maxColorRampWidthPx;
    const featureLabelFontStyle: FontStyleOptions = { ...options };

    const height = options.fontSizePx + 4 + 28 + 4 + options.labelFontSizePx;

    return {
      sizePx: new Vector2(maxWidthPx, height),
      render: (origin: Vector2) => {
        configureCanvasText(ctx, featureLabelFontStyle, "left", "top");
        renderCanvasText(ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
        origin.y += featureLabelFontStyle.fontSizePx + 4; // Padding

        // Render color ramp gradient
        const colorStops = this.colorRamp.colorStops.map((c) => new Color(c));
        const gradient = ColorRamp.linearGradientFromColors(ctx, colorStops, maxWidthPx, 0, origin.x, origin.y);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = options.stroke;
        ctx.beginPath();
        ctx.roundRect(origin.x + 0.5, origin.y + 0.5, maxWidthPx - 2, 28, options.rampRadiusPx);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        origin.y += 28 + 4; // Padding

        // Render min/max labels under color ramp
        const rangeLabelFontStyle: FontStyleOptions = { ...options, fontSizePx: options.labelFontSizePx };
        const minLabel = numberToStringDecimal(this.colorMapRangeMin, 3, true);
        const maxLabel = numberToStringDecimal(this.colorMapRangeMax, 3, true);
        configureCanvasText(ctx, rangeLabelFontStyle, "left", "top");
        renderCanvasText(ctx, origin.x, origin.y, minLabel);
        configureCanvasText(ctx, rangeLabelFontStyle, "right", "top");
        renderCanvasText(ctx, origin.x + maxWidthPx, origin.y, maxLabel);
      },
    };
  }

  private getFooterRenderer(ctx: CanvasRenderingContext2D): RenderInfo {
    const options = this.footerOptions;

    const { sizePx: overlaySize, render: renderOverlay } = this.getOverlayBoxRenderer();

    if (!this.showFooter) {
      // If the footer is hidden, the overlay box floats in the bottom right corner of the viewport.
      return {
        sizePx: new Vector2(0, 0),
        render: (origin = new Vector2(0, 0)) => {
          // Offset vertically by height + default margins
          origin.y -= overlaySize.y + this.backgroundOptions.marginPx.y;
          origin.x = this.canvasWidth - overlaySize.x - this.backgroundOptions.marginPx.x;
          renderOverlay(origin);
        },
      };
    }

    // Determine size of the footer based on the max height of the legend
    // and the timestamp/scale bar areas.
    let maxHeight = overlaySize.y;
    let legendRenderer: RenderCallback = () => {};
    const overlayMargin = overlaySize.x > 0 ? this.backgroundOptions.marginPx.x : 0;
    const availableContentWidth = this.canvasWidth - options.paddingPx.x * 2 - overlaySize.x - overlayMargin;

    if (this.dataset && this.featureKey) {
      // Update the max width
      let result: RenderInfo;
      if (this.dataset.isFeatureCategorical(this.featureKey)) {
        const legendOptions = {
          ...this.legendOptions,
          maxCategoricalWidthPx: Math.min(availableContentWidth, this.legendOptions.maxCategoricalWidthPx),
        };
        result = this.getCategoricalKeyRenderer(ctx, legendOptions);
      } else {
        const legendOptions = {
          ...this.legendOptions,
          maxColorRampWidthPx: Math.min(availableContentWidth, this.legendOptions.maxColorRampWidthPx),
        };
        result = this.getNumericKeyRenderer(ctx, legendOptions);
      }
      legendRenderer = result.render;
      maxHeight = Math.max(maxHeight, result.sizePx.y);
    }

    if (maxHeight === 0) {
      return EMPTY_RENDER_INFO;
    }

    const height = Math.round(maxHeight + options.paddingPx.y * 2);
    const width = Math.round(this.canvasWidth + 1);

    return {
      sizePx: new Vector2(width, height),
      render: (origin: Vector2) => {
        origin.x = Math.round(origin.x);
        origin.y = Math.round(origin.y) + 1;
        // Fill in the background of the footer
        ctx.fillStyle = options.fill;
        ctx.strokeStyle = options.stroke;
        ctx.fillRect(origin.x - 0.5, origin.y - 0.5, width, height);
        ctx.strokeRect(origin.x - 0.5, origin.y - 0.5, width, height);

        // Render the overlay box, centering it vertically
        const overlayOrigin = new Vector2(
          this.canvasWidth - overlaySize.x - options.paddingPx.x,
          origin.y + (height - overlaySize.y) / 2
        );
        renderOverlay(overlayOrigin);

        // Render the legend
        const legendOrigin = new Vector2(origin.x + options.paddingPx.x, origin.y + options.paddingPx.y);
        legendRenderer(legendOrigin);
      },
    };
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

    this.showHeader = this.legendOptions.visible;
    this.showFooter = this.legendOptions.visible;

    // Expand size by header + footer, if rendering:
    const headerRenderer = this.getHeaderRenderer(ctx);
    const footerRenderer = this.getFooterRenderer(ctx);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = this.getPixelRatio();
    this.canvas.width = Math.round(this.canvasWidth * devicePixelRatio);
    this.canvas.height = Math.round((this.canvasHeight + this.headerSize.y + this.footerSize.y) * devicePixelRatio);

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render the viewport
    super.render();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(super.domElement, 0, Math.round(this.headerSize.y * devicePixelRatio));

    ctx.scale(devicePixelRatio, devicePixelRatio);

    // ctx.lineWidth = 1 / devicePixelRatio;
    headerRenderer.render(new Vector2(0, 0));
    footerRenderer.render(new Vector2(0, this.canvasHeight + this.headerSize.y));
  }
}
