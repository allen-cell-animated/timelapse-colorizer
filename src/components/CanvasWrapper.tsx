import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation, Vector2 } from "three";

import { NoImageSVG } from "../assets";
import { ColorizeCanvas, ColorRamp, Dataset, Track } from "../colorizer";
import { ViewerConfig } from "../colorizer/types";
import { FlexColumn, FlexColumnAlignCenter } from "../styles/utils";

import { AppThemeContext } from "./AppStyle";
import { AlertBannerProps } from "./Banner";
import IconButton from "./IconButton";

const ASPECT_RATIO = 14 / 10;
/* Minimum distance in either X or Y that mouse should move
 * before mouse event is considered a drag
 */
const MIN_DRAG_THRESHOLD_PX = 5;

const CanvasControlsContainer = styled(FlexColumn)`
  position: absolute;
  top: 5px;
  right: 5px;
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

  const canvasZoom = useRef(1.0);
  const canvasPan = useRef([0, 0]);
  const isMouseDown = useRef(false);
  // Turns on if the mouse has moved more than MIN_DRAG_THRESHOLD_PX after initial click;
  // turns off when mouse is released. Used to determine whether to pan the canvas or treat
  // the click as a track selection.
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

  const calculateCanvasWidthPx = useCallback((): number => {
    return Math.min(
      containerRef.current?.clientWidth ?? props.maxWidthPx,
      props.maxWidthPx,
      props.maxHeightPx * ASPECT_RATIO
    );
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
      const width = calculateCanvasWidthPx();
      const height = Math.floor(width / ASPECT_RATIO);
      canv.setSize(width, height);
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
  }, [canv]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

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

  const handleZoom = useCallback(
    (zoomDelta: number): void => {
      // TODO: Move canvas center point towards mouse position on zoom
      // TODO: Invert zoom direction so that zooming in is positive
      canvasZoom.current += zoomDelta;
      // Clamp zoom
      canvasZoom.current = Math.min(2, Math.max(0.1, canvasZoom.current));
      canv.setZoom(canvasZoom.current);
    },
    [canv]
  );

  const handlePan = useCallback(
    (dx: number, dy: number): void => {
      // Normalize by zoom and canvas size
      // Convert from screen pixels to normalized, relative canvas coordinates ([-1, 1] or [0, 1]).
      const canvasWidthPixels = calculateCanvasWidthPx();
      const canvasHeightPixels = canvasWidthPixels / ASPECT_RATIO;

      canvasPan.current[0] += (dx / canvasWidthPixels) * canvasZoom.current;
      canvasPan.current[1] += (-dy / canvasHeightPixels) * canvasZoom.current;
      // Clamp panning
      canvasPan.current[0] = Math.min(0.5, Math.max(-0.5, canvasPan.current[0]));
      canvasPan.current[1] = Math.min(0.5, Math.max(-0.5, canvasPan.current[1]));
      canv.setPan(canvasPan.current[0], canvasPan.current[1]);
    },
    [canv, calculateCanvasWidthPx]
  );

  // Mouse event handlers

  const onMouseClick = useCallback(
    (event: MouseEvent): void => {
      // Note that click events won't fire until the mouse is released. We need to check
      // if the mouse was dragged before treating the click as a track selection; otherwise
      // the track selection gets changed unexpectedly.
      if (!isMouseDragging.current) {
        handleTrackSelection(event);
      }
    },
    [handleTrackSelection]
  );

  const onMouseDown = useCallback((event: MouseEvent): void => {
    // Prevent text selection
    event.preventDefault();
    isMouseDragging.current = false;
    isMouseDown.current = true;
    totalMouseDrag.current = [0, 0];
  }, []);

  const onMouseMove = useCallback(
    // TODO: Change the cursor in response to the ctrl key being held or not
    (event: MouseEvent): void => {
      if (isMouseDown.current && (event.ctrlKey || enablePan)) {
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
    isMouseDown.current = false;
    setTimeout(() => {
      // Make sure that click event is processed first before resetting dragging state
      isMouseDragging.current = false;
    }, 10);
  }, []);

  const onMouseWheel = useCallback(
    (event: WheelEvent): void => {
      if (event.ctrlKey) {
        event.preventDefault();
        // TODO: Does this behave weirdly with different zoom/scroll wheel sensitivities?
        const delta = event.deltaY / 1000;
        handleZoom(delta);
      }
    },
    [handleZoom]
  );

  // Mount the event listeners
  // Technically it's more performant to separate these into individual useEffects, but
  // this is much more readable.
  useEffect(() => {
    canv.domElement.addEventListener("click", onMouseClick);
    canv.domElement.addEventListener("wheel", onMouseWheel);
    canv.domElement.addEventListener("mousedown", onMouseDown);
    // Listen for mouseup and mousemove events anywhere
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      canv.domElement.removeEventListener("click", onMouseClick);
      canv.domElement.removeEventListener("wheel", onMouseWheel);
      canv.domElement.removeEventListener("mousedown", onMouseDown);
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
      <p>Zoom: {canvasZoom.current}</p>
      <CanvasControlsContainer $gap={4}>
        <Tooltip title={"Reset view"} placement="right">
          <IconButton
            onClick={() => {
              canvasZoom.current = 1.0;
              canvasPan.current = [0, 0];
              canv.setZoom(1.0);
              canv.setPan(0, 0);
            }}
            type="outlined"
          >
            <HomeOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Zoom in (Ctrl + Scroll)"} placement="right">
          <IconButton
            type="outlined"
            onClick={() => {
              handleZoom(-0.25);
            }}
          >
            <ZoomInOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Zoom out (Ctrl + Scroll)"} placement="right">
          <IconButton
            type="outlined"
            onClick={() => {
              handleZoom(0.25);
            }}
          >
            <ZoomOutOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Pan (Ctrl + Drag)"} placement="right">
          <IconButton
            type={enablePan ? "primary" : "outlined"}
            onClick={() => {
              setEnablePan(!enablePan);
            }}
          >
            ✋
          </IconButton>
        </Tooltip>
      </CanvasControlsContainer>
    </FlexColumnAlignCenter>
  );
}
