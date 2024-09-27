import { Color, Vector2 } from "three";

import { defaultHeaderOptions, getHeaderRenderer, HeaderOptions } from "./canvas/header";
import { EMPTY_RENDER_INFO, FontStyleOptions, RenderCallback, RenderInfo } from "./canvas/types";
import { configureCanvasText, renderCanvasText } from "./utils/canvas_utils";
import { numberToSciNotation, numberToStringDecimal } from "./utils/math_utils";

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

type InsetBoxOptions = {
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

  rampHeightPx: number;
  rampPaddingPx: number;
  rampRadiusPx: number;
  maxColorRampWidthPx: number;

  categoryPaddingPx: Vector2;
  categoryLabelGapPx: number;
  categoryColGapPx: number;
  maxCategoricalWidthPx: number;
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

const defaultInsetBoxOptions: InsetBoxOptions = {
  fill: "rgba(255, 255, 255, 0.8)",
  stroke: "rgba(0, 0, 0, 0.2)",
  paddingPx: new Vector2(10, 10),
  marginPx: new Vector2(12, 12),
  radiusPx: 4,
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

  categoryPaddingPx: new Vector2(2, 2),
  categoryLabelGapPx: 6,
  categoryColGapPx: 32,
  maxCategoricalWidthPx: 800,

  maxColorRampWidthPx: 300,
  rampPaddingPx: 4,
  rampHeightPx: 28,
  rampRadiusPx: 4,
};

/**
 * Extends the ColorizeCanvas class by overlaying and compositing additional
 * dynamic elements (like a scale bar, timestamp, etc.) on top of the
 * base rendered image.
 */
export default class CanvasWithOverlay extends ColorizeCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private collection: Collection | null;
  private datasetKey: string | null;

  private scaleBarOptions: ScaleBarOptions;
  private timestampOptions: TimestampOptions;
  private insetBoxOptions: InsetBoxOptions;
  private legendOptions: LegendOptions;
  private headerOptions: HeaderOptions;
  private footerOptions: FooterOptions;
  private canvasWidth: number;
  private canvasHeight: number;

  // Size of the header and footer as of the current render.
  private headerSize: Vector2;
  private footerSize: Vector2;

  /**
   * Flags whether the canvas is in export mode and we should render with
   * additional optional elements like the header and footer.
   */
  private isExporting: boolean;

  constructor(options?: {
    scaleBar?: ScaleBarOptions;
    timestamp?: TimestampOptions;
    insetBox?: InsetBoxOptions;
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
    this.insetBoxOptions = options?.insetBox || defaultInsetBoxOptions;
    this.legendOptions = options?.legend || defaultLegendOptions;
    this.headerOptions = options?.header || defaultHeaderOptions;
    this.footerOptions = options?.footer || defaultFooterOptions;
    this.canvasWidth = 1;
    this.canvasHeight = 1;
    this.headerSize = new Vector2(0, 0);
    this.footerSize = new Vector2(0, 0);

    this.isExporting = false;

    const canvasContext = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    if (canvasContext === null) {
      throw new Error("CanvasWithOverlay: Could not get canvas context; canvas.getContext('2d') returned null.");
    }
    this.ctx = canvasContext;

    this.getExportDimensions = this.getExportDimensions.bind(this);
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

  updateInsetBoxOptions(options: Partial<InsetBoxOptions>): void {
    this.insetBoxOptions = { ...this.insetBoxOptions, ...options };
  }

  updateLegendOptions(options: Partial<LegendOptions>): void {
    this.legendOptions = { ...this.legendOptions, ...options };
  }

  updateHeaderOptions(options: Partial<HeaderOptions>): void {
    this.headerOptions = { ...this.headerOptions, ...options };
  }

  updateFooterOptions(options: Partial<FooterOptions>): void {
    this.footerOptions = { ...this.footerOptions, ...options };
  }

  setIsExporting(isExporting: boolean): void {
    this.isExporting = isExporting;
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
    const devicePixelRatio = this.getPixelRatio();
    const minWidthUnits = scaleBarOptions.minWidthPx * unitsPerScreenPixel * devicePixelRatio;
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
   *  - `render`: a callback that renders the scale bar to the canvas. The origin is the lower right
   *    corner of the scalebar.
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

    const renderScaleBar = (bottomRightOrigin: Vector2): void => {
      // Render the scale bar
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.scaleBarOptions.fontColor;
      this.ctx.moveTo(bottomRightOrigin.x, bottomRightOrigin.y - scaleBarHeight);
      this.ctx.lineTo(bottomRightOrigin.x, bottomRightOrigin.y);
      this.ctx.lineTo(bottomRightOrigin.x - scaleBarWidthPx, bottomRightOrigin.y);
      this.ctx.lineTo(bottomRightOrigin.x - scaleBarWidthPx, bottomRightOrigin.y - scaleBarHeight);
      this.ctx.stroke();
    };

    const textPaddingPx = new Vector2(6, 4);
    const renderScaleBarText = (bottomRightOrigin: Vector2): void => {
      const textOriginPx = new Vector2(bottomRightOrigin.x - textPaddingPx.x, bottomRightOrigin.y - textPaddingPx.y);

      configureCanvasText(this.ctx, this.scaleBarOptions, "right", "bottom");
      renderCanvasText(this.ctx, textOriginPx.x, textOriginPx.y, textContent);
    };

    return {
      sizePx: new Vector2(scaleBarWidthPx, this.scaleBarOptions.fontSizePx + textPaddingPx.y * 2),
      render: (bottomRightOrigin = new Vector2(0, 0)) => {
        // Nudge by 0.5 pixels so scale bar can render sharply at 1px wide
        const scaleBarOrigin = bottomRightOrigin.clone().round().add(new Vector2(0.5, 0.5));
        renderScaleBar(scaleBarOrigin);
        renderScaleBarText(bottomRightOrigin);
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
   *  - `render`: a callback that renders the scale bar to the canvas. Note that the origin is
   *   the bottom right corner of the timestamp.
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
    const render = (bottomRightOrigin: Vector2): void => {
      const timestampOriginPx = bottomRightOrigin.clone().sub(timestampPaddingPx);
      configureCanvasText(this.ctx, this.timestampOptions, "right", "bottom");
      renderCanvasText(this.ctx, timestampOriginPx.x, timestampOriginPx.y, timestampFormatted);
    };

    return {
      sizePx: new Vector2(
        CanvasWithOverlay.getTextDimensions(this.ctx, timestampFormatted, this.timestampOptions).x,
        this.timestampOptions.fontSizePx
      ).add(timestampPaddingPx.clone().multiplyScalar(2)),
      render,
    };
  }

  /**
   * Draws the inset box's background, intended to be layered under the timestamp, scalebar, and other elements.
   * @param ctx Canvas context to render to.
   * @param size Size of the inset, in pixels.
   * @param options Configuration for the inset.
   */
  private renderInsetBoxBackground(origin: Vector2, size: Vector2, options: InsetBoxOptions): void {
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

  private getInsetBoxRenderer(): RenderInfo {
    // Get dimensions + render methods for the elements, but don't render yet so we can draw the background
    // behind them.
    const { sizePx: scaleBarDimensions, render: renderScaleBar } = this.getScaleBarRenderer();
    const { sizePx: timestampDimensions, render: renderTimestamp } = this.getTimestampRenderer();

    // If both elements are invisible, don't render the background.
    if (scaleBarDimensions.equals(new Vector2(0, 0)) && timestampDimensions.equals(new Vector2(0, 0))) {
      return EMPTY_RENDER_INFO;
    }

    // Get dimensions of the inset box to be rendered behind the elements
    const contentSize = new Vector2(
      Math.max(scaleBarDimensions.x, timestampDimensions.x),
      scaleBarDimensions.y + timestampDimensions.y
    );
    const boxSize = contentSize.clone().add(this.insetBoxOptions.paddingPx.clone().multiplyScalar(2.0));

    return {
      sizePx: boxSize,
      render: (origin: Vector2) => {
        // Origin is top left corner of the box.
        this.renderInsetBoxBackground(origin, boxSize, this.insetBoxOptions);

        // Get lower right corner for the scale bar
        const scaleBarOrigin = origin.clone().add(boxSize).sub(this.insetBoxOptions.paddingPx);
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

  private getCategoricalKeyRenderer(options: LegendOptions): RenderInfo {
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
    const maxColumnHeight = Math.min(featureData.categories.length, MAX_CATEGORIES_PER_COLUMN) * categoryHeightPx;
    const heightPx = featureLabelHeightPx + maxColumnHeight;

    return {
      sizePx: new Vector2(maxWidthPx, heightPx),
      render: (origin: Vector2) => {
        // Render feature label
        const featureLabelFontStyle: FontStyleOptions = { ...options };
        configureCanvasText(this.ctx, featureLabelFontStyle, "left", "top");
        renderCanvasText(this.ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
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

          let maxCategoryWidth = Number.NEGATIVE_INFINITY;
          for (
            let categoryIndex = colIndex * MAX_CATEGORIES_PER_COLUMN;
            categoryIndex < Math.min((colIndex + 1) * MAX_CATEGORIES_PER_COLUMN, categories.length);
            categoryIndex++
          ) {
            const category = categories[categoryIndex];
            currCategoryOrigin.round();

            // Color label
            const color = new Color(this.categoricalPalette.colorStops[categoryIndex]);
            this.ctx.fillStyle = color.getStyle();
            this.ctx.beginPath();
            this.ctx.roundRect(
              currCategoryOrigin.x,
              currCategoryOrigin.y,
              Math.round(options.labelFontSizePx),
              Math.round(options.labelFontSizePx),
              2
            );
            this.ctx.closePath();
            this.ctx.fill();

            // Category label
            configureCanvasText(this.ctx, options, "left", "top");
            const maxTextWidth = categoryWidth - options.labelFontSizePx - options.categoryLabelGapPx;
            const textX = currCategoryOrigin.x + options.labelFontSizePx + options.categoryLabelGapPx;
            const textY = currCategoryOrigin.y - 1; // Fudge slightly to align with color label
            const textSize = renderCanvasText(this.ctx, textX, textY, category, {
              maxWidth: maxTextWidth,
            });
            maxCategoryWidth = Math.max(
              maxCategoryWidth,
              options.labelFontSizePx + options.categoryLabelGapPx + textSize.x
            );
            currCategoryOrigin.y += categoryHeight;
          }

          colOrigin.x += maxCategoryWidth + options.categoryColGapPx;
        }
      },
    };
  }

  private getNumericKeyRenderer(options: LegendOptions): RenderInfo {
    const featureName = this.getSelectedFeatureName();
    if (!featureName) {
      return EMPTY_RENDER_INFO;
    }
    const maxWidthPx = options.maxColorRampWidthPx;
    const featureLabelFontStyle: FontStyleOptions = { ...options };

    const height = options.fontSizePx + options.rampPaddingPx * 2 + options.rampHeightPx + options.labelFontSizePx;

    return {
      sizePx: new Vector2(maxWidthPx, height),
      render: (origin: Vector2) => {
        configureCanvasText(this.ctx, featureLabelFontStyle, "left", "top");
        renderCanvasText(this.ctx, origin.x, origin.y, featureName, { maxWidth: maxWidthPx });
        origin.y += featureLabelFontStyle.fontSizePx + options.rampPaddingPx;

        // Render color ramp gradient
        const colorStops = this.colorRamp.colorStops.map((c) => new Color(c));
        const gradient = ColorRamp.linearGradientFromColors(this.ctx, colorStops, maxWidthPx, 0, origin.x, origin.y);
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = options.stroke;
        this.ctx.beginPath();
        this.ctx.roundRect(origin.x + 0.5, origin.y + 0.5, maxWidthPx - 2, options.rampHeightPx, options.rampRadiusPx);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        origin.y += options.rampHeightPx + options.rampPaddingPx;

        // Render min/max labels under color ramp
        const rangeLabelFontStyle: FontStyleOptions = { ...options, fontSizePx: options.labelFontSizePx };
        const minLabel = numberToStringDecimal(this.colorMapRangeMin, 3, true);
        const maxLabel = numberToStringDecimal(this.colorMapRangeMax, 3, true);
        configureCanvasText(this.ctx, rangeLabelFontStyle, "left", "top");
        renderCanvasText(this.ctx, origin.x, origin.y, minLabel, { maxWidth: maxWidthPx / 2 });
        configureCanvasText(this.ctx, rangeLabelFontStyle, "right", "top");
        renderCanvasText(this.ctx, origin.x + maxWidthPx, origin.y, maxLabel, { maxWidth: maxWidthPx / 2 });
      },
    };
  }

  /**
   * Returns a RenderInfo object that renders the footer. Origin should be set from the top left corner
   * of the footer area.
   */
  private getFooterRenderer(): RenderInfo {
    const options = this.footerOptions;

    const { sizePx: insetSize, render: renderInset } = this.getInsetBoxRenderer();

    if (!options.visibleOnExport || !this.isExporting) {
      // If the footer is hidden, the inset box floats in the bottom right corner of the viewport.
      return {
        sizePx: new Vector2(0, 0),
        render: (origin = new Vector2(0, 0)) => {
          // Offset vertically by height + default margins
          origin.y -= insetSize.y + this.insetBoxOptions.marginPx.y;
          origin.x = this.canvasWidth - insetSize.x - this.insetBoxOptions.marginPx.x;
          renderInset(origin);
        },
      };
    }

    // Determine size of the footer based on the max height of the legend
    // and the inset box.
    let maxHeight = insetSize.y;
    let legendRenderer: RenderCallback = () => {};
    const insetMargin = insetSize.x > 0 ? this.insetBoxOptions.marginPx.x : 0;
    const availableContentWidth = this.canvasWidth - options.paddingPx.x * 2 - insetSize.x - insetMargin;

    if (this.dataset && this.featureKey) {
      // Update the max width
      let result: RenderInfo;
      if (this.dataset.isFeatureCategorical(this.featureKey)) {
        const legendOptions = {
          ...this.legendOptions,
          maxCategoricalWidthPx: Math.min(availableContentWidth, this.legendOptions.maxCategoricalWidthPx),
        };
        result = this.getCategoricalKeyRenderer(legendOptions);
      } else {
        const legendOptions = {
          ...this.legendOptions,
          maxColorRampWidthPx: Math.min(availableContentWidth, this.legendOptions.maxColorRampWidthPx),
        };
        result = this.getNumericKeyRenderer(legendOptions);
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
        this.ctx.fillStyle = options.fill;
        this.ctx.strokeStyle = options.stroke;
        this.ctx.fillRect(origin.x - 0.5, origin.y - 0.5, width, height);
        this.ctx.strokeRect(origin.x - 0.5, origin.y - 0.5, width, height);

        // Render the inset box, centering it vertically
        const insetOrigin = new Vector2(
          this.canvasWidth - insetSize.x - options.paddingPx.x,
          origin.y + (height - insetSize.y) / 2
        );
        renderInset(insetOrigin);

        // Render the legend
        const legendOrigin = new Vector2(origin.x + options.paddingPx.x, origin.y + options.paddingPx.y);
        legendRenderer(legendOrigin);
      },
    };
  }

  private getHeaderRenderer(): RenderInfo {
    const params = {
      canvasWidth: this.canvasWidth,
      isExporting: this.isExporting,
      dataset: this.dataset,
      collection: this.collection,
      datasetKey: this.datasetKey,
    };
    return getHeaderRenderer(this.ctx, params, this.headerOptions);
  }

  /**
   * Render the viewport canvas with overlay elements composited on top of it.
   */
  render(): void {
    // Expand size by header + footer, if rendering:
    const headerRenderer = this.getHeaderRenderer();
    const footerRenderer = this.getFooterRenderer();
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = this.getPixelRatio();
    this.canvas.width = Math.round(this.canvasWidth * devicePixelRatio);
    this.canvas.height = Math.round((this.canvasHeight + this.headerSize.y + this.footerSize.y) * devicePixelRatio);

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Because CanvasWithOverlay is a child of ColorizeCanvas, this renders the base
    // colorized viewport image. It is then composited into the CanvasWithOverlay's canvas.
    super.render();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(super.domElement, 0, Math.round(this.headerSize.y * devicePixelRatio));

    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    headerRenderer.render(new Vector2(0, 0));
    footerRenderer.render(new Vector2(0, this.canvasHeight + this.headerSize.y));
  }

  /**
   * Gets the screen-space pixel dimensions of the canvas (including the header and footer) when the
   * canvas is being exported.
   */
  getExportDimensions(): [number, number] {
    // Temporarily set is exporting to true and measure the dimensions of the header and footer.
    const originalIsExportingFlag = this.isExporting;

    this.isExporting = true;

    const headerRenderer = this.getHeaderRenderer();
    const footerRenderer = this.getFooterRenderer();
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = this.getPixelRatio();
    const canvasWidth = Math.round(this.canvasWidth * devicePixelRatio);
    const canvasHeight = Math.round((this.canvasHeight + this.headerSize.y + this.footerSize.y) * devicePixelRatio);

    this.isExporting = originalIsExportingFlag;
    return [canvasWidth, canvasHeight];
  }
}
