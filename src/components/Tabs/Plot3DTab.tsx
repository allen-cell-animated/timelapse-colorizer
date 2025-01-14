import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useRef } from "react";
import { clamp, lerp } from "three/src/math/MathUtils";

import { Dataset, Track } from "../../colorizer";

const CONFIG: Partial<Plotly.Config> = {
  responsive: true,
  frameMargins: 0,
};

const LAYOUT: Partial<Plotly.Layout> = {
  uirevision: "a",
  margin: {
    l: 0,
    r: 0,
    b: 0,
    t: 15,
  },
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

const EXAMPLE_XY_POINTS_1 = [
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

const EXAMPLE_XY_POINTS_2 = [
  [4, 1],
  [3, 1],
  [3, 2],
  [3, 3],
  [3, 4],
  [3, 5],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
];

const EXAMPLE_XY_POINTS_3 = [
  [4, 11],
  [3, 11],
  [2, 11],
  [1, 10],
  [0, 9],
  [0, 8],
];

const EXAMPLE_XY_POINTS = [EXAMPLE_XY_POINTS_1, EXAMPLE_XY_POINTS_2, EXAMPLE_XY_POINTS_3];

type Plot3DTabProps = {
  dataset: Dataset | null;
  selectedTrack: Track | null;
  currentFrame: number;
  setFrame: (frame: number) => void;
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
  }

  plot(time: number): void {
    const traces: Plotly.Data[] = [];

    // Plotly has a bug where the hoverinfo="skip" attribute still causes 3D surfaces
    // to block hover events on other traces.
    // Here's a few unresolved community issues:
    // https://community.plotly.com/t/completely-excluding-a-trace-from-hover-info-snapping/35854/17
    // https://community.plotly.com/t/hover-info-of-scatter-points-through-3d-mesh/39973/6
    const surfaceTrace: Plotly.Data = {
      z: EXAMPLE_DATA,
      type: "surface",
      opacity: 0.7,
      name: "surface",
      hoverinfo: "skip",
    };
    traces.push(surfaceTrace);
    const xyPoints = EXAMPLE_XY_POINTS[(this.track?.trackId ?? 0) % EXAMPLE_XY_POINTS.length];
    const xyzPoints = xyPoints.map((point) => [point[0], point[1], EXAMPLE_DATA[point[1]][point[0]]]);

    // Move a scatterplot point along the surface of the 3D plot based on the current track's lifespan.
    // This is currently just PoC and is not linked to real data.
    if (this.track) {
      const trackDuration = this.track.endTime() - this.track.startTime();
      // As a hack, store the time in the customdata field of the line plot.
      const scatterPlotTrace: Plotly.Data = {
        x: xyzPoints.map((point) => point[0]),
        y: xyzPoints.map((point) => point[1]),
        z: xyzPoints.map((point) => point[2]),
        // TODO: use customdata to store time?
        customdata: xyzPoints.map(
          (_, i) => this.track!.startTime() + Math.floor((trackDuration / (xyzPoints.length - 1)) * i)
        ),
        mode: "lines",
        type: "scatter3d",
        opacity: 1,
        line: {
          width: 8,
          color: "rgb(80, 80, 80)",
        },
        showlegend: false,
      };
      traces.push(scatterPlotTrace);

      // Indices of the two closest points
      const trackProgress = clamp((time - this.track.startTime()) / trackDuration, 0, 1);
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
        showlegend: false,
        customdata: [time],
      };
      traces.push(currentPointTrace);
    }

    Plotly.react(this.parentRef, traces, LAYOUT, CONFIG);
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

  useEffect(() => {
    const onClickPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (eventData.points.length === 0) {
        return;
      }
      props.setFrame((eventData.points[0].customdata as number) ?? props.currentFrame);
    };

    const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
    plotDiv?.on("plotly_click", onClickPlot);
    return () => {
      const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
      plotDiv?.removeAllListeners("plotly_click");
    };
  }, [props.setFrame]);

  return <div ref={plotContainerRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
