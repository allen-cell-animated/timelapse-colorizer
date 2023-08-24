import Dataset from "./Dataset";
import Track from "./Track";
import Plotly from "plotly.js-dist-min";

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

export default class Plotting {
  private parentDivId: string;
  private dataset: Dataset | null;
  private trace: Plotly.Data | null;

  constructor(divId: string) {
    this.parentDivId = divId;
    this.dataset = null;
    this.trace = null;
    const layout: Partial<Plotly.Layout> = {
      xaxis: {
        title: "time index",
      },
      yaxis: {
        title: "[None]",
      },
      title: "No track selected",
    };

    Plotly.newPlot(this.parentDivId, [], layout);
    this.plot = this.plot.bind(this);
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  plot(track: Track, feature: string, time: number): void {
    if (!this.dataset) {
      return;
    }
    const plotinfo = this.dataset?.buildTrackFeaturePlot(track, feature);
    console.log("Plot time: " + time);
    this.trace = {
      x: plotinfo.domain,
      y: plotinfo.range,
      type: "scatter",
    };

    const layout: Partial<Plotly.Layout> = {
      yaxis: {
        title: feature,
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

    Plotly.react(this.parentDivId, [this.trace], layout);
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
    console.log("Plot time: " + t);
    Plotly.relayout(this.parentDivId, layout);
    //Plotly.react(this.parentDivId, this.trace ? [this.trace] : [], layout);
  }

  removePlot(): void {
    Plotly.react(this.parentDivId, []);
  }
}
