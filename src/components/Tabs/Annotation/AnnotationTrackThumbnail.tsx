import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../colorizer";
import { getIntervals } from "../../../colorizer/utils/data_utils";

import { AppTheme, AppThemeContext } from "../../AppStyle";

type AnnotationTrackThumbnailProps = {
  ids: number[];
  track: Track | null;
  dataset: Dataset | null;
  color: Color;
  heightPx?: number;
  widthPx?: number;
  setFrame?: (frame: number) => void;
  frame?: number;
};

const defaultProps = {
  heightPx: 18,
  widthPx: 150,
};

const ThumbnailContainer = styled.div<{ $widthPx: number; $heightPx: number; $theme: AppTheme }>`
  position: relative;
  border-radius: 4px;
  border: 1px solid ${(props) => props.$theme.color.layout.borders};
  overflow: hidden;
  width: ${(props) => props.$widthPx}px;
  height: ${(props) => props.$heightPx}px;
  display: flex;

  & > canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
`;

export default function AnnotationTrackThumbnail(inputProps: AnnotationTrackThumbnailProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const { track, dataset, ids } = props;
  const theme = useContext(AppThemeContext);

  const [hoveredCanvasX, setHoveredCanvasX] = useState<number | null>(null);
  const [awaitingFrame, setAwaitingFrame] = useState<number | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);

  const minTime = track ? track.times[0] : 0;
  const maxTime = track ? track.times[track.times.length - 1] : 0;
  const duration = maxTime - minTime + 1;
  const indexToCanvasScale = props.widthPx / duration;

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const canvas = timeCanvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setHoveredCanvasX(x);
    };
    const onMouseLeave = () => {
      setHoveredCanvasX(null);
    };
    const onMouseClick = (_event: MouseEvent) => {
      if (props.setFrame && hoveredCanvasX !== null) {
        const frame = Math.floor(hoveredCanvasX / indexToCanvasScale + minTime);
        props.setFrame(frame);
      }
    };

    timeCanvasRef.current?.addEventListener("mousemove", onMouseMove);
    timeCanvasRef.current?.addEventListener("mouseleave", onMouseLeave);
    timeCanvasRef.current?.addEventListener("click", onMouseClick);
    return () => {
      timeCanvasRef.current?.removeEventListener("mousemove", onMouseMove);
      timeCanvasRef.current?.removeEventListener("mouseleave", onMouseLeave);
      timeCanvasRef.current?.removeEventListener("click", onMouseClick);
    };
  });

  // Update time canvas
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    const ctx = timeCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw hovered time on canvas
    if (props.frame && hoveredCanvasX !== null) {
      const hoveredTime = Math.floor(hoveredCanvasX / indexToCanvasScale + minTime);
      const hoveredCanvasTimeX = (hoveredTime - minTime) * indexToCanvasScale;
      ctx.strokeStyle = theme.color.text.hint;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoveredCanvasTimeX, 0);
      ctx.lineTo(hoveredCanvasTimeX, props.heightPx);
      ctx.stroke();
    }
    // Draw the current time on the canvas
    if (props.frame !== undefined && props.frame >= minTime && props.frame <= maxTime) {
      const currentTimeNorm = (props.frame - minTime) * indexToCanvasScale;
      ctx.strokeStyle = theme.color.text.primary;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(currentTimeNorm, 0);
      ctx.lineTo(currentTimeNorm, props.heightPx);
      ctx.stroke();
    }
  }, [track, dataset, props.widthPx, props.heightPx, props.frame, hoveredCanvasX]);

  // Update base canvas
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    const ctx = baseCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (track === null || dataset === null) {
      return;
    }

    const selectedTimes = ids.map((id) => dataset.getTime(id));

    // The indices of subregions of the times array that are selected
    const selectedIntervals = getIntervals(selectedTimes);

    // Check for time intervals where there are no objects present for the track
    const missingIntervals = getIntervals(track.getMissingTimes());

    const drawInterval = (interval: [number, number], color: string) => {
      const intervalMin = interval[0] - minTime;
      const intervalMax = interval[1] - minTime;
      ctx.fillStyle = color;
      ctx.fillRect(
        intervalMin * indexToCanvasScale,
        0,
        (intervalMax - intervalMin + 1) * indexToCanvasScale,
        props.heightPx
      );
    };

    // Draw missing time intervals on the canvas
    for (const interval of missingIntervals) {
      drawInterval(interval, theme.color.layout.borders);
    }
    // Draw selected intervals on the canvas
    for (const interval of selectedIntervals) {
      drawInterval(interval, "#" + props.color.getHexString());
    }
  }, [ids, track, props.frame, props.widthPx, props.heightPx]);

  return (
    <ThumbnailContainer $theme={theme} $heightPx={props.heightPx} $widthPx={props.widthPx}>
      <canvas ref={baseCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
      <canvas ref={timeCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
    </ThumbnailContainer>
  );
}
