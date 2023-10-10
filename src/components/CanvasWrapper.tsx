import React, { ReactElement, useEffect, useMemo, useRef } from "react";
import { Color } from "three";
import { ColorRamp, ColorizeCanvas, Track } from "../colorizer";
import { DrawMode } from "../colorizer/ColorizeCanvas";

export type DrawSettings = {
  mode: DrawMode;
  color: Color;
};

type CanvasWrapperProps = {
  canv: ColorizeCanvas;
  showTrackPath: boolean;
  outOfRangeDrawSettings: DrawSettings;
  outlierDrawSettings: DrawSettings;
  colorRamp: ColorRamp;
  colorRampMin: number;
  colorRampMax: number;
  selectedTrack: Track | null;

  onMouseHoveredId?: (id: number) => void;
  onTrackSelected?: (track: Track) => void;
};
const defaultProps: Partial<CanvasWrapperProps> = {
  onMouseHoveredId(_id) {},
};

export default function CanvasWrapper(inputProps: CanvasWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<CanvasWrapperProps>;

  const canv = props.canv;
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // TODO: does this work?
  useMemo(() => {
    canv.render();
  }, [props]);

  return <div ref={canvasRef}></div>;
}
