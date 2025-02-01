import React, { ReactElement, useContext, useEffect, useRef } from "react";
import { Color } from "three";

import { Dataset, Track } from "../../../colorizer";
import { getIntervals } from "../../../colorizer/utils/data_utils";

import { AppThemeContext } from "../../AppStyle";

type AnnotationTrackThumbnailProps = {
  ids: number[];
  track: Track | null;
  dataset: Dataset | null;
  color: Color;
  heightPx?: number;
  widthPx?: number;
};

const defaultProps = {
  heightPx: 18,
  widthPx: 150,
};

export default function AnnotationTrackThumbnail(inputProps: AnnotationTrackThumbnailProps): ReactElement {
  const props = { ...defaultProps, ...inputProps };
  const { track, dataset, ids } = props;
  const theme = useContext(AppThemeContext);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (track === null || dataset === null) {
      return;
    }

    const idsAsTimes = ids.map((id) => dataset.getTime(id));
    const minTime = track.times[0];
    const maxTime = track.times[track.times.length - 1];
    const duration = maxTime - minTime + 1;

    // The indices of subregions of the times array that are selected
    const intervals = getIntervals(idsAsTimes);
    const indexToCanvasScale = props.widthPx / duration;

    // Check for time intervals where there are no objects present for the track
    const missingIntervals = getIntervals(track.getMissingTimes());

    // Draw missing time intervals on the canvas
    for (const interval of missingIntervals) {
      const intervalMin = interval[0] - minTime;
      const intervalMax = interval[1] - minTime;
      ctx.fillStyle = theme.color.layout.borders;
      ctx.fillRect(
        intervalMin * indexToCanvasScale,
        0,
        (intervalMax - intervalMin + 1) * indexToCanvasScale,
        props.heightPx
      );
    }

    // Draw selected intervals on the canvas
    for (const interval of intervals) {
      const intervalMin = interval[0] - minTime;
      const intervalMax = interval[1] - minTime;
      ctx.fillStyle = "#" + props.color.getHexString();
      ctx.fillRect(
        intervalMin * indexToCanvasScale,
        0,
        (intervalMax - intervalMin + 1) * indexToCanvasScale,
        props.heightPx
      );
    }
  }, [ids, track, props.widthPx, props.heightPx]);

  return (
    <div
      style={{
        borderRadius: "4px",
        border: `1px solid ${theme.color.layout.borders}`,
        overflow: "hidden",
        width: "fit-content",
        height: `${props.heightPx}px`,
        display: "flex",
      }}
    >
      <canvas ref={canvasRef} width={props.widthPx} height={props.heightPx}></canvas>
    </div>
  );
}
