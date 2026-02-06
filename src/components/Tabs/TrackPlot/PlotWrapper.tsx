import type Plotly from "plotly.js-dist-min";
import type { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

import type { Dataset, Track } from "src/colorizer";

import Plotting, { type TrackPlotLayoutConfig } from "./Plotting";

type PlotWrapperProps = {
  frame: number;
  dataset: Dataset | null;
  featureKey: string | null;
  tracks: Map<number, Track>;
  setFrame: (frame: number) => Promise<void>;
};
const defaultProps: Partial<PlotWrapperProps> = {};

/**
 * A wrapper around the Plotting class, allowing it to be updated via a React
 * component interface.
 */
export default function PlotWrapper(inputProps: PlotWrapperProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<PlotWrapperProps>;

  const plotDivRef = useRef<HTMLDivElement>(null);
  const [plot, setPlot] = useState<Plotting | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<number | null>(null);

  // Setup for plot after initial render, since it replaces a DOM element.
  useEffect(() => {
    const plot = new Plotting(plotDivRef.current!);
    setPlot(plot);
    plot.removePlot(); // Clear initial plot for consistency
  }, []);

  // Update dataset when it changes
  useMemo(() => {
    plot?.removePlot();
    if (props.dataset) {
      plot?.setDataset(props.dataset);
    }
  }, [props.dataset]);

  // Update time and hovered value in plot
  useMemo(() => {
    let hover;
    if (hoveredObjectId && props.featureKey !== null && props.dataset !== null) {
      const featureData = props.dataset.getFeatureData(props.featureKey);
      const hoveredObjectTime = props.dataset.getTime(hoveredObjectId);
      if (featureData && hoveredObjectTime) {
        const featureValue = featureData.data[hoveredObjectId];
        hover = {
          x: hoveredObjectTime,
          y: featureValue,
        };
      }
    }
    const config: TrackPlotLayoutConfig = {
      time: props.frame,
      hover,
    };
    plot?.updateLayout(config);
  }, [props.dataset, props.frame, props.tracks, props.featureKey, hoveredObjectId]);

  // Handle updates to selected track and feature, updating/clearing the plot accordingly.
  useMemo(() => {
    if (props.tracks.size > 0) {
      plot?.plot(props.tracks, props.featureKey, props.frame);
    } else {
      plot?.removePlot();
    }
  }, [props.tracks, props.featureKey]);

  const updatePlotSize = (): void => {
    if (!plotDivRef.current) {
      return;
    }
    const width = plotDivRef.current.clientWidth;
    const height = plotDivRef.current.clientHeight;
    if (width && height) {
      plot?.setSize(width, height);
    }
  };

  useEffect(() => {
    updatePlotSize();
    // TODO: Troubleshoot using window.addEventListener for resizing, because
    // the native responsive behavior can be a bit slow.
    // Some layout issues occurred when using this, so it's disabled for now.
    // window.addEventListener("resize", updatePlotSize);
    // return () => window.removeEventListener("resize", updatePlotSize);
  }, [plot, plotDivRef.current]);

  useEffect(() => {
    const onClickPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (eventData.points.length === 0) {
        return;
      }
      const time = eventData.points[0].x as number;
      props.setFrame(time);
    };

    const onHoverPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (eventData.points.length === 0) {
        setHoveredObjectId(null);
        return;
      }
      const point = eventData.points[0];
      const objectId = Number.parseInt(point.data.ids[point.pointNumber], 10);
      if (isNaN(objectId)) {
        return;
      }
      setHoveredObjectId(objectId);
    };

    const onHoverExit = (): void => {
      setHoveredObjectId(null);
    };

    const plotDiv = plotDivRef.current as PlotlyHTMLElement | null;
    plotDiv?.on("plotly_click", onClickPlot);
    plotDiv?.on("plotly_hover", onHoverPlot);
    plotDiv?.on("plotly_unhover", onHoverExit);
    return () => {
      const plotDiv = plotDivRef.current as PlotlyHTMLElement | null;
      plotDiv?.removeAllListeners("plotly_click");
      plotDiv?.removeAllListeners("plotly_hover");
      plotDiv?.removeAllListeners("plotly_unhover");
    };
  }, [props.setFrame]);

  return <div ref={plotDivRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
