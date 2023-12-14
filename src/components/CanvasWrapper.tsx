import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Color } from "three";

import { ColorizeCanvas, ColorRamp, Dataset, Track } from "../colorizer";
import { DrawMode } from "../colorizer/ColorizeCanvas";
import { FeatureThreshold } from "../colorizer/types";
import { AppThemeContext } from "./AppStyle";

export type DrawSettings = {
  mode: DrawMode;
  color: Color;
};

type CanvasWrapperProps = {
  canv: ColorizeCanvas;
  /** Dataset to look up track and ID information in.
   * Changing this does NOT update the canvas dataset; do so
   * directly by calling `canv.setDataset()`.
   */
  dataset: Dataset | null;
  showTrackPath: boolean;
  showScaleBar: boolean;
  showTimestamp: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;
  selectedTrack: Track | null;

  featureThresholds?: FeatureThreshold[];

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHover?: (id: number) => void;
  /** Called when the mouse exits the canvas. */
  onMouseLeave?: () => void;
  /** Called when the canvas is clicked; reports the track info of the clicked object. */
  onTrackClicked?: (track: Track | null) => void;

  maxWidth?: number;
  maxHeight?: number;
};

const defaultProps: Partial<CanvasWrapperProps> = {
  onMouseHover() {},
  onMouseLeave() {},
  onTrackClicked: () => {},
  featureThresholds: [],
  maxWidth: 730,
  maxHeight: 500,
};

/**
 * Provides a React component-style interface for interacting with ColorizeCanvas.
 *
 * Note that some canvas operations (like `setFrame`, `setFeature`, `setDataset`)
 * are async and should be called directly on the canvas instance.
 */
export default function CanvasWrapper(inputProps: CanvasWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CanvasWrapperProps>;

  const canv = props.canv;
  const canvasRef = useRef<HTMLDivElement>(null);
  const isMouseOverCanvas = useRef(false);
  const lastMousePositionPx = useRef([0, 0]);
  const theme = useContext(AppThemeContext);

  // CANVAS PROPERTIES /////////////////////////////////////////////////

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
  }, [theme]);

  // Update canvas color ramp
  useMemo(() => {
    canv.setColorRamp(props.colorRamp);
    canv.setColorMapRangeMin(props.colorRampMin);
    canv.setColorMapRangeMax(props.colorRampMax);
  }, [props.colorRamp, props.colorRampMin, props.colorRampMax]);

  // Update drawing modes for outliers + out of range values
  useMemo(() => {
    const settings = props.outOfRangeDrawSettings;
    canv.setOutOfRangeDrawMode(settings.mode, settings.color);
  }, [props.outOfRangeDrawSettings]);

  useMemo(() => {
    const settings = props.outlierDrawSettings;
    canv.setOutlierDrawMode(settings.mode, settings.color);
  }, [props.outlierDrawSettings]);

  useMemo(() => {
    // YAGNI: Debouncing for this is possible but no performance issues encountered yet.
    // Add only if needed.
    // Timeout in case of slowdowns to prevent this from halting the UI.
    setTimeout(() => canv.setFeatureThresholds(props.featureThresholds), 0);
  }, [props.featureThresholds, props.dataset]);

  // Updated track-related settings
  useMemo(() => {
    canv.setSelectedTrack(props.selectedTrack);
    canv.setShowTrackPath(props.showTrackPath);
  }, [props.selectedTrack, props.showTrackPath]);

  // Update overlay settings
  useMemo(() => {
    canv.setScaleBarVisibility(props.showScaleBar);
  }, [props.showScaleBar]);

  useMemo(() => {
    canv.setTimestampVisibility(props.showTimestamp);
  }, [props.showTimestamp]);

  // CANVAS ACTIONS /////////////////////////////////////////////////

  /** Report clicked tracks via the passed callback. */
  const handleCanvasClick = useCallback(
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
    [props.dataset]
  );

  useEffect(() => {
    canv.domElement.addEventListener("click", handleCanvasClick);
    return () => {
      canv.domElement.removeEventListener("click", handleCanvasClick);
    };
  }, [handleCanvasClick]);

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
   * hovered value wwhen the canvas frame updates.
   */
  useEffect(() => {
    canv.domElement.addEventListener("mouseenter", () => (isMouseOverCanvas.current = true));
    canv.domElement.addEventListener("mouseleave", () => (isMouseOverCanvas.current = false));
  });

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

  // Respond to window resizing
  useEffect(() => {
    /**
     * Update the canvas dimensions based on the current window size.
     * TODO: Margin calculation?
     */
    const setSize = (): void => {
      const width = Math.min(window.innerWidth - 75, props.maxWidth);
      const height = Math.min(window.innerHeight - 75, props.maxHeight);
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

  // RENDERING /////////////////////////////////////////////////

  canv.render();
  return <div ref={canvasRef}></div>;
}
