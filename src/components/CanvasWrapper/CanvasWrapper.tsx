import { HomeOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import React, {
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Vector2 } from "three";

import { NoImageSVG, TagIconSVG, TagSlashIconSVG } from "src/assets";
import type { Dataset } from "src/colorizer";
import { type LabelData, LabelType } from "src/colorizer/AnnotationData";
import {
  AnnotationSelectionMode,
  type ChannelRangePreset,
  LoadTroubleshooting,
  type PixelIdInfo,
  TabType,
} from "src/colorizer/types";
import type CanvasOverlay from "src/colorizer/viewport/CanvasOverlay";
import type { AlertBannerProps } from "src/components/Banner";
import IconButton from "src/components/Buttons/IconButton";
import TooltipButtonStyleLink from "src/components/Buttons/TooltipButtonStyleLink";
import ShortcutKeyList from "src/components/Display/ShortcutKeyList";
import LoadingSpinner from "src/components/LoadingSpinner";
import AnnotationInputPopover from "src/components/Tabs/Annotation/AnnotationInputPopover";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import { CANVAS_ASPECT_RATIO, SHORTCUT_KEYS } from "src/constants";
import type { AnnotationState } from "src/hooks";
import { renderCanvasStateParamsSelector } from "src/state";
import { useViewerStateStore } from "src/state/ViewerState";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn, FlexColumnAlignCenter, VisuallyHidden } from "src/styles/utils";
import { areAnyHotkeysPressed } from "src/utils/user_input";

import BackdropToggleButton from "./BackdropToggleButton";
import ChannelToggleButton from "./ChannelToggleButton";

/* Minimum distance in either X or Y that mouse should move
 * before mouse event is considered a drag
 */
const MIN_DRAG_THRESHOLD_PX = 5;
const LEFT_CLICK_BUTTON = 0;
const MIDDLE_CLICK_BUTTON = 1;
const RIGHT_CLICK_BUTTON = 2;

const CanvasContainer = styled(FlexColumnAlignCenter)<{ $annotationModeEnabled: boolean }>`
  position: relative;
  background-color: var(--color-viewport-background);

  outline: 1px solid
    ${(props) => (props.$annotationModeEnabled ? "var(--color-viewport-annotation-outline)" : "transparent")};
  box-shadow: 0 0 8px 2px
    ${(props) => (props.$annotationModeEnabled ? "var(--color-viewport-annotation-outline)" : "transparent")};
  border: 1px solid var(--color-borders);

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

const AnnotationModeContainer = styled(FlexColumn)`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  pointer-events: none;
`;

type CanvasWrapperProps = {
  canv: CanvasOverlay;

  loading: boolean;
  loadingProgress: number | null;
  isRecording: boolean;

  annotationState: AnnotationState;

  onClickId?: (info: PixelIdInfo | null) => void;

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHover?: (info: PixelIdInfo | null) => void;
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
  const theme = useContext(AppThemeContext);

  // Access state properties
  const pendingFrame = useViewerStateStore((state) => state.pendingFrame);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const collection = useViewerStateStore((state) => state.collection);
  const dataset = useViewerStateStore((state) => state.dataset);
  const updateChannelSettings = useViewerStateStore((state) => state.updateChannelSettings);
  const setGetChannelDataRangeCallback = useViewerStateStore((state) => state.setGetChannelDataRangeCallback);
  const setApplyChannelRangePresetCallback = useViewerStateStore((state) => state.setApplyChannelRangePresetCallback);
  const setOpenTab = useViewerStateStore((state) => state.setOpenTab);
  const clearTracks = useViewerStateStore((state) => state.clearTracks);
  const addTracks = useViewerStateStore((state) => state.addTracks);
  const toggleTrack = useViewerStateStore((state) => state.toggleTrack);
  const showScaleBar = useViewerStateStore((state) => state.showScaleBar);
  const showTimestamp = useViewerStateStore((state) => state.showTimestamp);
  const frameLoadResult = useViewerStateStore((state) => state.frameLoadResult);

  const containerRef = useRef<HTMLDivElement>(null);

  const canv = props.canv;
  const canvasPlaceholderRef = useRef<HTMLDivElement>(null);

  const [lastClickPosition, setLastClickPosition] = useState<[number, number]>([0, 0]);

  const isFrameLoading = pendingFrame !== currentFrame;
  const loadProgress = props.loading ? props.loadingProgress : null;

  // Add subscriber so canvas parameters are updated when the state changes.
  useEffect(() => {
    return useViewerStateStore.subscribe(renderCanvasStateParamsSelector, (params) => {
      canv.setParams(params);
    });
  }, []);

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

  const isMissingFile = frameLoadResult !== null && (frameLoadResult.frameError || frameLoadResult.backdropError);

  // TODO: This should be a property in state and not derived here and in CanvasOverlay.
  const isDataset3d = dataset?.frames3d !== undefined;

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
  }, [theme]);

  // Update overlay settings
  useMemo(() => {
    canv.isScaleBarVisible = showScaleBar;
  }, [showScaleBar]);

  useMemo(() => {
    canv.isTimestampVisible = showTimestamp;
  }, [showTimestamp]);

  useMemo(() => {
    // TODO: This should be handled in state.
    canv.setIsExporting(props.isRecording);
  }, [props.isRecording]);

  useMemo(() => {
    const annotationLabels = props.annotationState.data.getLabels();
    const timeToAnnotationLabelIds = dataset ? props.annotationState.data.getTimeToLabelIdMap(dataset) : new Map();
    canv.isAnnotationVisible = props.annotationState.visible;
    canv.setAnnotationData(
      annotationLabels,
      timeToAnnotationLabelIds,
      props.annotationState.currentLabelIdx,
      props.annotationState.rangeStartId
    );
  }, [
    dataset,
    props.annotationState.data,
    props.annotationState.rangeStartId,
    props.annotationState.currentLabelIdx,
    props.annotationState.visible,
  ]);

  // 3D CALLBACKS /////////////////////////////////////////////////

  useEffect(() => {
    const getBackdropChannelRangePreset = canv.getBackdropChannelRangePreset.bind(canv);
    setApplyChannelRangePresetCallback((channelIndex: number, preset: ChannelRangePreset) => {
      const range = getBackdropChannelRangePreset(channelIndex, preset);
      if (range) {
        updateChannelSettings(channelIndex, { min: range[0], max: range[1] });
      }
    });
  }, [canv, setApplyChannelRangePresetCallback, updateChannelSettings]);

  useEffect(() => {
    const boundGetBackdropChannelDataRange = canv.getBackdropChannelDataRange.bind(canv);
    setGetChannelDataRangeCallback(boundGetBackdropChannelDataRange);
  }, [canv, setGetChannelDataRangeCallback, updateChannelSettings]);

  // CANVAS RESIZING /////////////////////////////////////////////////

  /**
   * Measures the current width of the canvas component, constraining it by
   * the maximum width and height props while maintaining the aspect ratio.
   */
  const getCanvasSizePx = useCallback((): Vector2 => {
    const widthPx = Math.min(
      containerRef.current?.clientWidth ?? props.maxWidthPx,
      props.maxWidthPx,
      props.maxHeightPx * CANVAS_ASPECT_RATIO
    ); // Subtract 2px for borders
    return new Vector2(Math.floor(widthPx), Math.floor(widthPx / CANVAS_ASPECT_RATIO));
  }, [props.maxHeightPx, props.maxWidthPx]);

  // Respond to window resizing
  useEffect(() => {
    const updateCanvasDimensions = (): void => {
      if (props.isRecording) {
        // Do not resize during recordings.
        return;
      }
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
  }, [canv, getCanvasSizePx, props.isRecording]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

  // Reset the canvas views when the collection changes
  useEffect(() => {
    canv.resetView();
  }, [collection]);

  /**
   * Updates the canvas' cursor type based on panning and annotation editing
   * modes. Should be called after click interactions and mouse movement.
   */
  const updateCanvasCursor = useCallback(
    (offsetX: number, offsetY: number): void => {
      if (isMouseDragging.current) {
        canv.domElement.style.cursor = "move";
      } else if (props.annotationState.isAnnotationModeEnabled) {
        // Check if mouse is over an object, and if it's labeled with an editable label.
        // If so, show the edit cursor.
        const labelIdx = props.annotationState.currentLabelIdx;
        if (labelIdx !== null) {
          const labelData = props.annotationState.data.getLabels()[labelIdx];
          if (labelData.options.type !== LabelType.BOOLEAN) {
            const id = canv.getIdAtPixel(offsetX, offsetY);
            if (id !== null && id.globalId !== undefined && labelData.ids.has(id.globalId)) {
              canv.domElement.style.cursor = "text";
              return;
            }
          }
        }

        if (props.annotationState.selectionMode === AnnotationSelectionMode.TRACK) {
          canv.domElement.style.cursor = "cell";
        } else {
          canv.domElement.style.cursor = "crosshair";
        }
      } else {
        canv.domElement.style.cursor = "auto";
      }
    },
    [
      isMouseDragging,
      props.annotationState.isAnnotationModeEnabled,
      props.annotationState.data,
      props.annotationState.selectionMode,
      props.annotationState.currentLabelIdx,
    ]
  );

  const handleBackgroundClicked = useCallback((): void => {
    const isMultiTrackSelectHotkeyPressed = areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode);
    if (isMultiTrackSelectHotkeyPressed) {
      // Ignore background clicks during multi-track selection.
      return;
    }
    clearTracks();
  }, [clearTracks]);

  const handleObjectClicked = useCallback(
    (dataset: Dataset, globalId: number) => {
      const trackId = dataset.getTrackId(globalId);
      const newTrack = dataset.getTrack(trackId);
      const isMultiTrackSelectHotkeyPressed = areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode);
      if (newTrack) {
        if (isMultiTrackSelectHotkeyPressed) {
          // Toggle selection of clicked track during multi-select mode.
          toggleTrack(newTrack);
        } else {
          // Select only the clicked track.
          clearTracks();
          addTracks(newTrack);
        }
      }
    },
    [toggleTrack, clearTracks, addTracks]
  );

  /** Report clicked tracks via the passed callback. */
  const handleClick = useCallback(
    async (event: MouseEvent): Promise<void> => {
      setLastClickPosition([event.offsetX, event.offsetY]);
      updateCanvasCursor(event.offsetX, event.offsetY);
      const info = canv.getIdAtPixel(event.offsetX, event.offsetY);
      props.onClickId(info);

      // Update track selection based on clicked object
      if (dataset === null) {
        clearTracks();
      } else if (info?.globalId !== undefined) {
        handleObjectClicked(dataset, info.globalId);
      } else {
        // User clicked on background or on a cell with no data.
        handleBackgroundClicked();
      }
    },
    [canv, dataset, props.onClickId, clearTracks, handleObjectClicked, handleBackgroundClicked]
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
    if (document.activeElement instanceof HTMLElement && !containerRef.current?.contains(document.activeElement)) {
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
          canv.handleDragEvent(event.movementX, event.movementY);
        }
      }

      updateCanvasCursor(event.offsetX, event.offsetY);
    },
    [canv, updateCanvasCursor]
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

  const onMouseWheel = useCallback((event: WheelEvent): void => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      canv.handleScrollEvent(event.offsetX, event.offsetY, event.deltaY);
    }
  }, []);

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
  }, [canv, onMouseClick, onMouseWheel, onMouseDown, onMouseMove, onMouseUp]);

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

  // RENDERING /////////////////////////////////////////////////

  const onAnnotationLinkClicked = (): void => {
    setOpenTab(TabType.ANNOTATION);
  };

  const labels = props.annotationState.data.getLabels();
  const annotationTooltipContents: ReactNode[] = [];
  annotationTooltipContents.push(
    <span key="annotation-count">
      {labels.length > 0 ? (labels.length === 1 ? "1 label" : `${labels.length} labels`) : "(No labels)"}
    </span>
  );
  annotationTooltipContents.push(
    <TooltipButtonStyleLink key="annotation-link" onClick={onAnnotationLinkClicked}>
      <span>
        View and edit annotations <VisuallyHidden>(opens annotations tab)</VisuallyHidden>
      </span>
    </TooltipButtonStyleLink>
  );
  const labelData: LabelData | undefined = labels[props.annotationState.currentLabelIdx ?? 0];

  const shouldShowRangeSelectionHotkey = props.annotationState.baseSelectionMode !== AnnotationSelectionMode.RANGE;
  const shouldShowReuseValueHotkey = labelData?.options.type === LabelType.INTEGER && labelData?.options.autoIncrement;
  let annotationShortcutKeys = [];
  if (shouldShowRangeSelectionHotkey) {
    annotationShortcutKeys.push(SHORTCUT_KEYS.annotation.selectRange);
  }
  if (shouldShowReuseValueHotkey) {
    annotationShortcutKeys.push(SHORTCUT_KEYS.annotation.reuseValue);
  }

  return (
    <CanvasContainer ref={containerRef} $annotationModeEnabled={props.annotationState.isAnnotationModeEnabled}>
      {
        // TODO: Fade out annotation mode modal if mouse approaches top left
        // corner? (This would require mouse position to be a state variable,
        // might cause too many re-renders)
        props.annotationState.isAnnotationModeEnabled && (
          <AnnotationModeContainer>
            <ShortcutKeyList
              title="Annotation editing in progress..."
              shortcutKeys={annotationShortcutKeys}
              inline={true}
            />
          </AnnotationModeContainer>
        )
      }
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
              canv.resetView();
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
              canv.handleZoomIn();
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
              canv.handleZoomOut();
            }}
          >
            <ZoomOutOutlined />
            <VisuallyHidden>Zoom out</VisuallyHidden>
          </IconButton>
        </TooltipWithSubtitle>

        {/* 2D backdrop or 3D channels toggle */}
        {isDataset3d ? <ChannelToggleButton /> : <BackdropToggleButton />}

        {/* Annotation mode toggle */}
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
      </CanvasControlsContainer>
      <AnnotationInputPopover
        annotationState={props.annotationState}
        anchorPositionPx={lastClickPosition}
      ></AnnotationInputPopover>
    </CanvasContainer>
  );
}
