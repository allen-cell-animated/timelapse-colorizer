import Plotly from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useRef } from "react";
import { clamp, lerp } from "three/src/math/MathUtils";

import { Dataset, Track } from "../../colorizer";

const CONFIG: Partial<Plotly.Config> = {
  // displayModeBar: false,
  responsive: true,
  frameMargins: 0,
};

const LAYOUT: Partial<Plotly.Layout> = {
  uirevision: "a",
};

const EXAMPLE_DATA = [
  [8.83, 8.89, 8.81, 8.87, 8.9, 8.87],
  [8.89, 8.94, 8.85, 8.94, 8.96, 8.92],
  [8.84, 8.9, 8.82, 8.92, 8.93, 8.91],
  [8.79, 8.85, 8.79, 8.9, 8.94, 8.92],
  [8.79, 8.88, 8.81, 8.9, 8.95, 8.92],
  [8.8, 8.82, 8.78, 8.91, 8.94, 8.92],
  [8.75, 8.78, 8.77, 8.91, 8.95, 8.92],
  [8.8, 8.8, 8.77, 8.91, 8.95, 8.94],
  [8.74, 8.81, 8.76, 8.93, 8.98, 8.99],
  [8.89, 8.99, 8.92, 9.1, 9.13, 9.11],
  [8.97, 8.97, 8.91, 9.09, 9.11, 9.11],
  [9.04, 9.08, 9.05, 9.25, 9.28, 9.27],
  [9, 9.01, 9, 9.2, 9.23, 9.2],
  [8.99, 8.99, 8.98, 9.18, 9.2, 9.19],
  [8.93, 8.97, 8.97, 9.18, 9.2, 9.18],
];

const EXAMPLE_XY_POINTS = [
  [5, 11],
  [5, 10],
  [5, 9],
  [5, 8],
  [5, 7],
  [4, 6],
  [4, 5],
  [3, 4],
  [2, 4],
  [2, 5],
  [2, 6],
  [2, 7],
  [2, 8],
];

type Plot3DTabProps = {
  dataset: Dataset | null;
  selectedTrack: Track | null;
  currentFrame: number;
};

class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public track: Track | null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.track = null;
    this.parentRef = parentRef;

    Plotly.newPlot(this.parentRef, [], {}, CONFIG);

    this.plot = this.plot.bind(this);
    this.updateLayout = this.updateLayout.bind(this);
  }

  plot(time: number): void {
    const traces: Plotly.Data[] = [];
    const surfaceTrace: Plotly.Data = { z: EXAMPLE_DATA, type: "surface" };
    const xyPoints = EXAMPLE_XY_POINTS;
    const xyzPoints = xyPoints.map((point) => [point[0], point[1], EXAMPLE_DATA[point[1]][point[0]] + 0.01]);

    const scatterPlotTrace: Plotly.Data = {
      x: xyzPoints.map((point) => point[0]),
      y: xyzPoints.map((point) => point[1]),
      z: xyzPoints.map((point) => point[2]),
      mode: "lines",
      type: "scatter3d",
      opacity: 1,
      line: {
        width: 4,
        color: "rgb(220, 220, 220)",
      },
    };
    traces.push(surfaceTrace, scatterPlotTrace);

    // Move a scatterplot point along the surface of the 3D plot based on the current track's lifespan
    if (this.track) {
      let trackProgress = (time - this.track.startTime()) / this.track.times.length;
      trackProgress = clamp(trackProgress, 0, 1);

      // Indices of the two closest points
      const idx0 = Math.floor(trackProgress * (xyzPoints.length - 1));
      const idx1 = Math.ceil(trackProgress * (xyzPoints.length - 1));
      const idxLerp = trackProgress * (xyzPoints.length - 1) - idx0;

      // Create point using lerp value
      const currentPointTrace: Plotly.Data = {
        x: [lerp(xyzPoints[idx0][0], xyzPoints[idx1][0], idxLerp)],
        y: [lerp(xyzPoints[idx0][1], xyzPoints[idx1][1], idxLerp)],
        z: [lerp(xyzPoints[idx0][2], xyzPoints[idx1][2], idxLerp)],
        mode: "markers",
        type: "scatter3d",
        marker: {
          size: 6,
          color: "rgb(255, 0, 0)",
        },
      };
      traces.push(currentPointTrace);
    }

    if (this.track) Plotly.react(this.parentRef, traces, LAYOUT, CONFIG);
  }

  updateLayout(time: number): void {
    // const shapes: Partial<Plotly.Shape>[] = [
    //   {
    //     xanchor: 5,
    //     yanchor: 5,
    //     zanchor: 8,
    //   },
    // ];
    // Plotly.relayout(this.parentRef, { shapes });
  }
}

export default function Plot3dTab(props: Plot3DTabProps): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
  }, []);

  useEffect(() => {
    if (plot3dRef.current) {
      plot3dRef.current.dataset = props.dataset;
      plot3dRef.current.track = props.selectedTrack;
      plot3dRef.current.plot(props.currentFrame);
    }
  }, [props.dataset, props.selectedTrack, props.currentFrame]);

  return <div ref={plotContainerRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
