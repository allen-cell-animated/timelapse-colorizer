import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { Dataset, Plotting, Track } from "../colorizer";

type PlotWrapperProps = {
  frame: number;
  dataset: Dataset | null;
  featureName: string;
  selectedTrack: Track | null;
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

  // Setup for plot after initial render, since it replaces a DOM element.
  useEffect(() => {
    const layout = { width: 600, height: 400 };
    if (plotDivRef.current) {
      layout.width = plotDivRef.current.clientWidth;
      layout.height = plotDivRef.current.clientHeight;
    }
    const plot = new Plotting(plotDivRef.current!, {});
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

  // Update time in plot
  useMemo(() => {
    plot?.setTime(props.frame);
  }, [props.frame]);

  // Handle updates to selected track and feature, updating/clearing the plot accordingly.
  useMemo(() => {
    plot?.removePlot();
    if (props.selectedTrack) {
      plot?.plot(props.selectedTrack, props.featureName, props.frame);
    }
  }, [props.selectedTrack, props.featureName]);

  const updatePlotSize = (): void => {
    if (!plotDivRef.current) {
      return;
    }
    const width = plotDivRef.current.clientWidth;
    const height = plotDivRef.current.clientHeight;
    console.log(`Resizing (${width}, ${height})`);
    plot?.setSize(width, height);
  };

  // Once the plot is set up, update its initial size to match the window.
  // We rely on the "responsive" behavior of the plot to update its size.
  // TODO: Troubleshoot using window.addEventListener for resizing.
  useEffect(() => {
    updatePlotSize();
    // window.addEventListener("resize", updatePlotSize);
    // return () => window.removeEventListener("resize", updatePlotSize);
  }, [plot, plotDivRef.current]);

  return <div ref={plotDivRef} style={{ width: "auto", height: "auto", zIndex: "0" }}></div>;
}
