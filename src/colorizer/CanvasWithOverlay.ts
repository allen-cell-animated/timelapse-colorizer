import { Vector2 } from "three";

import {
  defaultFooterStyle,
  defaultHeaderStyle,
  defaultInsetBoxStyle,
  defaultLegendStyle,
  defaultScaleBarStyle,
  defaultTimestampStyle,
  FooterParams,
  FooterStyle,
  getFooterRenderer,
  getHeaderRenderer,
  HeaderStyle,
  InsetBoxStyle,
  LegendStyle,
  ScaleBarStyle,
  TimestampStyle,
} from "./canvas/elements";
import { getVectorFieldRenderer, VectorFieldParams } from "./canvas/elements/vectorField";
import { BaseRenderParams, RenderInfo } from "./canvas/types";
import { getPixelRatio } from "./canvas/utils";
import { getDefaultVectorConfig, VectorConfig, VectorViewMode } from "./types";

import Collection from "./Collection";
import ColorizeCanvas from "./ColorizeCanvas";

/**
 * Extends the ColorizeCanvas class by overlaying and compositing additional
 * dynamic elements (like a scale bar, timestamp, etc.) on top of the
 * base colorized image.
 */
export default class CanvasWithOverlay extends ColorizeCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private collection: Collection | null;
  private datasetKey: string | null;

  private motionVectors: Float32Array | null;

  private scaleBarStyle: ScaleBarStyle;
  private timestampStyle: TimestampStyle;
  private insetBoxStyle: InsetBoxStyle;
  private legendStyle: LegendStyle;
  private headerStyle: HeaderStyle;
  private footerStyle: FooterStyle;

  private vectorFieldConfig: VectorConfig;

  /** Size of the inner colorized canvas, in pixels. */
  private canvasSize: Vector2;
  // Size of the header and footer as of the current render.
  private headerSize: Vector2;
  private footerSize: Vector2;

  /**
   * Flags whether the canvas is in export mode and we should render with
   * additional optional elements like the header and footer.
   */
  private isExporting: boolean;
  public isHeaderVisibleOnExport: boolean;
  public isFooterVisibleOnExport: boolean;
  public isScaleBarVisible: boolean;
  public isTimestampVisible: boolean;

  constructor(styles?: {
    scaleBar?: ScaleBarStyle;
    timestamp?: TimestampStyle;
    insetBox?: InsetBoxStyle;
    legend?: LegendStyle;
    header?: HeaderStyle;
    footer?: FooterStyle;
  }) {
    super();

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";

    this.collection = null;
    this.datasetKey = null;

    this.scaleBarStyle = styles?.scaleBar || defaultScaleBarStyle;
    this.timestampStyle = styles?.timestamp || defaultTimestampStyle;
    this.insetBoxStyle = styles?.insetBox || defaultInsetBoxStyle;
    this.legendStyle = styles?.legend || defaultLegendStyle;
    this.headerStyle = styles?.header || defaultHeaderStyle;
    this.footerStyle = styles?.footer || defaultFooterStyle;
    this.canvasSize = new Vector2(1, 1);
    this.headerSize = new Vector2(0, 0);
    this.footerSize = new Vector2(0, 0);
    this.motionVectors = null;
    this.vectorFieldConfig = getDefaultVectorConfig();

    this.isExporting = false;
    this.isHeaderVisibleOnExport = true;
    this.isFooterVisibleOnExport = true;
    this.isScaleBarVisible = true;
    this.isTimestampVisible = true;

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
    this.canvasSize.x = width;
    this.canvasSize.y = height;
    super.setSize(width, height);
  }

  public getIdAtPixel(x: number, y: number): number {
    const headerHeight = this.headerSize.y;
    return super.getIdAtPixel(x, y - headerHeight);
  }

  // Getters/Setters ////////////////////////////////

  updateScaleBarStyle(style: Partial<ScaleBarStyle>): void {
    this.scaleBarStyle = { ...this.scaleBarStyle, ...style };
  }

  updateTimestampStyle(style: Partial<TimestampStyle>): void {
    this.timestampStyle = { ...this.timestampStyle, ...style };
  }

  updateInsetBoxStyle(style: Partial<InsetBoxStyle>): void {
    this.insetBoxStyle = { ...this.insetBoxStyle, ...style };
  }

  updateLegendStyle(style: Partial<LegendStyle>): void {
    this.legendStyle = { ...this.legendStyle, ...style };
  }

  updateHeaderStyle(style: Partial<HeaderStyle>): void {
    this.headerStyle = { ...this.headerStyle, ...style };
  }

  updateFooterStyle(style: Partial<FooterStyle>): void {
    this.footerStyle = { ...this.footerStyle, ...style };
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

  setVectorFieldConfig(config: VectorConfig): void {
    this.vectorFieldConfig = config;
  }

  setMotionVectors(vectors: Float32Array | null): void {
    this.motionVectors = vectors;
  }

  // Rendering functions ////////////////////////////

  private getBaseRendererParams(): BaseRenderParams {
    return {
      canvasSize: this.canvasSize,
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
    return getHeaderRenderer(this.ctx, params, this.headerStyle);
  }

  private getFooterRenderer(visible: boolean): RenderInfo {
    const baseParams = this.getBaseRendererParams();
    const params: FooterParams = {
      ...baseParams,
      visible,
      timestamp: { ...baseParams, currentFrame: this.getCurrentFrame(), visible: this.isTimestampVisible },
      timestampStyle: this.timestampStyle,
      scaleBar: {
        ...baseParams,
        frameSizeInCanvasCoordinates: this.frameSizeInCanvasCoordinates,
        visible: this.isScaleBarVisible,
      },
      scaleBarStyle: this.scaleBarStyle,
      insetBoxStyle: this.insetBoxStyle,
      legend: {
        ...baseParams,
        colorRamp: this.colorRamp,
        categoricalPalette: this.categoricalPalette,
        colorMapRangeMin: this.colorMapRangeMin,
        colorMapRangeMax: this.colorMapRangeMax,
      },
      legendStyle: this.legendStyle,
    };
    return getFooterRenderer(this.ctx, params, this.footerStyle);
  }

  private getVectorFieldRenderer(): RenderInfo {
    const params: VectorFieldParams = {
      ...this.getBaseRendererParams(),
      config: this.vectorFieldConfig,
      vectors: this.motionVectors, // TODO:
      viewportSizePx: this.canvasSize,
      currentFrame: this.getCurrentFrame(),
      zoomMultiplier: this.zoomMultiplier,
      panOffset: this.panOffset,
      frameToCanvasCoordinates: this.frameToCanvasCoordinates,
      visible: this.vectorFieldConfig.mode !== VectorViewMode.HIDE,
    };
    return getVectorFieldRenderer(this.ctx, params);
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
    this.canvas.width = Math.round(this.canvasSize.x * devicePixelRatio);
    this.canvas.height = Math.round((this.canvasSize.y + this.headerSize.y + this.footerSize.y) * devicePixelRatio);

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Because CanvasWithOverlay is a child of ColorizeCanvas, this renders the base
    // colorized viewport image. It is then composited into the CanvasWithOverlay's canvas.
    super.render();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(super.domElement, 0, Math.round(this.headerSize.y * devicePixelRatio));

    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    // Draw the vector field
    this.getVectorFieldRenderer().render(new Vector2(0, this.headerSize.y));

    headerRenderer.render(new Vector2(0, 0));
    footerRenderer.render(new Vector2(0, this.canvasSize.y + this.headerSize.y));
  }

  /**
   * Gets the screen-space pixel dimensions of the canvas (including the header and footer) when the
   * canvas is being exported.
   */
  getExportDimensions(): [number, number] {
    const headerRenderer = this.getHeaderRenderer(this.isHeaderVisibleOnExport);
    const footerRenderer = this.getFooterRenderer(this.isFooterVisibleOnExport);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = getPixelRatio();
    const canvasWidth = Math.round(this.canvasSize.x * devicePixelRatio);
    const canvasHeight = Math.round((this.canvasSize.y + this.headerSize.y + this.footerSize.y) * devicePixelRatio);
    return [canvasWidth, canvasHeight];
  }
}
