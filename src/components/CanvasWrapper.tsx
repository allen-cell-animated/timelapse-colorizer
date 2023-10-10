import React, { ReactElement, useCallback, useEffect, useMemo, useRef } from "react";
import { Color } from "three";
import { ColorRamp, ColorizeCanvas, Dataset, Track } from "../colorizer";
import { DrawMode } from "../colorizer/ColorizeCanvas";

export type DrawSettings = {
  mode: DrawMode;
  color: Color;
};

type CanvasWrapperProps = {
  canv: ColorizeCanvas;
  /** Dataset to look up track and ID information in.
   * Does NOT update the canvas datset; do so directly by calling
   * `canvas.setDataset()`.
   */
  dataset: Dataset | null;
  showTrackPath: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;
  selectedTrack: Track | null;

  /** Called when the mouse hovers over the canvas; reports the currently hovered id. */
  onMouseHoveredId?: (id: number) => void;
  /** Called when the mouse exits the canvas. */
  onMouseLeave?: () => void;
  /** Called when the canvas is clicked; reports the track info of the clicked object. */
  onTrackClicked?: (track: Track | null) => void;
};

const defaultProps: Partial<CanvasWrapperProps> = {
  onMouseHoveredId() {},
  onMouseLeave() {},
  onTrackClicked: () => {},
};

/**
 * Provides a component-style interface for interacting with ColorizeCanvas.
 *
 * Note that some canvas operations (like `setFrame`, `setFeature`, `setDataset`)
 * are async and should be called directly on the canvas instance.
 */
export default function CanvasWrapper(inputProps: CanvasWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CanvasWrapperProps>;

  const canv = props.canv;
  const canvasRef = useRef<HTMLDivElement>(null);

  // CANVAS PROPERTIES /////////////////////////////////////////////////

  // Mount the canvas to the wrapper's location in the document.
  useEffect(() => {
    canvasRef.current?.parentNode?.replaceChild(canv.domElement, canvasRef.current);
  }, []);

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

  // Updated track-related settings
  useMemo(() => {
    canv.setSelectedTrack(props.selectedTrack);
    canv.setShowTrackPath(props.showTrackPath);
  }, [props.selectedTrack, props.showTrackPath]);

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
  const onMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!props.dataset) {
        return;
      }
      const id = canv.getIdAtPixel(event.offsetX, event.offsetY);
      props.onMouseHoveredId(id);
    },
    [props.dataset, canv]
  );

  useEffect(() => {
    canv.domElement.addEventListener("mousemove", onMouseMove);
    canv.domElement.addEventListener("mouseleave", props.onMouseLeave);
    return () => {
      canv.domElement.removeEventListener("mousemove", onMouseMove);
      canv.domElement.removeEventListener("mouseleave", props.onMouseLeave);
    };
  }, [onMouseMove, canv]);

  // RENDERING /////////////////////////////////////////////////

  canv.render();
  return <div ref={canvasRef}></div>;
}
