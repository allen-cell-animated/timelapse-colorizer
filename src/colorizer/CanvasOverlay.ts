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
import {
  AnnotationParams,
  AnnotationStyle,
  defaultAnnotationStyle,
  getAnnotationRenderer,
} from "./canvas/elements/annotations";
import { BaseRenderParams, RenderInfo } from "./canvas/types";
import { getPixelRatio } from "./canvas/utils";
import { CanvasScaleInfo, CanvasType, FrameLoadResult } from "./types";

import { LabelData } from "./AnnotationData";
import ColorizeCanvas2D from "./ColorizeCanvas2D";
import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";

/**
 * Wraps an IRenderCanvas class by overlaying and compositing additional
 * dynamic elements (like a scale bar, timestamp, etc.) on top of a
 * base colorized image.
 */
export default class CanvasOverlay implements IRenderCanvas {
  private canvasElement: HTMLCanvasElement;
  private innerCanvas: IRenderCanvas;
  private ctx: CanvasRenderingContext2D;

  private currentFrame: number;
  private params: RenderCanvasStateParams;
  private onFrameLoadCallback: (result: FrameLoadResult) => void;

  private zoomMultiplier: number;
  private panOffset: Vector2;

  private labelData: LabelData[];
  private timeToLabelIds: Map<number, Record<number, number[]>>;
  private selectedLabelIdx: number | null;
  private lastClickedId: number | null;

  private scaleBarStyle: ScaleBarStyle;
  private timestampStyle: TimestampStyle;
  private insetBoxStyle: InsetBoxStyle;
  private legendStyle: LegendStyle;
  private headerStyle: HeaderStyle;
  private footerStyle: FooterStyle;
  private annotationStyle: AnnotationStyle;

  /** Size of the inner colorized canvas, in pixels. */
  private innerCanvasSize: Vector2;
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
  public isAnnotationVisible: boolean;

  constructor(
    canvas: IRenderCanvas,
    params: RenderCanvasStateParams,
    styles?: {
      scaleBar?: ScaleBarStyle;
      timestamp?: TimestampStyle;
      insetBox?: InsetBoxStyle;
      legend?: LegendStyle;
      header?: HeaderStyle;
      footer?: FooterStyle;
    }
  ) {
    this.innerCanvas = canvas;
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.style.display = "block";
    this.onFrameLoadCallback = () => {};

    this.params = params;
    this.currentFrame = -1;
    this.zoomMultiplier = 1;
    this.panOffset = new Vector2();

    this.labelData = [];
    this.timeToLabelIds = new Map();
    this.selectedLabelIdx = null;
    this.lastClickedId = null;

    this.scaleBarStyle = styles?.scaleBar || defaultScaleBarStyle;
    this.timestampStyle = styles?.timestamp || defaultTimestampStyle;
    this.insetBoxStyle = styles?.insetBox || defaultInsetBoxStyle;
    this.legendStyle = styles?.legend || defaultLegendStyle;
    this.headerStyle = styles?.header || defaultHeaderStyle;
    this.footerStyle = styles?.footer || defaultFooterStyle;
    this.annotationStyle = defaultAnnotationStyle;
    this.innerCanvasSize = new Vector2(1, 1);
    this.headerSize = new Vector2(0, 0);
    this.footerSize = new Vector2(0, 0);

    this.isExporting = false;
    this.isHeaderVisibleOnExport = true;
    this.isFooterVisibleOnExport = true;
    this.isScaleBarVisible = true;
    this.isTimestampVisible = true;
    this.isAnnotationVisible = true;

    const canvasContext = this.canvasElement.getContext("2d") as CanvasRenderingContext2D;
    if (canvasContext === null) {
      throw new Error("CanvasWithOverlay: Could not get canvas context; canvas.getContext('2d') returned null.");
    }
    this.ctx = canvasContext;

    this.getExportDimensions = this.getExportDimensions.bind(this);
  }

  // Wrapped ColorizeCanvas functions ///////

  public get resolution(): Vector2 {
    return this.innerCanvasSize.clone();
  }

  public get scaleInfo(): CanvasScaleInfo {
    return this.innerCanvas.scaleInfo;
  }

  get domElement(): HTMLCanvasElement {
    // Override base ColorizeCanvas getter with the composited canvas.
    return this.canvasElement;
  }

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onFrameLoadCallback = callback;
    this.innerCanvas.setOnFrameLoadCallback(callback);
  }

  dispose(): void {
    this.innerCanvas.dispose();
  }

  public setResolution(width: number, height: number): void {
    this.innerCanvasSize.x = width;
    this.innerCanvasSize.y = height;
    this.innerCanvas.setResolution(width, height);
    this.render();
  }

  public getIdAtPixel(x: number, y: number): number {
    const headerHeight = this.headerSize.y;
    return this.innerCanvas.getIdAtPixel(x, y - headerHeight);
  }

  // Getters/Setters ////////////////////////////////

  public updateScaleBarStyle(style: Partial<ScaleBarStyle>): void {
    this.scaleBarStyle = { ...this.scaleBarStyle, ...style };
  }

  public updateTimestampStyle(style: Partial<TimestampStyle>): void {
    this.timestampStyle = { ...this.timestampStyle, ...style };
  }

  public updateInsetBoxStyle(style: Partial<InsetBoxStyle>): void {
    this.insetBoxStyle = { ...this.insetBoxStyle, ...style };
  }

  public updateLegendStyle(style: Partial<LegendStyle>): void {
    this.legendStyle = { ...this.legendStyle, ...style };
  }

  public updateHeaderStyle(style: Partial<HeaderStyle>): void {
    this.headerStyle = { ...this.headerStyle, ...style };
  }

  public updateFooterStyle(style: Partial<FooterStyle>): void {
    this.footerStyle = { ...this.footerStyle, ...style };
  }

  // TODO: Move `isExporting` flag into state
  public setIsExporting(isExporting: boolean): void {
    this.isExporting = isExporting;
  }

  public setZoom(zoom: number): void {
    this.zoomMultiplier = zoom;
    if (this.innerCanvas instanceof ColorizeCanvas2D) {
      this.innerCanvas.setZoom(zoom);
    }
    this.render();
  }

  public setPan(x: number, y: number): void {
    this.panOffset.set(x, y);
    if (this.innerCanvas instanceof ColorizeCanvas2D) {
      this.innerCanvas.setPan(x, y);
    }
    this.render();
  }

  public async setParams(params: RenderCanvasStateParams): Promise<void> {
    this.params = params;
    await this.innerCanvas.setParams(params);
    this.render(false);
  }

  public async setCanvas(canvas: IRenderCanvas): Promise<void> {
    this.innerCanvas = canvas;
    this.innerCanvas.setResolution(this.innerCanvasSize.x, this.innerCanvasSize.y);
    this.innerCanvas.setOnFrameLoadCallback(this.onFrameLoadCallback);
    await this.innerCanvas.setParams(this.params);
    await this.innerCanvas.setFrame(this.currentFrame);
    if (this.innerCanvas instanceof ColorizeCanvas2D) {
      this.innerCanvas.setZoom(this.zoomMultiplier);
      this.innerCanvas.setPan(this.panOffset.x, this.panOffset.y);
    }
    this.render(false);
  }

  public setAnnotationData(
    labelData: LabelData[],
    timeToLabelIds: Map<number, Record<number, number[]>>,
    selectedLabelIdx: number | null,
    lastClickedId: number | null
  ): void {
    this.labelData = labelData;
    this.timeToLabelIds = timeToLabelIds;
    this.selectedLabelIdx = selectedLabelIdx;
    this.lastClickedId = lastClickedId;
  }

  // Rendering functions ////////////////////////////

  private getBaseRendererParams(): BaseRenderParams {
    return {
      canvasSize: this.innerCanvasSize,
      collection: this.params.collection,
      dataset: this.params.dataset,
      datasetKey: this.params.datasetKey,
      featureKey: this.params.featureKey,
    };
  }

  private getAnnotationRenderer(): RenderInfo {
    const scaleInfo = this.innerCanvas.scaleInfo;
    const params: AnnotationParams = {
      ...this.getBaseRendererParams(),
      visible: this.isAnnotationVisible,
      labelData: this.labelData,
      timeToLabelIds: this.timeToLabelIds,
      selectedLabelIdx: this.selectedLabelIdx,
      lastSelectedId: this.lastClickedId,
      // TODO: Make this into a matrix transformation from 3D centroid to 2D
      // onscreen position.
      frameToCanvasCoordinates:
        scaleInfo.type === CanvasType.CANVAS_2D ? scaleInfo.frameToCanvasCoordinates : new Vector2(1, 1),
      frame: this.currentFrame,
      panOffset: this.panOffset,
    };
    return getAnnotationRenderer(this.ctx, params, this.annotationStyle);
  }

  private getHeaderRenderer(visible: boolean): RenderInfo {
    const params = {
      ...this.getBaseRendererParams(),
      visible,
    };
    return getHeaderRenderer(this.ctx, params, this.headerStyle);
  }

  private getFooterRenderer(visible: boolean): RenderInfo {
    const scaleInfo = this.innerCanvas.scaleInfo;
    const baseParams = this.getBaseRendererParams();
    const params: FooterParams = {
      ...baseParams,
      visible,
      timestamp: { ...baseParams, currentFrame: this.currentFrame, visible: this.isTimestampVisible },
      timestampStyle: this.timestampStyle,
      scaleBar: {
        ...baseParams,
        frameSizeInCanvasCoordinates:
          scaleInfo.type === CanvasType.CANVAS_2D ? scaleInfo.frameSizeInCanvasCoordinates : new Vector2(),
        // Hide scalebar for 3D canvas
        visible: this.isScaleBarVisible && scaleInfo.type === CanvasType.CANVAS_2D,
      },
      scaleBarStyle: this.scaleBarStyle,
      insetBoxStyle: this.insetBoxStyle,
      legend: {
        ...baseParams,
        colorRamp: this.params.colorRamp,
        categoricalPalette: this.params.categoricalPaletteRamp,
        colorMapRangeMin: this.params.colorRampRange[0] || 0,
        colorMapRangeMax: this.params.colorRampRange[1] || 1,
      },
      legendStyle: this.legendStyle,
    };
    return getFooterRenderer(this.ctx, params, this.footerStyle);
  }

  public async setFrame(requestedFrame: number): Promise<FrameLoadResult | null> {
    const result = await this.innerCanvas.setFrame(requestedFrame);
    if (result !== null) {
      this.currentFrame = result.frame;
      // setFrame already re-renders the inner canvas.
      this.render(false);
    }
    return result;
  }

  /**
   * Render the viewport canvas with overlay elements composited on top of it.
   * @param doesInnerCanvasNeedRender Whether the inner canvas needs to be
   * re-rendered. True by default.
   */
  render(doesInnerCanvasNeedRender: boolean = true): void {
    // Expand size by header + footer, if rendering:
    const headerRenderer = this.getHeaderRenderer(this.isHeaderVisibleOnExport && this.isExporting);
    const footerRenderer = this.getFooterRenderer(this.isFooterVisibleOnExport && this.isExporting);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = getPixelRatio();
    this.canvasElement.width = Math.round(this.innerCanvasSize.x * devicePixelRatio);
    this.canvasElement.height = Math.round(
      (this.innerCanvasSize.y + this.headerSize.y + this.footerSize.y) * devicePixelRatio
    );

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Because CanvasWithOverlay is a child of ColorizeCanvas, this renders the base
    // colorized viewport image. It is then composited into the CanvasWithOverlay's canvas.
    if (doesInnerCanvasNeedRender) {
      this.innerCanvas.render();
    }
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.innerCanvas.domElement, 0, Math.round(this.headerSize.y * devicePixelRatio));

    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    headerRenderer.render(new Vector2(0, 0));
    this.getAnnotationRenderer().render(new Vector2(0, this.headerSize.y));
    footerRenderer.render(new Vector2(0, this.innerCanvasSize.y + this.headerSize.y));
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
    const canvasWidth = Math.round(this.innerCanvasSize.x * devicePixelRatio);
    const canvasHeight = Math.round(
      (this.innerCanvasSize.y + this.headerSize.y + this.footerSize.y) * devicePixelRatio
    );
    return [canvasWidth, canvasHeight];
  }
}
