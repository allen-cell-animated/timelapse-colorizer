import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, ReactNode, useCallback, useContext, useEffect, useRef } from "react";
import styled from "styled-components";
import { Vector2 } from "three";
import { clamp } from "three/src/math/MathUtils";

import { ImagesIconSVG, ImagesSlashIconSVG, NoImageSVG, TagIconSVG, TagSlashIconSVG } from "../assets";
import { AnnotationSelectionMode, LoadTroubleshooting, TabType } from "../colorizer/types";
import * as mathUtils from "../colorizer/utils/math_utils";
import { AnnotationState } from "../colorizer/utils/react_utils";
import { INTERNAL_BUILD } from "../constants";
import { FlexColumn, FlexColumnAlignCenter, VisuallyHidden } from "../styles/utils";

import { IRenderCanvas, renderCanvasStateParamsSelector } from "../colorizer/IRenderCanvas";
import { useViewerStateStore } from "../state/ViewerState";
import { AppThemeContext } from "./AppStyle";
import { AlertBannerProps } from "./Banner";
import { LinkStyleButton } from "./Buttons/LinkStyleButton";
import IconButton from "./IconButton";
import LoadingSpinner from "./LoadingSpinner";
import { TooltipWithSubtitle } from "./Tooltips/TooltipWithSubtitle";

const ASPECT_RATIO = 14.6 / 10;
/* Minimum distance in either X or Y that mouse should move
 * before mouse event is considered a drag
 */
const MIN_DRAG_THRESHOLD_PX = 5;
const LEFT_CLICK_BUTTON = 0;
const MIDDLE_CLICK_BUTTON = 1;
const RIGHT_CLICK_BUTTON = 2;

const MAX_INVERSE_ZOOM = 2; // 0.5x zoom
const MIN_INVERSE_ZOOM = 0.1; // 10x zoom

const CanvasContainer = styled(FlexColumnAlignCenter)<{ $annotationModeEnabled: boolean }>`
  position: relative;
  background-color: var(--color-viewport-background);

  outline: 1px solid
    ${(props) => (props.$annotationModeEnabled ? "var(--color-viewport-annotation-outline)" : "transparent")};
  box-shadow: 0 0 8px 2px
    ${(props) => (props.$annotationModeEnabled ? "var(--color-viewport-annotation-outline)" : "transparent")};

  transition: box-shadow 0.1s ease-in, outline 0.1s ease-in;
`;

const CanvasControlsContainer = styled(FlexColumn)`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px;
  border-radius: 4px;
  background-color: var(--color-viewport-overlay-background);
  border: 1px solid var(--color-viewport-overlay-outline);
`;

const MissingFileIconContainer = styled(FlexColumnAlignCenter)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #fff9;
  padding: 10px 15px;
  border-radius: 6px;
  // TODO: Make this responsive to background color?
  --fill-color: #0006;
  fill: var(--fill-color);
  color: var(--fill-color);
  pointer-events: none;
`;

const AnnotationModeContainer = styled(FlexColumnAlignCenter)`
  position: absolute;
  top: 10px;
  left: 10px;
  font-weight: bold;
  background-color: var(--color-viewport-overlay-background);
  border: 1px solid var(--color-viewport-overlay-outline);
  z-index: 200;
  padding: 8px 12px;
  border-radius: 4px;
  pointer-events: none;
`;

type CanvasWrapperProps = {
  canv: IRenderCanvas;

  loading: boolean;
  loadingProgress: number | null;
  isRecording: boolean;

  annotationState: AnnotationState;

  onClickId?: (id: number) => void;

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHover?: (id: number) => void;
  /** Called when the mouse exits the canvas. */
  onMouseLeave?: () => void;

  showAlert?: (props: AlertBannerProps) => void;

  maxWidthPx?: number;
  maxHeightPx?: number;
};

const defaultProps: Partial<CanvasWrapperProps> = {
  onMouseHover() {},
  onMouseLeave() {},
  onClickId() {},
  maxWidthPx: 1400,
  maxHeightPx: 1000,
};

/**
 * Provides a React component-style interface for interacting with ColorizeCanvas.
 *
 * Note that some canvas operations (like `setFrame`, `setFeature`, `setDataset`)
 * are async and should be called directly on the canvas instance.
 */
export default function CanvasWrapper(inputProps: CanvasWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CanvasWrapperProps>;

  // Access state properties
  const pendingFrame = useViewerStateStore((state) => state.pendingFrame);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const backdropKey = useViewerStateStore((state) => state.backdropKey);
  const backdropVisible = useViewerStateStore((state) => state.backdropVisible);
  const clearTrack = useViewerStateStore((state) => state.clearTrack);
  const collection = useViewerStateStore((state) => state.collection);
  const dataset = useViewerStateStore((state) => state.dataset);
  const setBackdropVisible = useViewerStateStore((state) => state.setBackdropVisible);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const setTrack = useViewerStateStore((state) => state.setTrack);
  // const showHeaderDuringExport = useViewerStateStore((state) => state.showHeaderDuringExport);
  // const showLegendDuringExport = useViewerStateStore((state) => state.showLegendDuringExport);
  // const showScaleBar = useViewerStateStore((state) => state.showScaleBar);
  // const showTimestamp = useViewerStateStore((state) => state.showTimestamp);
  const frameLoadResult = useViewerStateStore((state) => state.frameLoadResult);

  const containerRef = useRef<HTMLDivElement>(null);

  const canv = props.canv;
  const canvasPlaceholderRef = useRef<HTMLDivElement>(null);

  const isFrameLoading = pendingFrame !== currentFrame;
  const loadProgress = props.loading ? props.loadingProgress : null;

  // Add subscriber so canvas parameters are updated when the state changes.
  useEffect(() => {
    return useViewerStateStore.subscribe(renderCanvasStateParamsSelector, (params) => {
      canv.setParams(params);
    });
  }, []);

  /**
   * Canvas zoom level, stored as its inverse. This makes it so linear changes in zoom level
   * (by +/-0.25) affect the zoom level more when zoomed in than zoomed out.
   */
  const canvasZoomInverse = useRef(1.0);
  /**
   * The offset of the frame in the canvas, in normalized frame coordinates. [0, 0] means the
   * frame will be centered, while [-0.5, -0.5] means the top right corner of the frame will be
   * centered in the canvas view.
   * X and Y are clamped to a range of [-0.5, 0.5] to prevent the frame from being panned out of view.
   */
  const canvasPanOffset = useRef(new Vector2(0, 0));
  const isMouseLeftDown = useRef(false);
  const isMouseMiddleDown = useRef(false);
  const isMouseRightDown = useRef(false);
  /**
   * Turns on if the mouse has moved more than MIN_DRAG_THRESHOLD_PX in X or Y after initial click;
   * turns off when mouse is released. Used to determine whether to pan the canvas or treat
   * the click as a track selection/regular click.
   */
  const isMouseDragging = useRef(false);
  const totalMouseDrag = useRef(new Vector2(0, 0));

  const isMouseOverCanvas = useRef(false);
  const lastMousePositionPx = useRef(new Vector2(0, 0));
  const theme = useContext(AppThemeContext);

  const isMissingFile =
    frameLoadResult !== null && (!frameLoadResult.isFrameLoaded || !frameLoadResult.isBackdropLoaded);

  // CANVAS PROPERTIES /////////////////////////////////////////////////

  // Show warning if files are missing
  useEffect(() => {
    if (isMissingFile) {
      props.showAlert({
        type: "warning",
        message: "Warning: One or more frames or backdrops failed to load.",
        description: LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
        showDoNotShowAgainCheckbox: true,
        closable: true,
      });
    }
  }, [frameLoadResult]);

  // Mount the canvas to the placeholder's location in the document.
  useEffect(() => {
    canvasPlaceholderRef.current?.parentNode?.replaceChild(canv.domElement, canvasPlaceholderRef.current);
  }, []);

  // These are all useMemo calls because the updates to the canvas must happen in the same render;
  // if these were useEffects, the canvas will lag behind updates since there is no state update to
  // trigger a re-render.

  // TODO: Uncomment these once ColorizeCanvas3D is compatible with
  // CanvasUIOverlay. I could also move this into global state and have
  // it be handled by `canvas.setParams`.

  // Update the theming of the canvas overlay.
  // useMemo(() => {
  //   const defaultTheme = {
  //     fontSizePx: theme.font.size.label,
  //     fontColor: theme.color.text.primary,
  //     fontFamily: theme.font.family,
  //   };
  //   const sidebarTheme = {
  //     ...defaultTheme,
  //     stroke: theme.color.layout.borders,
  //     fill: theme.color.layout.background,
  //   };
  //   canv.updateScaleBarStyle(defaultTheme);
  //   canv.updateTimestampStyle(defaultTheme);
  //   canv.updateInsetBoxStyle({ stroke: theme.color.layout.borders });
  //   canv.updateLegendStyle(defaultTheme);
  //   canv.updateFooterStyle(sidebarTheme);
  //   canv.updateHeaderStyle(sidebarTheme);
  // }, [theme]);

  // Update overlay settings
  // useMemo(() => {
  //   canv.isScaleBarVisible = showScaleBar;
  // }, [showScaleBar]);

  // useMemo(() => {
  //   canv.isTimestampVisible = showTimestamp;
  // }, [showTimestamp]);

  // useMemo(() => {
  //   canv.setIsExporting(props.isRecording);
  //   canv.isHeaderVisibleOnExport = showHeaderDuringExport;
  //   canv.isFooterVisibleOnExport = showLegendDuringExport;
  // }, [showLegendDuringExport, props.isRecording]);

  // useMemo(() => {
  //   const annotationLabels = props.annotationState.data.getLabels();
  //   const timeToAnnotationLabelIds = dataset ? props.annotationState.data.getTimeToLabelIdMap(dataset) : new Map();
  //   canv.setAnnotationData(
  //     annotationLabels,
  //     timeToAnnotationLabelIds,
  //     props.annotationState.currentLabelIdx,
  //     props.annotationState.lastClickedId
  //   );
  //   canv.isAnnotationVisible = props.annotationState.visible;
  // }, [
  //   dataset,
  //   props.annotationState.data,
  //   props.annotationState.lastClickedId,
  //   props.annotationState.currentLabelIdx,
  //   props.annotationState.visible,
  // ]);

  // CANVAS RESIZING /////////////////////////////////////////////////

  /**
   * Measures the current width of the canvas component, constraining it by
   * the maximum width and height props while maintaining the aspect ratio.
   */
  const getCanvasSizePx = useCallback((): Vector2 => {
    const widthPx = Math.min(
      containerRef.current?.clientWidth ?? props.maxWidthPx,
      props.maxWidthPx,
      props.maxHeightPx * ASPECT_RATIO
    );
    return new Vector2(Math.floor(widthPx), Math.floor(widthPx / ASPECT_RATIO));
  }, [props.maxHeightPx, props.maxWidthPx]);

  // Respond to window resizing
  useEffect(() => {
    const updateCanvasDimensions = (): void => {
      const canvasSizePx = getCanvasSizePx();
      canv.setResolution(canvasSizePx.x, canvasSizePx.y);
    };
    updateCanvasDimensions(); // Initial size setting

    const handleResize = (): void => {
      updateCanvasDimensions();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canv, getCanvasSizePx]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

  // Reset the canvas zoom + pan when the collection changes
  useEffect(() => {
    canvasZoomInverse.current = 1.0;
    canvasPanOffset.current = new Vector2(0, 0);
    // canv.setZoom(1.0);
    // canv.setPan(0, 0);
  }, [collection]);

  /** Report clicked tracks via the passed callback. */
  const handleClick = useCallback(
    async (event: MouseEvent): Promise<void> => {
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      // Reset track input
      if (id < 0 || dataset === null) {
        clearTrack();
      } else {
        const trackId = dataset.getTrackId(id);
        const newTrack = dataset.getTrack(trackId);
        if (newTrack) {
          setTrack(newTrack);
        }
      }
      props.onClickId(id);
    },
    [canv, dataset, props.onClickId, setTrack, clearTrack]
  );

  /**
   * Returns the full size of the frame in screen pixels, including offscreen pixels.
   */
  const getFrameSizeInScreenPx = useCallback((): Vector2 => {
    const canvasSizePx = getCanvasSizePx();
    const frameResolution = dataset ? dataset.frameResolution : canvasSizePx;
    const canvasZoom = 1 / canvasZoomInverse.current;
    return mathUtils.getFrameSizeInScreenPx(canvasSizePx, frameResolution, canvasZoom);
  }, [dataset?.frameResolution, getCanvasSizePx]);

  /** Change zoom by some delta factor. */
  const handleZoom = useCallback(
    (zoomDelta: number): void => {
      canvasZoomInverse.current += zoomDelta;
      canvasZoomInverse.current = clamp(canvasZoomInverse.current, MIN_INVERSE_ZOOM, MAX_INVERSE_ZOOM);
      // canv.setZoom(1 / canvasZoomInverse.current);
    },
    [canv]
  );

  /** Zoom with respect to the pointer; keeps the mouse in the same position relative to the underlying
   *  frame by panning as the zoom changes.
   */
  const handleZoomToMouse = useCallback(
    (event: WheelEvent, zoomDelta: number): void => {
      const canvasSizePx = getCanvasSizePx();
      const startingFrameSizePx = getFrameSizeInScreenPx();
      const canvasOffsetPx = new Vector2(event.offsetX, event.offsetY);

      const currentMousePosition = mathUtils.convertCanvasOffsetPxToFrameCoords(
        canvasSizePx,
        startingFrameSizePx,
        canvasOffsetPx,
        canvasPanOffset.current
      );

      handleZoom(zoomDelta);

      const newFrameSizePx = getFrameSizeInScreenPx();
      const newMousePosition = mathUtils.convertCanvasOffsetPxToFrameCoords(
        canvasSizePx,
        newFrameSizePx,
        canvasOffsetPx,
        canvasPanOffset.current
      );
      const mousePositionDelta = newMousePosition.clone().sub(currentMousePosition);

      canvasPanOffset.current.x = clamp(canvasPanOffset.current.x + mousePositionDelta.x, -0.5, 0.5);
      canvasPanOffset.current.y = clamp(canvasPanOffset.current.y + mousePositionDelta.y, -0.5, 0.5);

      // canv.setPan(canvasPanOffset.current.x, canvasPanOffset.current.y);
    },
    [handleZoom, getCanvasSizePx, getFrameSizeInScreenPx]
  );

  const handlePan = useCallback(
    (dx: number, dy: number): void => {
      const frameSizePx = getFrameSizeInScreenPx();
      // Normalize dx/dy (change in pixels) to frame coordinates
      canvasPanOffset.current.x += dx / frameSizePx.x;
      canvasPanOffset.current.y += -dy / frameSizePx.y;
      // Clamp panning
      canvasPanOffset.current.x = clamp(canvasPanOffset.current.x, -0.5, 0.5);
      canvasPanOffset.current.y = clamp(canvasPanOffset.current.y, -0.5, 0.5);
      // canv.setPan(canvasPanOffset.current.x, canvasPanOffset.current.y);
    },
    [canv, getCanvasSizePx, dataset]
  );

  // Mouse event handlers

  const onMouseClick = useCallback(
    (event: MouseEvent): void => {
      // Note that click events won't fire until the mouse is released. We need
      // to check if the mouse was dragged before treating the click as a track
      // selection; otherwise the track selection gets changed unexpectedly.
      if (!isMouseDragging.current) {
        handleClick(event);
      }
    },
    [handleClick]
  );

  const onContextMenu = useCallback((event: MouseEvent): void => {
    if (isMouseDragging.current) {
      event.preventDefault();
    }
  }, []);

  const onMouseDown = useCallback((event: MouseEvent): void => {
    // Prevent the default behavior for mouse clicks that would cause text
    // selection, but keep the behavior where focus is removed from other
    // elements.
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && document.activeElement !== canv.domElement) {
      document.activeElement.blur();
    }

    isMouseDragging.current = false;

    if (event.button === MIDDLE_CLICK_BUTTON) {
      isMouseMiddleDown.current = true;
    } else if (event.button === LEFT_CLICK_BUTTON) {
      isMouseLeftDown.current = true;
    } else if (event.button === RIGHT_CLICK_BUTTON) {
      isMouseRightDown.current = true;
    }

    totalMouseDrag.current = new Vector2(0, 0);
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (isMouseLeftDown.current || isMouseMiddleDown.current || isMouseRightDown.current) {
        // Add to total drag distance; if it exceeds threshold, consider the mouse interaction
        // to be a drag operation. Start panning and disable track selection.
        totalMouseDrag.current.x += Math.abs(event.movementX);
        totalMouseDrag.current.y += Math.abs(event.movementY);
        if (totalMouseDrag.current.length() > MIN_DRAG_THRESHOLD_PX) {
          isMouseDragging.current = true;
          handlePan(event.movementX, event.movementY);
        }
      }

      if (isMouseDragging.current) {
        canv.domElement.style.cursor = "move";
      } else if (props.annotationState.isAnnotationModeEnabled) {
        if (props.annotationState.selectionMode === AnnotationSelectionMode.TRACK) {
          canv.domElement.style.cursor = "cell";
        } else {
          canv.domElement.style.cursor = "crosshair";
        }
      } else {
        canv.domElement.style.cursor = "auto";
      }
    },
    [handlePan, props.annotationState.isAnnotationModeEnabled, props.annotationState.selectionMode]
  );

  const onMouseUp = useCallback((_event: MouseEvent): void => {
    // Reset any mouse tracking state
    isMouseLeftDown.current = false;
    isMouseMiddleDown.current = false;
    isMouseRightDown.current = false;
    setTimeout(() => {
      // Delay slightly to make sure that click event is processed first before resetting drag state
      isMouseDragging.current = false;
    }, 10);
  }, []);

  const onMouseWheel = useCallback(
    (event: WheelEvent): void => {
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        if (Math.abs(event.deltaY) > 25) {
          // Using mouse wheel (probably). There's no surefire way to detect this, but mice usually
          // scroll in much larger increments.
          handleZoomToMouse(event, event.deltaY * 0.001);
        } else {
          // Track pad zoom
          handleZoomToMouse(event, event.deltaY * 0.005);
        }
      }
    },
    [handleZoomToMouse]
  );

  // Mount the event listeners for pan and zoom interactions.
  // It may be more performant to separate these into individual useEffects, but
  // this is more readable.
  useEffect(() => {
    canv.domElement.addEventListener("click", onMouseClick);
    canv.domElement.addEventListener("wheel", onMouseWheel);
    canv.domElement.addEventListener("mousedown", onMouseDown);
    // Listen for context menu, mouseup, and mousemove events anywhere.
    // For context menu, this allows us to hide the context menu if the user was dragging the mouse
    // and releases the right mouse button off the canvas.
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      canv.domElement.removeEventListener("click", onMouseClick);
      canv.domElement.removeEventListener("wheel", onMouseWheel);
      canv.domElement.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [canv, onMouseClick, onMouseWheel, onMouseDown, onMouseMove, onMouseUp, handlePan]);

  /** Report hovered id via the passed callback. */
  const reportHoveredIdAtPixel = useCallback(
    (x: number, y: number): void => {
      if (!dataset) {
        return;
      }
      const id = canv.getIdAtPixel(x, y);
      props.onMouseHover(id);
    },
    [dataset, canv]
  );

  /** Track whether the canvas is hovered, so we can determine whether to send updates about the
   * hovered value when the canvas frame updates.
   */
  useEffect(() => {
    canv.domElement.addEventListener("mouseenter", () => (isMouseOverCanvas.current = true));
    canv.domElement.addEventListener("mouseleave", () => (isMouseOverCanvas.current = false));
  });

  /** Update hovered id when the canvas updates the current frame */
  useEffect(() => {
    if (isMouseOverCanvas.current) {
      reportHoveredIdAtPixel(lastMousePositionPx.current.x, lastMousePositionPx.current.y);
    }
  }, [currentFrame]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      reportHoveredIdAtPixel(event.offsetX, event.offsetY);
      lastMousePositionPx.current = new Vector2(event.offsetX, event.offsetY);
    };

    canv.domElement.addEventListener("mousemove", onMouseMove);
    canv.domElement.addEventListener("mouseleave", props.onMouseLeave);
    return () => {
      canv.domElement.removeEventListener("mousemove", onMouseMove);
      canv.domElement.removeEventListener("mouseleave", props.onMouseLeave);
    };
  }, [dataset, canv]);

  const makeLinkStyleButton = (key: string, onClick: () => void, content: ReactNode): ReactNode => {
    return (
      <LinkStyleButton
        key={key}
        onClick={onClick}
        $color={theme.color.text.darkLink}
        $hoverColor={theme.color.text.darkLinkHover}
        tabIndex={-1}
      >
        {content}
      </LinkStyleButton>
    );
  };

  // RENDERING /////////////////////////////////////////////////

  canv.render();

  const onViewerSettingsLinkClicked = (): void => {
    setOpenTab(TabType.SETTINGS);
  };

  const onAnnotationLinkClicked = (): void => {
    setOpenTab(TabType.ANNOTATION);
  };

  const backdropTooltipContents: ReactNode[] = [];
  backdropTooltipContents.push(
    <span key="backdrop-name">
      {backdropKey === null ? "(No backdrops available)" : dataset?.getBackdropData().get(backdropKey)?.name}
    </span>
  );
  // Link to viewer settings
  backdropTooltipContents.push(
    makeLinkStyleButton(
      "backdrop-viewer-settings-link",
      onViewerSettingsLinkClicked,
      <span>
        {"Viewer settings > Backdrop"} <VisuallyHidden>(opens settings tab)</VisuallyHidden>
      </span>
    )
  );

  const labels = props.annotationState.data.getLabels();
  const annotationTooltipContents: ReactNode[] = [];
  annotationTooltipContents.push(
    <span key="annotation-count">
      {labels.length > 0 ? (labels.length === 1 ? "1 label" : `${labels.length} labels`) : "(No labels)"}
    </span>
  );
  annotationTooltipContents.push(
    makeLinkStyleButton(
      "annotation-link",
      onAnnotationLinkClicked,
      <span>
        View and edit annotations <VisuallyHidden>(opens annotations tab)</VisuallyHidden>
      </span>
    )
  );

  return (
    <CanvasContainer
      ref={containerRef}
      $annotationModeEnabled={props.annotationState.isAnnotationModeEnabled}
      id="canvas-wrapper"
    >
      {props.annotationState.isAnnotationModeEnabled && (
        <AnnotationModeContainer>Annotation editing in progress...</AnnotationModeContainer>
      )}
      <LoadingSpinner loading={props.loading || isFrameLoading} progress={loadProgress}>
        <div ref={canvasPlaceholderRef}></div>
      </LoadingSpinner>
      <MissingFileIconContainer style={{ visibility: isMissingFile ? "visible" : "hidden" }}>
        <NoImageSVG aria-labelledby="no-image" style={{ width: "50px" }} />
        <p id="no-image">
          <b>Missing image data</b>
        </p>
      </MissingFileIconContainer>
      <CanvasControlsContainer $gap={4} style={{ zIndex: 101 }}>
        <Tooltip title={"Reset view"} placement="right" trigger={["hover", "focus"]}>
          <IconButton
            onClick={() => {
              canvasZoomInverse.current = 1.0;
              canvasPanOffset.current = new Vector2(0, 0);
              // canv.setZoom(1.0);
              // canv.setPan(0, 0);
            }}
            type="link"
          >
            <HomeOutlined />
            <VisuallyHidden>Reset view</VisuallyHidden>
          </IconButton>
        </Tooltip>
        <TooltipWithSubtitle title={"Zoom in"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
          <IconButton
            type="link"
            onClick={() => {
              handleZoom(-0.25);
            }}
          >
            <ZoomInOutlined />
            <VisuallyHidden>Zoom in</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>
        <TooltipWithSubtitle title={"Zoom out"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
          <IconButton
            type="link"
            onClick={() => {
              // Little hack because the minimum zoom level is 0.1x, but all the other zoom levels
              // are in increments of 0.25x. This ensures zooming all the way in and back out will return
              // the zoom to 1.0x.
              handleZoom(canvasZoomInverse.current === MIN_INVERSE_ZOOM ? 0.15 : 0.25);
            }}
          >
            <ZoomOutOutlined />
            <VisuallyHidden>Zoom out</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>

        {/* Backdrop toggle */}
        <TooltipWithSubtitle
          title={backdropVisible ? "Hide backdrop" : "Show backdrop"}
          placement="right"
          subtitleList={backdropTooltipContents}
          trigger={["hover", "focus"]}
        >
          <IconButton
            type={backdropVisible ? "primary" : "link"}
            onClick={() => setBackdropVisible(!backdropVisible)}
            disabled={backdropKey === null}
          >
            {backdropVisible ? <ImagesSlashIconSVG /> : <ImagesIconSVG />}
            <VisuallyHidden>{backdropVisible ? "Hide backdrop" : "Show backdrop"}</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>

        {/* Annotation mode toggle */}
        {INTERNAL_BUILD && (
          <TooltipWithSubtitle
            title={props.annotationState.visible ? "Hide annotations" : "Show annotations"}
            subtitleList={annotationTooltipContents}
            placement="right"
            trigger={["hover", "focus"]}
          >
            <IconButton
              type={props.annotationState.visible ? "primary" : "link"}
              onClick={() => {
                props.annotationState.setVisibility(!props.annotationState.visible);
              }}
            >
              {props.annotationState.visible ? <TagSlashIconSVG /> : <TagIconSVG />}
              <VisuallyHidden>{props.annotationState.visible ? "Hide annotations" : "Show annotations"}</VisuallyHidden>
            </IconButton>
          </TooltipWithSubtitle>
        )}
      </CanvasControlsContainer>
    </CanvasContainer>
  );
}
