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
import { getPixelRatio, toEven } from "./canvas/utils";
import { CanvasScaleInfo, CanvasType, FrameLoadResult, PixelIdInfo } from "./types";
import { hasPropertyChanged } from "./utils/data_utils";

import { LabelData } from "./AnnotationData";
import ColorizeCanvas2D from "./ColorizeCanvas2D";
import { ColorizeCanvas3D } from "./ColorizeCanvas3D";
import Dataset from "./Dataset";
import { IInnerRenderCanvas } from "./IInnerRenderCanvas";
import { IRenderCanvas, RenderCanvasStateParams } from "./IRenderCanvas";

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

  private zoomMultiplier: number;
  private panOffset: Vector2;

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
  public isHeaderVisibleOnExport: boolean;
  public isFooterVisibleOnExport: boolean;
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
    this.zoomMultiplier = 1;
    this.panOffset = new Vector2();

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
    this.innerCanvasSize.x = toEven(width);
    this.innerCanvasSize.y = toEven(height);
    this.innerCanvas.setResolution(this.innerCanvasSize.x, this.innerCanvasSize.y);
    this.render();
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
    this.render(false);
  }

  public setZoom(zoom: number): void {
    // TODO: Replace all these checks for specific instances with canvas type (2D/3D)
    if (this.innerCanvas instanceof ColorizeCanvas2D) {
      this.zoomMultiplier = zoom;
      this.innerCanvas.setZoom(zoom);
      this.render();
    }
  }

  public setPan(x: number, y: number): void {
    if (this.innerCanvas instanceof ColorizeCanvas2D) {
      this.panOffset.set(x, y);
      this.innerCanvas.setPan(x, y);
      this.render();
    }
  }

  /**
   * Returns true if the inner canvas type needs to be changed to match the
   * dataset type.
   *
   * Currently, the 3D canvas is preferentially shown if the dataset has 3D
   * frames, even if a dataset has 2D and 3D frame data.
   */
  private doesCanvasTypeNeedUpdate(dataset: Dataset): boolean {
    // TODO: Change this check (and the conditional in `updateCanvasType`) to
    // only switch if a dataset doesn't have the matching frame type once a user
    // control for 2D/3D view mode is added. Right now, this always switches to
    // 3D if the dataset has 3D frames, meaning that 3D frame data overrides 2D
    // frame data.
    return (
      (this.innerCanvasType !== CanvasType.CANVAS_3D && dataset.has3dFrames()) ||
      (this.innerCanvasType === CanvasType.CANVAS_3D && !dataset.has3dFrames())
    );
  }

  private async updateCanvasType(dataset: Dataset): Promise<void> {
    if (this.innerCanvasType !== CanvasType.CANVAS_3D && dataset.has3dFrames()) {
      this.innerCanvasType = CanvasType.CANVAS_3D;
      if (!this.innerCanvas3d) {
        this.innerCanvas3d = new ColorizeCanvas3D();
      }
      await this.setCanvas(this.innerCanvas3d);
    } else if (this.innerCanvasType === CanvasType.CANVAS_3D && !dataset.has3dFrames()) {
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
    if (hasPropertyChanged(params, prevParams, ["dataset"])) {
      const dataset = params.dataset;
      if (dataset && this.doesCanvasTypeNeedUpdate(dataset)) {
        await this.updateCanvasType(dataset);
        hasAlreadyUpdatedCanvasParams = true;
      }
    }

    if (!hasAlreadyUpdatedCanvasParams) {
      this.disableCanvasSyncUntilNextRender();
      await this.innerCanvas.setParams(params);
    }

    // Inner canvas will re-render on setParams, so it doesn't need
    // to be re-rendered here.
    this.render(false);
  }

  public async setCanvas(canvas: IInnerRenderCanvas): Promise<void> {
    // Remove previous inner canvas from DOM.
    this.innerCanvasContainerDiv.removeChild(this.innerCanvas.domElement);

    this.innerCanvas = canvas;
    this.innerCanvasContainerDiv.appendChild(this.innerCanvas.domElement);
    this.innerCanvas.setResolution(this.innerCanvasSize.x, this.innerCanvasSize.y);
    this.innerCanvas.setOnFrameLoadCallback(this.onFrameLoadCallback);
    this.innerCanvas.setOnRenderCallback(this.onInnerCanvasRender);
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
    rangeStartId: number | null
  ): void {
    this.labelData = labelData;
    this.timeToLabelIds = timeToLabelIds;
    this.selectedLabelIdx = selectedLabelIdx;
    this.rangeStartId = rangeStartId;
    this.render(false);
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

    // Update canvas resolution + size.
    const devicePixelRatio = getPixelRatio();
    const baseCanvasWidthPx = toEven(this.innerCanvasSize.x);
    const baseCanvasHeightPx = toEven(this.innerCanvasSize.y + this.headerSize.y + this.footerSize.y);

    // We use devicePixelRatio to scale the canvas with browser zoom / high-DPI
    // displays so text + graphics are sharp.
    this.canvasElement.width = Math.round(baseCanvasWidthPx * devicePixelRatio);
    this.canvasElement.height = Math.round(baseCanvasHeightPx * devicePixelRatio);
    this.canvasContainerDiv.style.width = `${baseCanvasWidthPx}px`;
    this.canvasContainerDiv.style.height = `${baseCanvasHeightPx}px`;
    this.canvas.style.width = `${baseCanvasWidthPx}px`;
    this.canvas.style.height = `${baseCanvasHeightPx}px`;

    // TODO: The inner canvas should already handle this but there's a noticeable
    // improvement in rendering quality/sharpness when it's set here...
    this.innerCanvas.canvas.width = Math.round(this.innerCanvasSize.x * devicePixelRatio);
    this.innerCanvas.canvas.height = Math.round(this.innerCanvasSize.y * devicePixelRatio);
    this.innerCanvas.canvas.style.width = `${this.innerCanvasSize.x}px`;
    this.innerCanvas.canvas.style.height = `${this.innerCanvasSize.y}px`;

    //Clear canvas
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    this.ctx.imageSmoothingEnabled = false;

    if (doesInnerCanvasNeedRender || this.isExporting) {
      this.disableCanvasSyncUntilNextRender();
      this.innerCanvas.render(this.isExporting);
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

    headerRenderer.render(new Vector2(0, 0));
    if (this.isAnnotationVisible) {
      this.getAnnotationRenderer().render(new Vector2(0, this.headerSize.y));
    }
    footerRenderer.render(new Vector2(0, this.innerCanvasSize.y + this.headerSize.y));
  }

  /** Called when the inner canvas renders asynchronously. */
  private onInnerCanvasRender(): void {
    if (this.isAnnotationVisible) {
      this.render(false);
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
  getExportDimensions(): [number, number] {
    const headerRenderer = this.getHeaderRenderer(this.isHeaderVisibleOnExport);
    const footerRenderer = this.getFooterRenderer(this.isFooterVisibleOnExport);
    this.headerSize = headerRenderer.sizePx;
    this.footerSize = footerRenderer.sizePx;

    const devicePixelRatio = getPixelRatio();
    const canvasWidth = toEven(Math.round(this.innerCanvasSize.x * devicePixelRatio));
    const canvasHeight = toEven(
      Math.round((this.innerCanvasSize.y + this.headerSize.y + this.footerSize.y) * devicePixelRatio)
    );
    return [canvasWidth, canvasHeight];
  }
}
