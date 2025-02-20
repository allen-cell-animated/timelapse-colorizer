import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip, TooltipProps } from "antd";
import React, { ReactElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation, Vector2 } from "three";
import { clamp } from "three/src/math/MathUtils";

import { ImagesIconSVG, ImagesSlashIconSVG, NoImageSVG, TagIconSVG, TagSlashIconSVG } from "../assets";
import { ColorRamp, Dataset, Track } from "../colorizer";
import { AnnotationSelectionMode, LoadTroubleshooting, TabType, ViewerConfig } from "../colorizer/types";
import * as mathUtils from "../colorizer/utils/math_utils";
import { AnnotationState } from "../colorizer/utils/react_utils";
import { INTERNAL_BUILD } from "../constants";
import { FlexColumn, FlexColumnAlignCenter, VisuallyHidden } from "../styles/utils";

import CanvasUIOverlay from "../colorizer/CanvasWithOverlay";
import Collection from "../colorizer/Collection";
import { AppThemeContext } from "./AppStyle";
import { AlertBannerProps } from "./Banner";
import { LinkStyleButton } from "./Buttons/LinkStyleButton";
import IconButton from "./IconButton";
import LoadingSpinner from "./LoadingSpinner";

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

function TooltipWithSubtext(
  props: TooltipProps & { title: ReactNode; subtitle?: ReactNode; subtitleList?: ReactNode[] }
): ReactElement {
  const divRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={divRef}>
      <Tooltip
        {...props}
        trigger={["hover", "focus"]}
        title={
          <>
            <p style={{ margin: 0 }}>{props.title}</p>
            {props.subtitle && <p style={{ margin: 0, fontSize: "12px" }}>{props.subtitle}</p>}
            {props.subtitleList &&
              props.subtitleList.map((text, i) => (
                <p key={i} style={{ margin: 0, fontSize: "12px" }}>
                  {text}
                </p>
              ))}
          </>
        }
        getPopupContainer={() => divRef.current ?? document.body}
      >
        {props.children}
      </Tooltip>
    </div>
  );
}

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
  canv: CanvasUIOverlay;
  /** Dataset to look up track and ID information in.
   * Changing this does NOT update the canvas dataset; do so
   * directly by calling `canv.setDataset()`.
   */
  dataset: Dataset | null;
  datasetKey: string | null;

  featureKey: string | null;
  /** Pan and zoom will be reset on collection change. */
  collection: Collection | null;
  config: ViewerConfig;
  updateConfig: (settings: Partial<ViewerConfig>) => void;
  vectorData: Float32Array | null;

  loading: boolean;
  loadingProgress: number | null;
  isRecording: boolean;

  selectedBackdropKey: string | null;

  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;

  annotationState: AnnotationState;

  selectedTrack: Track | null;
  categoricalColors: Color[];

  inRangeLUT?: Uint8Array;

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHover?: (id: number) => void;
  /** Called when the mouse exits the canvas. */
  onMouseLeave?: () => void;
  /** Called when the canvas is clicked; reports the track info of the clicked object. */
  onTrackClicked?: (track: Track | null) => void;

  showAlert?: (props: AlertBannerProps) => void;

  maxWidthPx?: number;
  maxHeightPx?: number;
};

const defaultProps: Partial<CanvasWrapperProps> = {
  onMouseHover() {},
  onMouseLeave() {},
  onTrackClicked: () => {},
  inRangeLUT: new Uint8Array(0),
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

  const containerRef = useRef<HTMLDivElement>(null);

  const canv = props.canv;
  const canvasPlaceholderRef = useRef<HTMLDivElement>(null);

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

  const [showMissingFileIcon, setShowMissingFileIcon] = useState(false);

  // CANVAS PROPERTIES /////////////////////////////////////////////////

  const onFrameChangedCallback = useCallback(
    (isMissing: boolean) => {
      setShowMissingFileIcon(isMissing);
      if (props.showAlert && isMissing) {
        props.showAlert({
          type: "warning",
          message: "Warning: One or more frames failed to load.",
          description: LoadTroubleshooting.CHECK_FILE_OR_NETWORK,
          showDoNotShowAgainCheckbox: true,
          closable: true,
        });
      }
    },
    [props.showAlert, setShowMissingFileIcon, canv]
  );

  canv.setOnFrameChangeCallback(onFrameChangedCallback);

  // Mount the canvas to the placeholder's location in the document.
  useEffect(() => {
    canvasPlaceholderRef.current?.parentNode?.replaceChild(canv.domElement, canvasPlaceholderRef.current);
  }, []);

  // These are all useMemo calls because the updates to the canvas must happen in the same render;
  // if these were useEffects, the canvas will lag behind updates since there is no state update to
  // trigger a re-render.

  // Update the theming of the canvas overlay.
  useMemo(() => {
    const defaultTheme = {
      fontSizePx: theme.font.size.label,
      fontColor: theme.color.text.primary,
      fontFamily: theme.font.family,
    };
    const sidebarTheme = {
      ...defaultTheme,
      stroke: theme.color.layout.borders,
      fill: theme.color.layout.background,
    };
    canv.updateScaleBarStyle(defaultTheme);
    canv.updateTimestampStyle(defaultTheme);
    canv.updateInsetBoxStyle({ stroke: theme.color.layout.borders });
    canv.updateLegendStyle(defaultTheme);
    canv.updateFooterStyle(sidebarTheme);
    canv.updateHeaderStyle(sidebarTheme);
    canv.setCanvasBackgroundColor(new Color(theme.color.viewport.background as ColorRepresentation));
  }, [theme]);

  // Update canvas color ramp
  useMemo(() => {
    canv.setColorRamp(props.colorRamp);
    canv.setColorMapRangeMin(props.colorRampMin);
    canv.setColorMapRangeMax(props.colorRampMax);
  }, [props.colorRamp, props.colorRampMin, props.colorRampMax]);

  // Update backdrops
  useMemo(() => {
    if (props.selectedBackdropKey !== null && props.config.backdropVisible) {
      canv.setBackdropKey(props.selectedBackdropKey);
      canv.setBackdropBrightness(props.config.backdropBrightness);
      canv.setBackdropSaturation(props.config.backdropSaturation);
      canv.setObjectOpacity(props.config.objectOpacity);
    } else {
      canv.setBackdropKey(null);
      canv.setObjectOpacity(100);
    }
  }, [
    props.selectedBackdropKey,
    props.config.backdropVisible,
    props.config.backdropBrightness,
    props.config.backdropSaturation,
    props.config.objectOpacity,
  ]);

  // Update categorical colors
  useMemo(() => {
    canv.setCategoricalColors(props.categoricalColors);
  }, [props.categoricalColors, props.dataset, props.featureKey]);

  // Update drawing modes for outliers + out of range values
  useMemo(() => {
    const settings = props.config.outOfRangeDrawSettings;
    canv.setOutOfRangeDrawMode(settings.mode, settings.color);
  }, [props.config.outOfRangeDrawSettings]);

  useMemo(() => {
    const settings = props.config.outlierDrawSettings;
    canv.setOutlierDrawMode(settings.mode, settings.color);
  }, [props.config.outlierDrawSettings]);

  useMemo(() => {
    canv.setInRangeLUT(props.inRangeLUT);
  }, [props.inRangeLUT]);

  // Updated track-related settings
  useMemo(() => {
    canv.setSelectedTrack(props.selectedTrack);
    canv.setShowTrackPath(props.config.showTrackPath);
  }, [props.selectedTrack, props.config.showTrackPath]);

  // Update overlay settings
  useMemo(() => {
    canv.isScaleBarVisible = props.config.showScaleBar;
  }, [props.config.showScaleBar]);

  useMemo(() => {
    canv.isTimestampVisible = props.config.showTimestamp;
  }, [props.config.showTimestamp]);

  useMemo(() => {
    canv.setCollection(props.collection);
  }, [props.collection]);

  useMemo(() => {
    canv.setDatasetKey(props.datasetKey);
  }, [props.datasetKey]);

  useMemo(() => {
    canv.setIsExporting(props.isRecording);
    canv.isHeaderVisibleOnExport = props.config.showHeaderDuringExport;
    canv.isFooterVisibleOnExport = props.config.showLegendDuringExport;
  }, [props.config.showLegendDuringExport, props.isRecording]);

  useMemo(() => {
    canv.setVectorFieldConfig(props.config.vectorConfig);
  }, [props.config.vectorConfig]);

  useMemo(() => {
    canv.setVectorData(props.vectorData);
  }, [props.vectorData]);

  useMemo(() => {
    canv.setOutlineColor(props.config.outlineColor);
  }, [props.config.outlineColor]);

  useMemo(() => {
    const annotationLabels = props.annotationState.data.getLabels();
    const timeToAnnotationLabelIds = props.dataset
      ? props.annotationState.data.getTimeToLabelIdMap(props.dataset)
      : new Map();
    canv.setAnnotationData(annotationLabels, timeToAnnotationLabelIds, props.annotationState.currentLabelIdx);
    canv.isAnnotationVisible = props.annotationState.visible;
  }, [props.dataset, props.annotationState.data, props.annotationState.currentLabelIdx, props.annotationState.visible]);

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
      canv.setSize(canvasSizePx.x, canvasSizePx.y);
    };
    updateCanvasDimensions(); // Initial size setting

    const handleResize = (): void => {
      updateCanvasDimensions();
      canv.render();
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
    canv.setZoom(1.0);
    canv.setPan(0, 0);
  }, [props.collection]);

  /** Report clicked tracks via the passed callback. */
  const handleTrackSelection = useCallback(
    async (event: MouseEvent): Promise<void> => {
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      // Reset track input
      if (id < 0 || props.dataset === null) {
        props.onTrackClicked(null);
      } else {
        const trackId = props.dataset.getTrackId(id);
        const newTrack = props.dataset.getTrack(trackId);
        props.onTrackClicked(newTrack);
      }
    },
    [canv, props.dataset, props.onTrackClicked]
  );

  /**
   * Returns the full size of the frame in screen pixels, including offscreen pixels.
   */
  const getFrameSizeInScreenPx = useCallback((): Vector2 => {
    const canvasSizePx = getCanvasSizePx();
    const frameResolution = props.dataset ? props.dataset.frameResolution : canvasSizePx;
    const canvasZoom = 1 / canvasZoomInverse.current;
    return mathUtils.getFrameSizeInScreenPx(canvasSizePx, frameResolution, canvasZoom);
  }, [props.dataset?.frameResolution, getCanvasSizePx]);

  /** Change zoom by some delta factor. */
  const handleZoom = useCallback(
    (zoomDelta: number): void => {
      canvasZoomInverse.current += zoomDelta;
      canvasZoomInverse.current = clamp(canvasZoomInverse.current, MIN_INVERSE_ZOOM, MAX_INVERSE_ZOOM);
      canv.setZoom(1 / canvasZoomInverse.current);
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

      canv.setPan(canvasPanOffset.current.x, canvasPanOffset.current.y);
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
      canv.setPan(canvasPanOffset.current.x, canvasPanOffset.current.y);
    },
    [canv, getCanvasSizePx, props.dataset]
  );

  // Mouse event handlers

  const onMouseClick = useCallback(
    (event: MouseEvent): void => {
      // Note that click events won't fire until the mouse is released. We need
      // to check if the mouse was dragged before treating the click as a track
      // selection; otherwise the track selection gets changed unexpectedly.
      if (!isMouseDragging.current) {
        handleTrackSelection(event);
      }
    },
    [handleTrackSelection]
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
      if (!props.dataset) {
        return;
      }
      const id = canv.getIdAtPixel(x, y);
      props.onMouseHover(id);
    },
    [props.dataset, canv]
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
  }, [canv.getCurrentFrame()]);

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
  }, [props.dataset, canv]);

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
    props.updateConfig({ openTab: TabType.SETTINGS });
  };

  const onAnnotationLinkClicked = (): void => {
    props.updateConfig({ openTab: TabType.ANNOTATION });
  };

  const backdropTooltipContents: ReactNode[] = [];
  backdropTooltipContents.push(
    <span key="backdrop-name">
      {props.selectedBackdropKey === null
        ? "(No backdrops available)"
        : props.dataset?.getBackdropData().get(props.selectedBackdropKey)?.name}
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
    <CanvasContainer ref={containerRef} $annotationModeEnabled={props.annotationState.isAnnotationModeEnabled}>
      {props.annotationState.isAnnotationModeEnabled && (
        <AnnotationModeContainer>Annotation editing in progress...</AnnotationModeContainer>
      )}
      <LoadingSpinner loading={props.loading} progress={props.loadingProgress}>
        <div ref={canvasPlaceholderRef}></div>
      </LoadingSpinner>
      <MissingFileIconContainer style={{ visibility: showMissingFileIcon ? "visible" : "hidden" }}>
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
              canv.setZoom(1.0);
              canv.setPan(0, 0);
            }}
            type="link"
          >
            <HomeOutlined />
            <VisuallyHidden>Reset view</VisuallyHidden>
          </IconButton>
        </Tooltip>
        <TooltipWithSubtext title={"Zoom in"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
          <IconButton
            type="link"
            onClick={() => {
              handleZoom(-0.25);
            }}
          >
            <ZoomInOutlined />
            <VisuallyHidden>Zoom in</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtext>
        <TooltipWithSubtext title={"Zoom out"} subtitle="Ctrl + Scroll" placement="right" trigger={["hover", "focus"]}>
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
        </TooltipWithSubtext>

        {/* Backdrop toggle */}
        <TooltipWithSubtext
          title={props.config.backdropVisible ? "Hide backdrop" : "Show backdrop"}
          placement="right"
          subtitleList={backdropTooltipContents}
          trigger={["hover", "focus"]}
        >
          <IconButton
            type={props.config.backdropVisible ? "primary" : "link"}
            onClick={() => {
              props.updateConfig({ backdropVisible: !props.config.backdropVisible });
            }}
            disabled={props.selectedBackdropKey === null}
          >
            {props.config.backdropVisible ? <ImagesSlashIconSVG /> : <ImagesIconSVG />}
            <VisuallyHidden>{props.config.backdropVisible ? "Hide backdrop" : "Show backdrop"}</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtext>

        {/* Annotation mode toggle */}
        {INTERNAL_BUILD && (
          <TooltipWithSubtext
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
          </TooltipWithSubtext>
        )}
      </CanvasControlsContainer>
    </CanvasContainer>
  );
}
