import { Vector2 } from "three";

import { defaultFooterOptions, FooterOptions, FooterParams, getFooterRenderer } from "./canvas/footer";
import { defaultHeaderOptions, getHeaderRenderer, HeaderOptions } from "./canvas/header";
import { defaultInsetBoxOptions, InsetBoxOptions } from "./canvas/insetBox";
import { defaultLegendOptions, LegendOptions } from "./canvas/legend";
import { defaultScaleBarOptions, ScaleBarOptions } from "./canvas/scalebar";
import { defaultTimestampOptions, TimestampOptions } from "./canvas/timestamp";
import { BaseRenderParams, RenderInfo } from "./canvas/types";
import { getPixelRatio } from "./canvas/utils";

import Collection from "./Collection";
import ColorizeCanvas from "./ColorizeCanvas";

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
  private isHeaderVisibleOnExport: boolean;
  private isFooterVisibleOnExport: boolean;

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
    this.isHeaderVisibleOnExport = true;
    this.isFooterVisibleOnExport = true;

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

  setIsHeaderVisibleOnExport(isVisible: boolean): void {
    this.isHeaderVisibleOnExport = isVisible;
  }

  setIsFooterVisibleOnExport(isVisible: boolean): void {
    this.isFooterVisibleOnExport = isVisible;
  }

  setCollection(collection: Collection | null): void {
    this.collection = collection;
  }

  setDatasetKey(datasetKey: string | null): void {
    this.datasetKey = datasetKey;
  }

  // Rendering functions ////////////////////////////

  private getBaseRendererParams(): BaseRenderParams {
    return {
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      collection: this.collection,
      dataset: this.dataset,
      datasetKey: this.datasetKey,
      featureKey: this.featureKey,
    };
  }

  private getHeaderRenderer(visible: boolean): RenderInfo {
    const params = {
      ...this.getBaseRendererParams(),
      visible,
    };
    return getHeaderRenderer(this.ctx, params, this.headerOptions);
  }

  private getFooterRenderer(visible: boolean): RenderInfo {
    const baseParams = this.getBaseRendererParams();
    const params: FooterParams = {
      ...this.getBaseRendererParams(),
      visible,
      timestamp: { ...baseParams, currentFrame: this.getCurrentFrame() },
      timestampOptions: this.timestampOptions,
      scalebar: { ...baseParams, frameSizeInCanvasCoordinates: this.frameSizeInCanvasCoordinates },
      scalebarOptions: this.scaleBarOptions,
      insetBoxOptions: this.insetBoxOptions,
      legend: {
        ...baseParams,
        colorRamp: this.colorRamp,
        categoricalPalette: this.categoricalPalette,
        colorMapRangeMin: this.colorMapRangeMin,
        colorMapRangeMax: this.colorMapRangeMax,
      },
      legendOptions: this.legendOptions,
    };
    return getFooterRenderer(this.ctx, params, this.footerOptions);
  }

  /**
   * Render the viewport canvas with overlay elements composited on top of it.
   */
  render(): void {
    // Expand size by header + footer, if rendering:
    const headerRenderer = this.getHeaderRenderer(this.isHeaderVisibleOnExport && this.isExporting);
    const footerRenderer = this.getFooterRenderer(this.isFooterVisibleOnExport && this.isExporting);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = getPixelRatio();
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

    const headerRenderer = this.getHeaderRenderer(this.isHeaderVisibleOnExport);
    const footerRenderer = this.getFooterRenderer(this.isFooterVisibleOnExport);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = getPixelRatio();
    const canvasWidth = Math.round(this.canvasWidth * devicePixelRatio);
    const canvasHeight = Math.round((this.canvasHeight + this.headerSize.y + this.footerSize.y) * devicePixelRatio);

    this.isExporting = originalIsExportingFlag;
    return [canvasWidth, canvasHeight];
  }
}
