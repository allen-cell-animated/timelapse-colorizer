import { Vector2 } from "three";

import type { LabelData } from "src/colorizer/AnnotationData";
import type { ChannelRangePreset, FrameLoadResult, PixelIdInfo } from "src/colorizer/types";
import { hasPropertyChanged } from "src/colorizer/utils/data_utils";
import { ViewMode } from "src/state/slices";

import ColorizeCanvas2D from "./ColorizeCanvas2D";
import { ColorizeCanvas3D } from "./ColorizeCanvas3D";
import type { IInnerRenderCanvas } from "./IInnerRenderCanvas";
import type { IRenderCanvas } from "./IRenderCanvas";
import {
  defaultFooterStyle,
  defaultHeaderStyle,
  defaultInsetBoxStyle,
  defaultLegendStyle,
  defaultScaleBarStyle,
  defaultTimestampStyle,
  type FooterParams,
  type FooterStyle,
  getFooterRenderer,
  getHeaderRenderer,
  type HeaderStyle,
  type InsetBoxStyle,
  type LegendStyle,
  type ScaleBarStyle,
  type TimestampStyle,
} from "./overlays/elements";
import {
  type AnnotationParams,
  type AnnotationStyle,
  defaultAnnotationStyle,
  getAnnotationRenderer,
} from "./overlays/elements/annotations";
import type { BaseRenderParams, RenderInfo } from "./overlays/types";
import { getPixelRatio, toEven } from "./overlays/utils";
import { type CanvasScaleInfo, CanvasType, type RenderCanvasStateParams, type RenderOptions } from "./types";

type OverlayRenderOptions = RenderOptions & {
  renderInnerCanvas?: boolean;
};

export type ExportOptions = {
  /** If true, enforces even pixel dimensions for the exported canvas. */
  enforceEven: boolean;
  /** If true, shows the dataset name as a header in the exported canvas. */
  showHeader: boolean;
  /**
   * If true, shows the legend in the footer (and the scale bar and timestamp
   * if enabled) in the exported canvas.
   */
  showFooter: boolean;
};

/**
 * Wraps an IInnerRenderCanvas class, overlaying and compositing additional dynamic
 * elements (like a scale bar, timestamp, etc.) on top of the base canvas.
 *
 * During export mode, the overlay canvas will render the inner canvas directly
 * into itself, so that the exported image contains both the inner canvas and
 * the overlay elements.
 */
export default class CanvasOverlay implements IRenderCanvas {
  private canvasContainerDiv: HTMLDivElement;
  private innerCanvasContainerDiv: HTMLDivElement;

  private canvasElement: HTMLCanvasElement;

  private innerCanvas2d: ColorizeCanvas2D;
  // Initialization of inner 3D canvas is deferred until needed.
  private innerCanvas3d: ColorizeCanvas3D | null;

  private innerCanvas: IInnerRenderCanvas;
  private innerCanvasType: CanvasType;
  private ctx: CanvasRenderingContext2D;

  private currentFrame: number;
  private params: RenderCanvasStateParams;
  private onFrameLoadCallback: (result: FrameLoadResult) => void;

  private labelData: LabelData[];
  private timeToLabelIds: Map<number, Record<number, number[]>>;
  private selectedLabelIdx: number | null;
  private rangeStartId: number | null;

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
  private exportOptions: ExportOptions;
  public isScaleBarVisible: boolean;
  public isTimestampVisible: boolean;
  public isAnnotationVisible: boolean;

  constructor(
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
    this.innerCanvas2d = new ColorizeCanvas2D();
    this.innerCanvas3d = null;

    this.innerCanvas = this.innerCanvas2d;
    this.innerCanvasType = CanvasType.CANVAS_2D;

    this.canvasElement = document.createElement("canvas");
    this.canvasElement.style.display = "block";
    // Let mouse events pass through to the inner canvas.
    this.canvasElement.style.pointerEvents = "none";
    // Ensure the canvas is rendered on top of the inner canvas.
    this.canvasElement.style.position = "relative";
    this.canvasElement.style.zIndex = "1";

    // Set up DOM elements, which are structured like:
    // canvasContainerDiv
    //   canvasElement
    //   innerCanvasContainerDiv
    //     innerCanvas
    this.canvasContainerDiv = document.createElement("div");
    this.canvasContainerDiv.style.cssText = "position: relative; overflow: hidden;";

    this.innerCanvasContainerDiv = document.createElement("div");
    this.innerCanvasContainerDiv.appendChild(this.innerCanvas.domElement);
    this.innerCanvasContainerDiv.style.cssText = "position: absolute; z-index: 0;";

    this.canvasContainerDiv.appendChild(this.innerCanvasContainerDiv);
    this.canvasContainerDiv.appendChild(this.canvasElement);

    this.onFrameLoadCallback = () => {};

    this.params = params;
    this.currentFrame = -1;

    this.labelData = [];
    this.timeToLabelIds = new Map();
    this.selectedLabelIdx = null;
    this.rangeStartId = null;

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
    this.exportOptions = { enforceEven: false, showFooter: true, showHeader: true };
    this.isScaleBarVisible = true;
    this.isTimestampVisible = true;
    this.isAnnotationVisible = true;

    const canvasContext = this.canvasElement.getContext("2d") as CanvasRenderingContext2D;
    if (canvasContext === null) {
      throw new Error("CanvasWithOverlay: Could not get canvas context; canvas.getContext('2d') returned null.");
    }
    this.ctx = canvasContext;

    this.getExportDimensions = this.getExportDimensions.bind(this);
    this.onInnerCanvasRender = this.onInnerCanvasRender.bind(this);
    this.render = this.render.bind(this);
  }

  // Wrapped ColorizeCanvas functions ///////

  public get resolution(): Vector2 {
    return this.innerCanvasSize.clone();
  }

  public get scaleInfo(): CanvasScaleInfo {
    return this.innerCanvas.scaleInfo;
  }

  get domElement(): HTMLElement {
    // Override base ColorizeCanvas getter with the composited canvas.
    return this.canvasContainerDiv;
  }

  get canvas(): HTMLCanvasElement {
    return this.canvasElement;
  }

  public setOnFrameLoadCallback(callback: (result: FrameLoadResult) => void): void {
    this.onFrameLoadCallback = callback;
    this.innerCanvas.setOnFrameLoadCallback(callback);
  }

  dispose(): void {
    this.innerCanvas2d.dispose();
    this.innerCanvas3d?.dispose();
  }

  public setResolution(width: number, height: number): void {
    // Enforce even resolution because some video codecs only support even
    // dimensions.
    this.innerCanvasSize.x = width;
    this.innerCanvasSize.y = height;
    this.innerCanvas.setResolution(this.innerCanvasSize.x, this.innerCanvasSize.y);
    this.render({ renderInnerCanvas: true });
  }

  public getIdAtPixel(x: number, y: number): PixelIdInfo | null {
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
    this.render({ renderInnerCanvas: false });
  }

  public setExportOptions(options: Partial<ExportOptions>): void {
    this.exportOptions = { ...this.exportOptions, ...options };
  }

  /**
   * Pass-through for the result of inner canvas event handlers. If the result
   * of the event handler is true, this canvas will re-render itself.
   */
  private handleRenderableAction(shouldRender: boolean): boolean {
    if (shouldRender) {
      this.render({ renderInnerCanvas: false });
    }
    return shouldRender;
  }

  public resetView(): boolean {
    return this.handleRenderableAction(this.innerCanvas.resetView());
  }

  public handleZoomIn(): boolean {
    return this.handleRenderableAction(this.innerCanvas.handleZoomIn());
  }

  handleDragEvent(x: number, y: number): boolean {
    return this.handleRenderableAction(this.innerCanvas.handleDragEvent(x, y));
  }

  handleScrollEvent(offsetX: number, offsetY: number, scrollDelta: number): boolean {
    return this.handleRenderableAction(this.innerCanvas.handleScrollEvent(offsetX, offsetY, scrollDelta));
  }

  handleZoomOut(): boolean {
    return this.handleRenderableAction(this.innerCanvas.handleZoomOut());
  }

  private async updateCanvasType(viewMode: ViewMode): Promise<void> {
    // TODO: Change API for this to `setCanvasType`, with the type passed in as
    // a parameter rather than being read from dataset.
    if (this.innerCanvasType !== CanvasType.CANVAS_3D && viewMode === ViewMode.VIEW_3D) {
      this.innerCanvasType = CanvasType.CANVAS_3D;
      if (!this.innerCanvas3d) {
        this.innerCanvas3d = new ColorizeCanvas3D();
      }
      await this.setCanvas(this.innerCanvas3d);
    } else if (this.innerCanvasType === CanvasType.CANVAS_3D && viewMode === ViewMode.VIEW_2D) {
      this.innerCanvasType = CanvasType.CANVAS_2D;
      await this.setCanvas(this.innerCanvas2d);
    }
  }

  public async setParams(params: RenderCanvasStateParams): Promise<void> {
    const prevParams = this.params;
    this.params = params;

    // If the dataset has changed types, construct and initialize the inner
    // canvas.
    let hasAlreadyUpdatedCanvasParams = false;
    if (hasPropertyChanged(params, prevParams, ["dataset", "viewMode"])) {
      await this.updateCanvasType(params.viewMode);
      hasAlreadyUpdatedCanvasParams = true;
    }

    if (!hasAlreadyUpdatedCanvasParams) {
      this.disableCanvasSyncUntilNextRender();
      await this.innerCanvas.setParams(params);
    }

    // Inner canvas will re-render on setParams, so it doesn't need
    // to be re-rendered here.
    this.render({ renderInnerCanvas: false });
  }

  public async setCanvas(canvas: IInnerRenderCanvas): Promise<void> {
    // Remove previous inner canvas from DOM.
    this.innerCanvasContainerDiv.removeChild(this.innerCanvas.domElement);

    this.innerCanvas = canvas;
    this.innerCanvasContainerDiv.appendChild(this.innerCanvas.domElement);
    this.innerCanvas.setResolution(this.innerCanvasSize.x, this.innerCanvasSize.y);
    this.innerCanvas.setOnFrameLoadCallback(this.onFrameLoadCallback);
    this.innerCanvas.resetView();
    this.innerCanvas.setOnRenderCallback(this.onInnerCanvasRender);
    await this.innerCanvas.setParams(this.params);
    await this.innerCanvas.setFrame(this.currentFrame);
    this.render({ renderInnerCanvas: false });
  }

  public setAnnotationData(
    labelData: LabelData[],
    timeToLabelIds: Map<number, Record<number, number[]>>,
    selectedLabelIdx: number | null,
    rangeStartId: number | null
  ): void {
    this.labelData = labelData;
    this.timeToLabelIds = timeToLabelIds;
    this.selectedLabelIdx = selectedLabelIdx;
    this.rangeStartId = rangeStartId;
    this.render({ renderInnerCanvas: false });
  }

  // 3D-specific functionality

  public getBackdropChannelRangePreset(backdropIndex: number, preset: ChannelRangePreset): [number, number] | null {
    if (this.innerCanvasType === CanvasType.CANVAS_3D && this.innerCanvas3d) {
      return this.innerCanvas3d.getBackdropChannelRangePreset(backdropIndex, preset);
    }
    return null;
  }

  public getBackdropChannelDataRange(backdropIndex: number): [number, number] | null {
    if (this.innerCanvasType === CanvasType.CANVAS_3D && this.innerCanvas3d) {
      return this.innerCanvas3d.getBackdropChannelDataRange(backdropIndex);
    }
    return null;
  }

  // Rendering functions ////////////////////////////

  private getBaseRendererParams(overrideResolution?: Vector2): BaseRenderParams {
    return {
      canvasSize: overrideResolution ?? this.innerCanvasSize,
      collection: this.params.collection,
      dataset: this.params.dataset,
      datasetKey: this.params.datasetKey,
      featureKey: this.params.featureKey,
    };
  }

  private getAnnotationRenderer(): RenderInfo {
    const screenSpaceMatrix = this.innerCanvas.getScreenSpaceMatrix();
    const depthToScaleFn = this.innerCanvas.getDepthToScaleFn(screenSpaceMatrix);
    const params: AnnotationParams = {
      ...this.getBaseRendererParams(),
      visible: this.isAnnotationVisible,
      labelData: this.labelData,
      timeToLabelIds: this.timeToLabelIds,
      selectedLabelIdx: this.selectedLabelIdx,
      rangeStartId: this.rangeStartId,
      centroidToCanvasMatrix: screenSpaceMatrix,
      depthToScale: depthToScaleFn,
      frame: this.currentFrame,
      // Do not provide lookup for 2D canvas since it doesn't need to deal with
      // annotations getting obscured by other objects.
      getIdAtPixel: this.innerCanvasType === CanvasType.CANVAS_3D ? this.innerCanvas.getIdAtPixel : null,
    };
    return getAnnotationRenderer(this.ctx, params, this.annotationStyle);
  }

  private getHeaderRenderer(visible: boolean, overrideResolution?: Vector2): RenderInfo {
    const params = {
      ...this.getBaseRendererParams(overrideResolution),
      visible,
    };
    return getHeaderRenderer(this.ctx, params, this.headerStyle);
  }

  private getFooterRenderer(visible: boolean, overrideResolution?: Vector2): RenderInfo {
    const scaleInfo = this.innerCanvas.scaleInfo;
    const baseParams = this.getBaseRendererParams(overrideResolution);
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
      this.render({ renderInnerCanvas: false });
    }
    return result;
  }

  /**
   * Render the viewport canvas with overlay elements composited on top of it.
   * @param doesInnerCanvasNeedRender Whether the inner canvas needs to be
   * re-rendered. True by default.
   */
  render(options?: OverlayRenderOptions): void {
    // Expand size by header + footer, if rendering:
    const headerRenderer = this.getHeaderRenderer(this.exportOptions.showHeader && this.isExporting);
    const footerRenderer = this.getFooterRenderer(this.exportOptions.showFooter && this.isExporting);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    // Update canvas resolution + size.
    const devicePixelRatio = getPixelRatio();

    let baseCanvasWidthPx = this.innerCanvasSize.x;
    let baseCanvasHeightPx = this.innerCanvasSize.y + this.headerSize.y + this.footerSize.y;
    if (this.isExporting && this.exportOptions.enforceEven) {
      baseCanvasWidthPx = toEven(baseCanvasWidthPx * devicePixelRatio) / devicePixelRatio;
      baseCanvasHeightPx = toEven(baseCanvasHeightPx * devicePixelRatio) / devicePixelRatio;
    }

    // We use devicePixelRatio to scale the canvas with browser zoom / high-DPI
    // displays so text + graphics are sharp.
    this.canvasElement.width = Math.round(baseCanvasWidthPx * devicePixelRatio);
    this.canvasElement.height = Math.round(baseCanvasHeightPx * devicePixelRatio);
    this.canvasContainerDiv.style.width = `${baseCanvasWidthPx}px`;
    this.canvasContainerDiv.style.height = `${baseCanvasHeightPx}px`;
    this.canvas.style.width = `${baseCanvasWidthPx}px`;
    this.canvas.style.height = `${baseCanvasHeightPx}px`;

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    this.ctx.imageSmoothingEnabled = false;

    if (options?.renderInnerCanvas || this.isExporting) {
      this.disableCanvasSyncUntilNextRender();
      this.innerCanvas.render({ ...options, synchronous: this.isExporting });
    }
    if (this.isExporting && this.innerCanvas.canvas.width !== 0 && this.innerCanvas.canvas.height !== 0) {
      // In export mode only, draw the inner canvas inside of the overlay
      // canvas. Normally, the overlay canvas has a transparent background that
      // shows the inner canvas behind it. This lets us export the contents of
      // both canvases as one image.
      this.ctx.fillStyle = "white";
      this.ctx.drawImage(this.innerCanvas.canvas, 0, Math.round(this.headerSize.y * devicePixelRatio));
    }

    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    if (this.isAnnotationVisible) {
      this.getAnnotationRenderer().render(new Vector2(0, this.headerSize.y));
    }
    headerRenderer.render(new Vector2(0, 0));
    footerRenderer.render(new Vector2(0, this.innerCanvasSize.y + this.headerSize.y));
  }

  /** Called when the inner canvas renders asynchronously. */
  private onInnerCanvasRender(): void {
    if (this.isAnnotationVisible) {
      this.render({ renderInnerCanvas: false });
    }
  }

  /**
   * Temporarily disables the sync behavior, where the outer canvas re-renders
   * with the inner canvas's asynchronous renders. Sync behavior is reenabled
   * after the next inner canvas render.
   *
   * Call this method when the inner canvas is about to be rendered on-demand by
   * this outer canvas to prevent unnecessary re-renders.
   */
  private disableCanvasSyncUntilNextRender(): void {
    this.innerCanvas.setOnRenderCallback(() => {
      this.innerCanvas.setOnRenderCallback(this.onInnerCanvasRender);
    });
  }

  /**
   * Gets the screen-space pixel dimensions of the canvas (including the header and footer) when the
   * canvas is being exported.
   */
  getExportDimensions(baseResolution: Vector2, exportOptions: ExportOptions): Vector2 {
    const headerRenderer = this.getHeaderRenderer(exportOptions.showHeader, baseResolution);
    const footerRenderer = this.getFooterRenderer(exportOptions.showFooter, baseResolution);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const pixelRatio = getPixelRatio();
    const canvasWidth = Math.round(baseResolution.x * pixelRatio);
    const canvasHeight = Math.round((baseResolution.y + this.headerSize.y + this.footerSize.y) * pixelRatio);
    if (exportOptions.enforceEven) {
      return new Vector2(toEven(canvasWidth), toEven(canvasHeight));
    }
    return new Vector2(canvasWidth, canvasHeight);
  }
}
