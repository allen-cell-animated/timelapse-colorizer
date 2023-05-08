import Dataset from "./Dataset";
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

  constructor(divId: string) {
    this.parentDivId = divId;
    this.dataset = null;
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
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  plot(trackId: number, feature: string, time: number): void {
    if (!this.dataset) {
      return;
    }
    const plotinfo = this.dataset?.buildTrack(trackId, feature);
    const trace1: Plotly.Data = {
      x: plotinfo.domain,
      y: plotinfo.range,
      type: "scatter",
    };

    const data = [trace1];

    //const ymin = Math.min(...plotinfo.range);
    //const ymax = Math.max(...plotinfo.range);
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
      title: "track " + trackId,
    };

    Plotly.react(this.parentDivId, data, layout);
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
    Plotly.relayout(this.parentDivId, layout);
  }

  removePlot(): void {
    Plotly.react(this.parentDivId, []);
  }
}
