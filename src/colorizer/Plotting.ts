import Plotly from "plotly.js-dist-min";

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

// TODO: Color the plot with the current color ramp?
// TODO: Style the crosshair like the one in the Scatterplot?

const CROSSHAIR_RADIUS: number = 12.5;
const BASE_CROSSHAIR_SPEC: Partial<Plotly.Shape> = {
  ...LINE_SPEC,
  xsizemode: "pixel",
  ysizemode: "pixel",
  yref: undefined,
  y0: 0,
  y1: 0,
  x0: 0,
  x1: 0,
  layer: "above",
  opacity: 0.5,
  line: {
    color: "rgb(31,119,180)", // default plotly color
    width: 2,
    dash: "solid",
  },
};
const X_CROSSHAIR_SPEC: Partial<Plotly.Shape> = {
  ...BASE_CROSSHAIR_SPEC,
  x0: -CROSSHAIR_RADIUS,
  x1: CROSSHAIR_RADIUS,
};
const Y_CROSSHAIR_SPEC: Partial<Plotly.Shape> = {
  ...BASE_CROSSHAIR_SPEC,
  y0: -CROSSHAIR_RADIUS,
  y1: CROSSHAIR_RADIUS,
};

const CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

export type TrackPlotLayoutConfig = {
  time: number;
  hover?: {
    x: number;
    y: number;
  };
};

export default class Plotting {
  private parentRef: HTMLElement;
  private dataset: Dataset | null;
  private trace: Plotly.Data | null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.trace = null;
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

  plot(track: Track, featureKey: string | null, time: number): void {
    if (this.dataset === null || featureKey === null) {
      return;
    }
    const plotinfo = this.dataset?.buildTrackFeaturePlot(track, featureKey);
    this.trace = {
      x: plotinfo.domain,
      y: plotinfo.range,
      type: "scatter",
    };

    const layout: Partial<Plotly.Layout> = {
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

    Plotly.react(this.parentRef, [this.trace], layout, CONFIG);
  }

  updateLayout(config: TrackPlotLayoutConfig): void {
    const shapes: Partial<Plotly.Shape>[] = [
      {
        ...LINE_SPEC,
        x0: config.time,
        x1: config.time,
      },
    ];
    if (config.hover) {
      shapes.push(
        {
          ...X_CROSSHAIR_SPEC,
          xanchor: config.hover.x,
          yanchor: config.hover.y,
        },
        {
          ...Y_CROSSHAIR_SPEC,
          xanchor: config.hover.x,
          yanchor: config.hover.y,
        }
      );
    }
    Plotly.relayout(this.parentRef, { shapes });
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
