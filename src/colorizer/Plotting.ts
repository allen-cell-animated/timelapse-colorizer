import Dataset from "./Dataset";
import Plotly from "plotly.js-dist-min";

export default class Plotting {
  private parentDivId: string;
  private dataset: Dataset | null;

  constructor(divId: string) {
    this.parentDivId = divId;
    this.dataset = null;
    Plotly.newPlot(this.parentDivId, []);
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  plot(trackId: number, feature: string): void {
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

    Plotly.react(this.parentDivId, data);
  }

  removePlot(): void {
    Plotly.react(this.parentDivId, []);
  }
}
