import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  setFrame?: (frame: number) => Promise<void>;
  frame?: number;
};

const defaultProps = {
  heightPx: 18,
  widthPx: 150,
};

const ThumbnailContainer = styled.div<{ $widthPx: number; $heightPx: number; $interactive: boolean; $theme: AppTheme }>`
  position: relative;
  border-radius: 4px;
  border: 1px solid ${(props) => props.$theme.color.layout.borders};
  overflow: hidden;
  width: ${(props) => props.$widthPx}px;
  height: ${(props) => props.$heightPx}px;
  display: flex;
  cursor: ${(props) => (props.$interactive ? "pointer" : "auto")};

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

  // The thumbnail uses two layered canvases. The time canvas on top just draws
  // lines for the current and hovered time, while the base canvas draws the
  // labeled intervals.
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);

  const minTime = track ? track.times[0] : 0;
  const maxTime = track ? track.times[track.times.length - 1] : 0;
  const duration = maxTime - minTime + 1;
  const indexToCanvasScale = props.widthPx / duration;

  const xCoordToTime = useCallback(
    (x: number): number => Math.floor(x / indexToCanvasScale + minTime),
    [minTime, indexToCanvasScale]
  );
  const timeToXCoord = useCallback(
    (time: number): number => (time - minTime) * indexToCanvasScale,
    [minTime, indexToCanvasScale]
  );

  // Add event listeners
  useEffect(() => {
    const getXCoord = (event: MouseEvent): number => {
      const canvas = timeCanvasRef.current;
      if (!canvas) {
        return 0;
      }
      const rect = canvas.getBoundingClientRect();
      return event.clientX - rect.left;
    };

    const onMouseMove = (event: MouseEvent): void => setHoveredCanvasX(getXCoord(event));
    const onMouseLeave = (): void => setHoveredCanvasX(null);
    const onMouseClick = async (event: MouseEvent): Promise<void> => {
      if (props.setFrame && props.track) {
        const frame = xCoordToTime(getXCoord(event));
        setAwaitingFrame(frame);
        await props.setFrame(frame);
        setAwaitingFrame(null);
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
  }, [props.setFrame, props.track, xCoordToTime]);

  // Update time canvas
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    const ctx = timeCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!track || !dataset) {
      return;
    }

    const drawDashedLine = (x: number, color: string): void => {
      ctx.strokeStyle = color;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, props.heightPx);
      ctx.stroke();
      ctx.closePath();
    };

    // Draw hovered time on canvas.
    if (props.frame && hoveredCanvasX !== null) {
      const hoveredTime = xCoordToTime(hoveredCanvasX);
      const x = timeToXCoord(hoveredTime + 0.5);
      drawDashedLine(x, theme.color.text.hint);
    }
    // Draw the current time on the canvas. Replace with awaiting time if it is
    // set for optimistic updates
    if (props.frame !== undefined && props.frame >= minTime && props.frame <= maxTime) {
      const frame = awaitingFrame !== null ? awaitingFrame : props.frame;
      const x = timeToXCoord(frame + 0.5);
      drawDashedLine(x, theme.color.text.primary);
    }
  }, [track, dataset, props.widthPx, props.heightPx, props.frame, hoveredCanvasX, awaitingFrame]);

  // Update base canvas
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    const ctx = baseCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme.color.layout.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (track === null || dataset === null) {
      return;
    }
    const selectedTimes = ids.map((id) => dataset.getTime(id));
    const selectedIntervals = getIntervals(selectedTimes);
    // Check for time intervals where there are no objects present for the track
    const missingIntervals = getIntervals(track.getMissingTimes());

    const drawInterval = (interval: [number, number], color: string): void => {
      const minX = timeToXCoord(interval[0]);
      const maxX = timeToXCoord(interval[1] + 1);
      ctx.fillStyle = color;
      ctx.fillRect(minX, 0, maxX - minX, props.heightPx);
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
    <ThumbnailContainer
      $theme={theme}
      $heightPx={props.heightPx}
      $widthPx={props.widthPx}
      $interactive={props.track !== null}
    >
      <canvas ref={baseCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
      <canvas ref={timeCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
    </ThumbnailContainer>
  );
}
