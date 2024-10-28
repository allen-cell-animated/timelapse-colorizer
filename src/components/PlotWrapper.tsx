import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { Dataset, Plotting, Track } from "../colorizer";

import { TrackPlotLayoutConfig } from "../colorizer/Plotting";

type PlotWrapperProps = {
  frame: number;
  dataset: Dataset | null;
  featureKey: string;
  selectedTrack: Track | null;
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
    const config: TrackPlotLayoutConfig = {
      time: props.frame,
    };
    if (hoveredObjectId) {
      const featureData = props.dataset?.getFeatureData(props.featureKey);
      const hoveredObjectTime = props.dataset?.getTime(hoveredObjectId);
      if (featureData && hoveredObjectTime) {
        const featureValue = featureData.data[hoveredObjectId];
        config.hover = {
          x: hoveredObjectTime,
          y: featureValue,
        };
      }
    }
    plot?.updateLayout(config);
  }, [props.dataset, props.frame, props.selectedTrack, props.featureKey, hoveredObjectId]);

  // Handle updates to selected track and feature, updating/clearing the plot accordingly.
  useMemo(() => {
    if (props.selectedTrack) {
      plot?.plot(props.selectedTrack, props.featureKey, props.frame);
    } else {
      plot?.removePlot();
    }
  }, [props.selectedTrack, props.featureKey]);

  const updatePlotSize = (): void => {
    if (!plotDivRef.current) {
      return;
    }
    const width = plotDivRef.current.clientWidth;
    const height = plotDivRef.current.clientHeight;
    plot?.setSize(width, height);
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
      const time = eventData.points[0].x;
      if (time) {
        const objectId = props.selectedTrack?.getIdAtTime(time as number);
        objectId && setHoveredObjectId(objectId);
      }
    };

    const onHoverExit = (): void => {
      setHoveredObjectId(null);
    };

    const plotElement = plotDivRef.current as PlotlyHTMLElement | null;
    plotElement?.on("plotly_click", onClickPlot);
    plotElement?.on("plotly_hover", onHoverPlot);
    plotElement?.on("plotly_unhover", onHoverExit);
    return () => {
      const plotElement = plotDivRef.current as PlotlyHTMLElement | null;
      plotElement?.removeAllListeners("plotly_click");
      plotElement?.removeAllListeners("plotly_hover");
      plotElement?.removeAllListeners("plotly_unhover");
    };
  }, [props.setFrame]);

  return <div ref={plotDivRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
