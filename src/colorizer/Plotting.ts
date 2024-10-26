import Plotly from "plotly.js-dist-min";

import { drawCrosshair } from "../components/Tabs/scatter_plot_data_utils";

import Dataset from "./Dataset";
import Track from "./Track";

const LINE_OPACITY = 0.5;
const LINE_COLOR = "rgb(25, 25, 25)";
const LINE_SPEC: Partial<Plotly.Shape> = {
  type: "line",
  x0: 0,
  y0: 0,
  x1: 0,
  yref: "paper",
  y1: 1,
  opacity: LINE_OPACITY,
  line: {
    color: LINE_COLOR,
    width: 1,
    dash: "dot",
  },
};

const CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

export default class Plotting {
  private parentRef: HTMLElement;
  private dataset: Dataset | null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.parentRef = parentRef;
    const layout: Partial<Plotly.Layout> = {
      xaxis: {
        title: "time index",
      },
      yaxis: {
        title: "[None]",
      },
      title: "No track selected",
      width: 600,
      height: 400,
    };

    Plotly.newPlot(this.parentRef, [], layout, CONFIG);
    this.plot = this.plot.bind(this);
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  plot(track: Track, featureKey: string, time: number): void {
    if (!this.dataset) {
      return;
    }
    const plotinfo = this.dataset?.buildTrackFeaturePlot(track, featureKey);
    const traces: Partial<Plotly.PlotData>[] = [];
    traces.push({
      x: plotinfo.domain,
      y: plotinfo.range,
      type: "scatter",
    });

    // Crosshair shows currently selected object
    if (time >= track.startTime && time <= track.endTime) {
      const currentObjectId = track.times.indexOf(time);
      traces.push(...drawCrosshair(plotinfo.domain[currentObjectId], plotinfo.range[currentObjectId]));
    }

    const layout: Partial<Plotly.Layout> = {
      showlegend: false,
      yaxis: {
        title: this.dataset.getFeatureNameWithUnits(featureKey),
      },
      shapes: [
        {
          ...LINE_SPEC,
          x0: time,
          x1: time,
        },
      ],
      title: "track " + track.trackId,
    };

    Plotly.react(this.parentRef, traces, layout, CONFIG);
  }

  setTime(t: number): void {
    const layout: Partial<Plotly.Layout> = {
      shapes: [
        {
          ...LINE_SPEC,
          x0: t,
          x1: t,
        },
      ],
    };
    Plotly.relayout(this.parentRef, layout);
    //Plotly.react(this.parentDivId, this.trace ? [this.trace] : [], layout);
  }

  setSize(x: number, y: number): void {
    const layout: Partial<Plotly.Layout> = {
      width: x,
      height: y,
    };
    Plotly.relayout(this.parentRef, layout);
  }

  removePlot(): void {
    Plotly.react(this.parentRef, []);
  }
}
