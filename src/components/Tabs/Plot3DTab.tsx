import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import { Dataset, Track } from "../../colorizer";
import { useViewerStateStore } from "../../state";

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

// type Plot3DTabProps = {};

class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public track: Track | null;
  public xAxisFeatureKey: string | null = null;
  public yAxisFeatureKey: string | null = null;
  public zAxisFeatureKey: string | null = null;

  public coneTrace: Plotly.Data | null = null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.track = null;
    this.parentRef = parentRef;

    Plotly.newPlot(this.parentRef, [], {}, CONFIG);

    this.plot = this.plot.bind(this);
  }

  plot(_time: number): void {
    const traces: Plotly.Data[] = [];

    // TRACE 1: Arrow plot
    // Draw an optional arrow plot to visualize the flow field, if all
    if (this.coneTrace) {
      traces.push(this.coneTrace);
    }

    //
    // Plotly has a bug where the hoverinfo="skip" attribute still causes 3D surfaces
    // to block hover events on other traces.
    // Here's a few unresolved community issues:
    // https://community.plotly.com/t/completely-excluding-a-trace-from-hover-info-snapping/35854/17
    // https://community.plotly.com/t/hover-info-of-scatter-points-through-3d-mesh/39973/6
    // const surfaceTrace: Plotly.Data = {
    //   z: EXAMPLE_DATA,
    //   type: "surface",
    //   opacity: 0.7,
    //   name: "surface",
    //   hoverinfo: "skip",
    // };
    // traces.push(surfaceTrace);
    // const xyPoints = EXAMPLE_XY_POINTS[(this.track?.trackId ?? 0) % EXAMPLE_XY_POINTS.length];
    // const xyzPoints = xyPoints.map((point) => [point[0], point[1], EXAMPLE_DATA[point[1]][point[0]]]);

    // Move a scatterplot point along the surface of the 3D plot based on the current track's lifespan.
    // This is currently just PoC and is not linked to real data.
    // if (this.track) {
    //   const trackDuration = this.track.endTime() - this.track.startTime();
    //   // As a hack, store the time in the customdata field of the line plot.
    //   const scatterPlotTrace: Plotly.Data = {
    //     x: xyzPoints.map((point) => point[0]),
    //     y: xyzPoints.map((point) => point[1]),
    //     z: xyzPoints.map((point) => point[2]),
    //     // TODO: use customdata to store time?
    //     customdata: xyzPoints.map(
    //       (_, i) => this.track!.startTime() + Math.floor((trackDuration / (xyzPoints.length - 1)) * i)
    //     ),
    //     mode: "lines",
    //     type: "scatter3d",
    //     opacity: 1,
    //     line: {
    //       width: 8,
    //       color: "rgb(80, 80, 80)",
    //     },
    //     showlegend: false,
    //   };
    //   traces.push(scatterPlotTrace);

    //   // Indices of the two closest points
    //   const trackProgress = clamp((time - this.track.startTime()) / trackDuration, 0, 1);
    //   const idx0 = Math.floor(trackProgress * (xyzPoints.length - 1));
    //   const idx1 = Math.ceil(trackProgress * (xyzPoints.length - 1));
    //   const idxLerp = trackProgress * (xyzPoints.length - 1) - idx0;

    //   // Create point using lerp value
    //   const currentPointTrace: Plotly.Data = {
    //     x: [lerp(xyzPoints[idx0][0], xyzPoints[idx1][0], idxLerp)],
    //     y: [lerp(xyzPoints[idx0][1], xyzPoints[idx1][1], idxLerp)],
    //     z: [lerp(xyzPoints[idx0][2], xyzPoints[idx1][2], idxLerp)],
    //     mode: "markers",
    //     type: "scatter3d",
    //     marker: {
    //       size: 6,
    //       color: "rgb(255, 0, 0)",
    //     },
    //     showlegend: false,
    //     customdata: [time],
    //   };
    //   traces.push(currentPointTrace);
    // }

    Plotly.react(this.parentRef, traces, LAYOUT, CONFIG);
  }
}

function makeSteps(min: number, max: number, steps: number): number[] {
  const stepSize = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => min + i * stepSize);
}

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  const [xAxisFeatureKey, setXAxisFeatureKey] = useState<string | null>(null);
  const [yAxisFeatureKey, setYAxisFeatureKey] = useState<string | null>(null);
  const [zAxisFeatureKey, setZAxisFeatureKey] = useState<string | null>(null);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const dataset = useViewerStateStore((state) => state.dataset);
  const track = useViewerStateStore((state) => state.track);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const setFrame = useViewerStateStore((state) => state.setFrame);

  useEffect(() => {
    if (dataset && dataset?.flowFieldFeatures.size >= 3) {
      const flowFieldKeys = Array.from(dataset.flowFieldFeatures.keys());
      setXAxisFeatureKey(flowFieldKeys[0] ?? null);
      setYAxisFeatureKey(flowFieldKeys[1] ?? null);
      setZAxisFeatureKey(flowFieldKeys[2] ?? null);
    }
  }, [dataset]);

  useEffect(() => {
    const makeConeTrace = (): Plotly.Data | null => {
      if (!dataset || !xAxisFeatureKey || !yAxisFeatureKey || !zAxisFeatureKey) {
        return null;
      }
      const xFlowFieldData = dataset.getFlowFieldFeatureData(xAxisFeatureKey);
      const yFlowFieldData = dataset.getFlowFieldFeatureData(yAxisFeatureKey);
      const zFlowFieldData = dataset.getFlowFieldFeatureData(zAxisFeatureKey);
      const dims = dataset.flowFieldDims;
      if (!xFlowFieldData || !yFlowFieldData || !zFlowFieldData || !dims) {
        return null;
      }
      // Get XYZ coordinates as a flattened array
      const xSteps = makeSteps(xFlowFieldData.min, xFlowFieldData.max, dims.x);
      const ySteps = makeSteps(yFlowFieldData.min, yFlowFieldData.max, dims.y);
      const zSteps = makeSteps(zFlowFieldData.min, zFlowFieldData.max, dims.z);
      const xCoords: number[] = [];
      const yCoords: number[] = [];
      const zCoords: number[] = [];
      for (let i = 0; i < dims.x; i++) {
        for (let j = 0; j < dims.y; j++) {
          for (let k = 0; k < dims.z; k++) {
            xCoords.push(xSteps[i]);
            yCoords.push(ySteps[j]);
            zCoords.push(zSteps[k]);
          }
        }
      }
      console.log("yay");

      return {
        type: "cone",
        x: xCoords,
        y: yCoords,
        z: zCoords,
        u: xFlowFieldData.data,
        v: yFlowFieldData.data,
        w: zFlowFieldData.data,
        showscale: false,
        sizemode: "scaled",
        sizeref: 2,
      } as Plotly.Data;
    };
    const newConeTrace = makeConeTrace();
    setConeTrace(newConeTrace);
  }, [dataset, xAxisFeatureKey, yAxisFeatureKey, zAxisFeatureKey]);

  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
  }, []);

  useEffect(() => {
    if (plot3dRef.current) {
      plot3dRef.current.dataset = dataset;
      plot3dRef.current.track = track;
      plot3dRef.current.xAxisFeatureKey = xAxisFeatureKey;
      plot3dRef.current.yAxisFeatureKey = yAxisFeatureKey;
      plot3dRef.current.zAxisFeatureKey = zAxisFeatureKey;
      plot3dRef.current.coneTrace = coneTrace as Plotly.Data | null;
      plot3dRef.current.plot(currentFrame);
    }
  }, [dataset, track, currentFrame, coneTrace]);

  useEffect(() => {
    const onClickPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (eventData.points.length === 0) {
        return;
      }
      setFrame((eventData.points[0].customdata as number) ?? currentFrame);
    };

    const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
    plotDiv?.on("plotly_click", onClickPlot);
    return () => {
      const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
      plotDiv?.removeAllListeners("plotly_click");
    };
  }, [setFrame]);

  return <div ref={plotContainerRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
