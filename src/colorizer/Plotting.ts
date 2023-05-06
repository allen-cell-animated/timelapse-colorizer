import Dataset from "./Dataset";
import Plotly from "plotly.js-dist-min";

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

    const ymin = Math.min(...plotinfo.range);
    const ymax = Math.max(...plotinfo.range);
    const layout: Partial<Plotly.Layout> = {
      yaxis: {
        title: feature,
      },
      shapes: [
        {
          type: "line",
          x0: time,
          y0: ymin,
          x1: time,
          yref: "paper",
          y1: ymax,
          line: {
            color: "grey",
            width: 1.5,
            dash: "dot",
          },
        },
      ],
      title: "track " + trackId,
    };

    Plotly.react(this.parentDivId, data, layout);
  }

  setTime(t: number): void {
    const layout: Partial<Plotly.Layout> = {
      "shapes[0].x0": t,
      "shapes[0].x1": t,
    };
    Plotly.relayout(this.parentDivId, layout);
  }

  removePlot(): void {
    Plotly.react(this.parentDivId, []);
  }
}
