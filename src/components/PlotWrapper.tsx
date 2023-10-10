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

  const plotRef = useRef<HTMLDivElement>(null);
  const [plot, setPlot] = useState<Plotting | null>(null);

  // Setup for plot after initial render, since it replaces a DOM element.
  useEffect(() => {
    const plot = new Plotting(plotRef.current!);
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
  }, [props.selectedTrack, props.featureName, props.frame]);

  return <div ref={plotRef} style={{ width: "600px", height: "400px" }} />;
}
