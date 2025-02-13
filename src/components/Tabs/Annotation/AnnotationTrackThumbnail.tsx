import React, { ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Color } from "three";

import { Dataset, Track } from "../../../colorizer";
import { getIntervals } from "../../../colorizer/utils/data_utils";

import { AppTheme, AppThemeContext } from "../../AppStyle";

const HIGHLIGHT_CANVAS_CLASSNAME = "pulse";

type AnnotationTrackThumbnailProps = {
  ids: number[];
  track: Track | null;
  dataset: Dataset | null;
  color: Color;
  heightPx?: number;
  widthPx?: number;
  setFrame?: (frame: number) => Promise<void>;
  frame?: number;
  /** Draws a optional mark at the provided time. */
  mark?: number;
  /** Highlights a range of IDs */
  highlightedIds?: number[];
  // TODO: Add an option to show time labels to the thumbnail for the two
  // endpoints of the range and for the mark if included.
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

  /* Layers all the canvases on top of one another */
  & > canvas {
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Pulsing/fade animation for the canvas that renders highlighted ranges */
  & > .${HIGHLIGHT_CANVAS_CLASSNAME} {
    animation-name: fade;
    animation-duration: 0.5s;
    animation-fill-mode: both;
    animation-timing-function: ease-in;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }

  @keyframes fade {
    0% {
      opacity: 1;
    }

    100% {
      opacity: 0.25;
    }
  }
`;

const drawMark = (ctx: CanvasRenderingContext2D, x: number, color: string): void => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 3, 0);
  ctx.lineTo(x, 3);
  ctx.lineTo(x + 3, 0);
  ctx.fill();
  ctx.closePath();
};

const drawDashedLine = (ctx: CanvasRenderingContext2D, x: number, height: number, color: string): void => {
  ctx.strokeStyle = color;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.closePath();
};

const drawInterval = (
  ctx: CanvasRenderingContext2D,
  interval: [number, number],
  height: number,
  color: string
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(interval[0], 0, interval[1] - interval[0], height);
};

export default function AnnotationTrackThumbnail(inputProps: AnnotationTrackThumbnailProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const { track, dataset, ids } = props;
  const theme = useContext(AppThemeContext);

  const [hoveredCanvasX, setHoveredCanvasX] = useState<number | null>(null);
  const [awaitingFrame, setAwaitingFrame] = useState<number | null>(null);

  // The thumbnail uses three layered canvases. The time canvas on top just
  // draws lines for the current and hovered time, while the base canvas draws
  // the labeled intervals. An optional animated highlight canvas draws a
  // highlighted range of IDs if provided.
  //
  // Splitting up the layers mminimizes the number of elements that need to be
  // redrawn when the current time or highlighted range changes.
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);

  const minTime = track ? track.times[0] : 0;
  const maxTime = track ? track.times[track.times.length - 1] : 0;
  const duration = maxTime - minTime + 1;
  const indexToCanvasScale = props.widthPx / duration;

  // TODO: Scale canvas based on screen zoom level to keep lines sharp.

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

    // Draw hovered time on canvas.
    if (props.frame && hoveredCanvasX !== null) {
      const hoveredTime = xCoordToTime(hoveredCanvasX);
      const x = timeToXCoord(hoveredTime + 0.5);
      drawDashedLine(ctx, x, props.heightPx, theme.color.text.hint);
    }
    // Draw the current time on the canvas. Replace with awaiting time if it is
    // set for optimistic updates
    if (props.frame !== undefined && props.frame >= minTime && props.frame <= maxTime) {
      const frame = awaitingFrame !== null ? awaitingFrame : props.frame;
      const x = timeToXCoord(frame + 0.5);
      drawDashedLine(ctx, x, props.heightPx, theme.color.text.primary);
    }

    if (props.mark !== undefined) {
      const x = timeToXCoord(props.mark + 0.5);
      drawMark(ctx, x, theme.color.text.primary);
    }
  }, [track, dataset, props.mark, props.widthPx, props.heightPx, props.frame, hoveredCanvasX, awaitingFrame]);

  // Update highlight canvas
  useEffect(() => {
    const canvas = highlightCanvasRef.current;
    const ctx = highlightCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (props.highlightedIds && dataset) {
      const highlightedTimes = props.highlightedIds.map((id) => dataset.getTime(id));
      const highlightIntervals = getIntervals(highlightedTimes);
      for (const interval of highlightIntervals) {
        const xInterval: [number, number] = [timeToXCoord(interval[0]), timeToXCoord(interval[1] + 1)];
        drawInterval(ctx, xInterval, props.heightPx, "#ebc88d9f");
      }
    }
  }, [dataset, props.highlightedIds, props.widthPx, props.heightPx]);

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

    // Draw missing time intervals on the canvas
    for (const interval of missingIntervals) {
      const xInterval: [number, number] = [timeToXCoord(interval[0]), timeToXCoord(interval[1] + 1)];
      drawInterval(ctx, xInterval, props.heightPx, theme.color.layout.borders);
    }
    // Draw selected intervals on the canvas
    for (const interval of selectedIntervals) {
      const xInterval: [number, number] = [timeToXCoord(interval[0]), timeToXCoord(interval[1] + 1)];
      drawInterval(ctx, xInterval, props.heightPx, "#" + props.color.getHexString());
    }
  }, [ids, track, props.highlightedIds, props.frame, props.widthPx, props.heightPx]);

  return (
    <ThumbnailContainer
      $theme={theme}
      $heightPx={props.heightPx}
      $widthPx={props.widthPx}
      $interactive={props.track !== null}
    >
      <canvas ref={baseCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
      {props.highlightedIds && (
        <canvas
          ref={highlightCanvasRef}
          className={HIGHLIGHT_CANVAS_CLASSNAME}
          width={props.widthPx}
          height={props.heightPx}
        ></canvas>
      )}
      <canvas ref={timeCanvasRef} width={props.widthPx} height={props.heightPx}></canvas>
    </ThumbnailContainer>
  );
}
