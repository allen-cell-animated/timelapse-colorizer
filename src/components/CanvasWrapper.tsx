import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation, Vector2 } from "three";
import { clamp } from "three/src/math/MathUtils";

import { HandIconSVG, NoImageSVG } from "../assets";
import { ColorizeCanvas, ColorRamp, Dataset, Track } from "../colorizer";
import { ViewerConfig } from "../colorizer/types";
import { FlexColumn, FlexColumnAlignCenter, VisuallyHidden } from "../styles/utils";

import Collection from "../colorizer/Collection";
import { AppThemeContext } from "./AppStyle";
import { AlertBannerProps } from "./Banner";
import IconButton from "./IconButton";

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

type CanvasWrapperProps = {
  canv: ColorizeCanvas;
  /** Dataset to look up track and ID information in.
   * Changing this does NOT update the canvas dataset; do so
   * directly by calling `canv.setDataset()`.
   */
  dataset: Dataset | null;
  /** Pan and zoom will be reset on collection change. */
  collection: Collection | null;
  config: ViewerConfig;

  selectedBackdropKey: string | null;

  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;

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
  const canvasRef = useRef<HTMLDivElement>(null);

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
  const canvasPanOffset = useRef([0, 0]);
  const isMouseLeftDown = useRef(false);
  const isMouseMiddleDown = useRef(false);
  const isMouseRightDown = useRef(false);
  /**
   * Turns on if the mouse has moved more than MIN_DRAG_THRESHOLD_PX in X or Y after initial click;
   * turns off when mouse is released. Used to determine whether to pan the canvas or treat
   * the click as a track selection/regular click.
   */
  const isMouseDragging = useRef(false);
  const totalMouseDrag = useRef([0, 0]);
  const [enablePan, setEnablePan] = useState(false);

  const isMouseOverCanvas = useRef(false);
  const lastMousePositionPx = useRef([0, 0]);
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
          description:
            "Check your network connection and access to the dataset path, or use the browser console to view details. Otherwise, contact the dataset creator as there may be missing files.",
          showDoNotShowAgainCheckbox: true,
          closable: true,
        });
      }
    },
    [props.showAlert, setShowMissingFileIcon, canv]
  );

  canv.setOnFrameChangeCallback(onFrameChangedCallback);

  // Mount the canvas to the wrapper's location in the document.
  useEffect(() => {
    canvasRef.current?.parentNode?.replaceChild(canv.domElement, canvasRef.current);
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
    canv.overlay.updateScaleBarOptions(defaultTheme);
    canv.overlay.updateTimestampOptions(defaultTheme);
    canv.overlay.updateBackgroundOptions({ stroke: theme.color.layout.borders });
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
    canv.setBackdropKey(props.selectedBackdropKey);
    canv.setBackdropBrightness(props.config.backdropBrightness);
    canv.setBackdropSaturation(props.config.backdropSaturation);
  }, [props.selectedBackdropKey, props.config.backdropBrightness, props.config.backdropSaturation]);

  // Update categorical colors
  useMemo(() => {
    canv.setCategoricalColors(props.categoricalColors);
  }, [props.categoricalColors]);

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
    canv.setObjectOpacity(props.config.objectOpacity);
  }, [props.config.objectOpacity]);

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
    canv.setScaleBarVisibility(props.config.showScaleBar);
  }, [props.config.showScaleBar]);

  useMemo(() => {
    canv.setTimestampVisibility(props.config.showTimestamp);
  }, [props.config.showTimestamp]);

  // CANVAS RESIZING /////////////////////////////////////////////////

  /**
   * Returns the current width of the canvas component, constrained by
   * resizing rules while maintaining the aspect ratio.
   */
  const getCanvasSizePx = useCallback((): [number, number] => {
    const widthPx = Math.min(
      containerRef.current?.clientWidth ?? props.maxWidthPx,
      props.maxWidthPx,
      props.maxHeightPx * ASPECT_RATIO
    );
    return [Math.floor(widthPx), Math.floor(widthPx / ASPECT_RATIO)];
  }, [props.maxHeightPx, props.maxWidthPx]);

  // Respond to window resizing
  useEffect(() => {
    /**
     * Update the canvas dimensions based on the current window size.
     * TODO: Margin calculation?
     */
    const setSize = (): void => {
      // TODO: Potentially unsafe calculation here when using `window.innerWidth`. If close to the breakpoint where the side
      // panel gets wrapped to below the canvas, the scrollbar added to account for the increased page height
      // will cause this calculation to change (window.innerWidth will become smaller by ~15 pixels).
      // Under certain circumstances, this can cause a flickering effect as the canvas resizes to accommodate the scrollbar,
      // which causes the page to shrink, which causes the scrollbar to disappear, and so on in a loop.
      // I've fixed this for now by setting the breakpoint to 1250 pixels, but it's not a robust solution.

      // TODO: Calculate aspect ratio based on the current frame?
      const [widthPx, heightPx] = getCanvasSizePx();
      canv.setSize(widthPx, heightPx);
    };

    const handleResize = (): void => {
      setSize();
      canv.render();
    };

    setSize(); // Initial size setting
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canv, getCanvasSizePx]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

  // Reset the canvas zoom + pan when the collection changes
  useEffect(() => {
    canvasZoomInverse.current = 1.0;
    canvasPanOffset.current = [0, 0];
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
        const newTrack = props.dataset.buildTrack(trackId);
        props.onTrackClicked(newTrack);
      }
    },
    [canv, props.dataset]
  );

  /**
   * Returns the full size of the frame in screen pixels.
   * This is the full frame dimensions, not limited to what is shown
   * onscreen within the canvas.
   */
  const getFrameSizeInScreenPx = useCallback((): [number, number] => {
    const [canvasWidthPx, canvasHeightPx] = getCanvasSizePx();

    const frameBaseWidthPx = props.dataset?.frameResolution.x ?? canvasWidthPx;
    const frameBaseHeightPx = props.dataset?.frameResolution.y ?? canvasHeightPx;
    const frameBaseAspectRatio = frameBaseWidthPx / frameBaseHeightPx;

    // Calculate onscreen frame size in pixels by finding largest size it can be while fitting in
    // the canvas aspect ratio.
    const frameOnscreenWidthPx = Math.min(canvasWidthPx, canvasHeightPx * frameBaseAspectRatio);
    const frameOnscreenHeightPx = frameOnscreenWidthPx / frameBaseAspectRatio;

    // Scale with current zoom level
    return [frameOnscreenWidthPx / canvasZoomInverse.current, frameOnscreenHeightPx / canvasZoomInverse.current];
  }, [props.dataset?.frameResolution, getCanvasSizePx]);

  /**
   * Converts a pixel offset relative to the canvas to relative frame coordinates.
   * @param canvasOffsetPx Offset in pixels relative to the canvas.
   *
   * @returns Offset in frame coordinates, normalized to the size of the frame. [0, 0] is the center
   * of the frame, and [-0.5, -0.5] is the top left corner.
   */
  const convertCanvasOffsetPxToFrameCoords = useCallback(
    (canvasOffsetPx: [number, number]) => {
      const [canvasWidthPx, canvasHeightPx] = getCanvasSizePx();
      const frameSizeScreenPx = getFrameSizeInScreenPx();

      // Change the offset to be relative to the center of the canvas, rather than the top left corner.
      const offsetFromCenter: [number, number] = [
        canvasOffsetPx[0] - canvasWidthPx / 2,
        canvasOffsetPx[1] - canvasHeightPx / 2,
      ];
      // Get the point in pixel coordinates relative to the frame
      return [
        offsetFromCenter[0] / frameSizeScreenPx[0] - canvasPanOffset.current[0],
        offsetFromCenter[1] / frameSizeScreenPx[1] - canvasPanOffset.current[1],
      ];
    },
    // TODO: Refactor into its own testable module
    [getCanvasSizePx, getFrameSizeInScreenPx]
  );

  const handleZoom = useCallback(
    (zoomDelta: number): void => {
      // TODO: Invert zoom direction so that zooming in is > 1 and zooming out is < 1
      canvasZoomInverse.current += zoomDelta;
      // Clamp zoom
      canvasZoomInverse.current = clamp(canvasZoomInverse.current, MIN_INVERSE_ZOOM, MAX_INVERSE_ZOOM);
      canv.setZoom(1 / canvasZoomInverse.current);
    },
    [canv]
  );

  const handleWheelZoom = useCallback(
    (event: WheelEvent, zoomDelta: number): void => {
      // Get the current mouse position in frame coordinates; we will change the pan later so the
      // mouse position remains the same after zooming.
      const currentMousePosition = convertCanvasOffsetPxToFrameCoords([event.offsetX, event.offsetY]);

      handleZoom(zoomDelta);

      // Calculate new position of the mouse in the new frame coordinates
      const newMousePosition = convertCanvasOffsetPxToFrameCoords([event.offsetX, event.offsetY]);
      const mousePositionDelta = [
        currentMousePosition[0] - newMousePosition[0],
        currentMousePosition[1] - newMousePosition[1],
      ];

      canvasPanOffset.current[0] = clamp(canvasPanOffset.current[0] - mousePositionDelta[0], -0.5, 0.5);
      canvasPanOffset.current[1] = clamp(canvasPanOffset.current[1] + mousePositionDelta[1], -0.5, 0.5);

      canv.setPan(canvasPanOffset.current[0], canvasPanOffset.current[1]);
      // TODO: Add clamping
    },
    [handleZoom, convertCanvasOffsetPxToFrameCoords]
  );

  const handlePan = useCallback(
    (dx: number, dy: number): void => {
      const [frameOnscreenWidthPx, frameOnscreenHeightPx] = getFrameSizeInScreenPx();
      // Normalize dx/dy (change in pixels) to change in frame coordinates
      canvasPanOffset.current[0] += dx / frameOnscreenWidthPx;
      canvasPanOffset.current[1] += -dy / frameOnscreenHeightPx;
      // Clamp panning
      canvasPanOffset.current[0] = Math.min(0.5, Math.max(-0.5, canvasPanOffset.current[0]));
      canvasPanOffset.current[1] = Math.min(0.5, Math.max(-0.5, canvasPanOffset.current[1]));
      canv.setPan(canvasPanOffset.current[0], canvasPanOffset.current[1]);
    },
    [canv, getCanvasSizePx, props.dataset]
  );

  // Mouse event handlers

  const onMouseClick = useCallback(
    (event: MouseEvent): void => {
      // Note that click events won't fire until the mouse is released. We need to check
      // if the mouse was dragged before treating the click as a track selection; otherwise
      // the track selection gets changed unexpectedly.
      if (!isMouseDragging.current && !enablePan) {
        handleTrackSelection(event);
      }
      if (isMouseRightDown && isMouseDragging) {
        // Prevent context menu from appearing when view was dragged via right click
        event.preventDefault();
      }
    },
    [handleTrackSelection, enablePan]
  );

  const onContextMenu = useCallback((event: MouseEvent): void => {
    if (isMouseDragging.current) {
      event.preventDefault();
    }
  }, []);

  const onMouseDown = useCallback((event: MouseEvent): void => {
    // Prevent text selection
    event.preventDefault();
    isMouseDragging.current = false;

    if (event.button === MIDDLE_CLICK_BUTTON) {
      isMouseMiddleDown.current = true;
    } else if (event.button === LEFT_CLICK_BUTTON) {
      isMouseLeftDown.current = true;
    } else if (event.button === RIGHT_CLICK_BUTTON) {
      isMouseRightDown.current = true;
    }

    totalMouseDrag.current = [0, 0];
  }, []);

  const onMouseMove = useCallback(
    // TODO: Change the cursor in response to the ctrl key being held or not
    (event: MouseEvent): void => {
      const isMouseLeftHeldWithModifier = isMouseLeftDown.current && (event.ctrlKey || event.metaKey || enablePan);
      if (isMouseLeftHeldWithModifier || isMouseMiddleDown.current || isMouseRightDown.current) {
        canv.domElement.style.cursor = "grabbing";
        handlePan(event.movementX, event.movementY);
        // Add to total drag distance; if it exceeds threshold, consider the mouse interaction
        // to be a drag and disable track selection.
        totalMouseDrag.current[0] += Math.abs(event.movementX);
        totalMouseDrag.current[1] += Math.abs(event.movementY);
        if (
          !isMouseDragging.current &&
          new Vector2(totalMouseDrag.current[0], totalMouseDrag.current[1]).length() > MIN_DRAG_THRESHOLD_PX
        ) {
          isMouseDragging.current = true;
        }
      } else {
        // TODO: Centralized cursor handling?
        if (enablePan) {
          canv.domElement.style.cursor = "grab";
        } else {
          canv.domElement.style.cursor = "auto";
        }
      }
    },
    [handlePan, enablePan]
  );

  const onMouseUp = useCallback((_event: MouseEvent): void => {
    // Reset any mouse tracking state
    if (isMouseLeftDown.current) {
      isMouseLeftDown.current = false;
    }
    if (isMouseMiddleDown.current) {
      isMouseMiddleDown.current = false;
    }
    if (isMouseRightDown.current) {
      isMouseRightDown.current = false;
    }
    setTimeout(() => {
      // Make sure that click event is processed first before resetting dragging state
      isMouseDragging.current = false;
    }, 10);
  }, []);

  const onMouseWheel = useCallback(
    (event: WheelEvent): void => {
      event.preventDefault();
      // TODO: Does this behave weirdly with different zoom/scroll wheel sensitivities?
      const delta = event.deltaY / 1000;
      handleWheelZoom(event, delta);
    },
    [handleWheelZoom]
  );

  // Mount the event listeners
  // Technically it's more performant to separate these into individual useEffects, but
  // this is much more readable.
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

  /** Track whether the canvas is hovered, so we can determine whether to send updates about the
   * hovered value wwhen the canvas frame updates.
   */
  useEffect(() => {
    canv.domElement.addEventListener("mouseenter", () => (isMouseOverCanvas.current = true));
    canv.domElement.addEventListener("mouseleave", () => (isMouseOverCanvas.current = false));
  });

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

  /** Update hovered id when the canvas updates the current frame */
  useEffect(() => {
    if (isMouseOverCanvas.current) {
      reportHoveredIdAtPixel(lastMousePositionPx.current[0], lastMousePositionPx.current[1]);
    }
  }, [canv.getCurrentFrame()]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      reportHoveredIdAtPixel(event.offsetX, event.offsetY);
      lastMousePositionPx.current = [event.offsetX, event.offsetY];
    };

    canv.domElement.addEventListener("mousemove", onMouseMove);
    canv.domElement.addEventListener("mouseleave", props.onMouseLeave);
    return () => {
      canv.domElement.removeEventListener("mousemove", onMouseMove);
      canv.domElement.removeEventListener("mouseleave", props.onMouseLeave);
    };
  }, [props.dataset, canv]);

  // RENDERING /////////////////////////////////////////////////

  const makeTitleWithSubtext = (title: string | ReactElement, subtext: string | ReactElement): ReactElement => {
    return (
      <>
        <p style={{ margin: 0 }}>{title}</p>
        <p style={{ margin: 0, fontSize: "12px" }}>{subtext}</p>
      </>
    );
  };

  canv.render();
  return (
    <FlexColumnAlignCenter
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: theme.color.viewport.background,
      }}
      ref={containerRef}
    >
      <div ref={canvasRef}></div>
      <MissingFileIconContainer style={{ visibility: showMissingFileIcon ? "visible" : "hidden" }}>
        <NoImageSVG aria-labelledby="no-image" style={{ width: "50px" }} />
        <p id="no-image">
          <b>Missing image data</b>
        </p>
      </MissingFileIconContainer>
      <CanvasControlsContainer $gap={4}>
        <Tooltip title={"Reset view"} placement="right" trigger={["hover", "focus"]}>
          <IconButton
            onClick={() => {
              canvasZoomInverse.current = 1.0;
              canvasPanOffset.current = [0, 0];
              canv.setZoom(1.0);
              canv.setPan(0, 0);
            }}
            type="link"
          >
            <HomeOutlined />
            <VisuallyHidden>Reset view</VisuallyHidden>
          </IconButton>
        </Tooltip>
        <Tooltip title={makeTitleWithSubtext("Zoom in", "Scroll")} placement="right" trigger={["hover", "focus"]}>
          <IconButton
            type="link"
            onClick={() => {
              handleZoom(-0.25);
            }}
          >
            <ZoomInOutlined />
            <VisuallyHidden>Zoom in</VisuallyHidden>
          </IconButton>
        </Tooltip>
        <Tooltip title={makeTitleWithSubtext("Zoom out", "Scroll")} placement="right" trigger={["hover", "focus"]}>
          <IconButton
            type="link"
            onClick={() => {
              // Little hack because the minimum zoom level is 0.1x, but all the other zoom levels
              // are in increments of 0.25x.
              handleZoom(canvasZoomInverse.current === MIN_INVERSE_ZOOM ? 0.15 : 0.25);
            }}
          >
            <ZoomOutOutlined />
            <VisuallyHidden>Zoom out</VisuallyHidden>
          </IconButton>
        </Tooltip>
        <Tooltip
          title={makeTitleWithSubtext("Pan", "Right click + drag")}
          placement="right"
          trigger={["hover", "focus"]}
        >
          <IconButton
            type={enablePan ? "primary" : "link"}
            onClick={() => {
              setTimeout(() => {
                setEnablePan(!enablePan);
              });
            }}
          >
            <HandIconSVG />
            <VisuallyHidden>Toggle pan (currently {enablePan ? "ON" : "OFF"}.)</VisuallyHidden>
          </IconButton>
        </Tooltip>
      </CanvasControlsContainer>
    </FlexColumnAlignCenter>
  );
}
