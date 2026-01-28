import Plotly from "plotly.js-dist-min";

import { DEFAULT_CATEGORICAL_PALETTE_KEY, KNOWN_CATEGORICAL_PALETTES } from "src/colorizer/colors/categorical_palettes";
import type Dataset from "src/colorizer/Dataset";
import { TIME_FEATURE_KEY } from "src/colorizer/Dataset";
import type Track from "src/colorizer/Track";
import { getHoverTemplate } from "src/utils/scatter_plot_data_utils";

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

const DEFAULT_LINE_PALETTE = KNOWN_CATEGORICAL_PALETTES.get(DEFAULT_CATEGORICAL_PALETTE_KEY)!.colorStops;

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
      height: 650,
    };

    Plotly.newPlot(this.parentRef, [], layout, CONFIG);
    this.plot = this.plot.bind(this);
  }

  setDataset(dataset: Dataset): void {
    this.dataset = dataset;
  }

  plot(tracks: Map<number, Track>, featureKey: string | null, time: number): void {
    const dataset = this.dataset;
    if (dataset === null || featureKey === null) {
      return;
    }
    const traces: Partial<Plotly.PlotData>[] = Array.from(tracks.values()).map((track, index) => {
      const plotinfo = dataset.buildTrackFeaturePlot(track, featureKey);
      // Add segmentation ID + track ID to customdata for hovertemplate
      const segIds = track.ids.map((id) => dataset.getSegmentationId(id));
      const customData = segIds.map((segId) => {
        return [track.trackId.toString(), segId.toString()];
      });

      return {
        x: plotinfo.domain,
        y: plotinfo.range,
        ids: track.ids.map((id) => id.toString()),
        type: "scatter",
        name: `Track ${track.trackId}`,
        customdata: customData,
        hovertemplate: getHoverTemplate(dataset, TIME_FEATURE_KEY, featureKey),
        line: {
          color: DEFAULT_LINE_PALETTE[index % DEFAULT_LINE_PALETTE.length],
        },
      };
    });

    const title = tracks.size === 1 ? `Track ${Array.from(tracks.keys())[0]}` : tracks.size + " tracks selected";
    const layout: Partial<Plotly.Layout> = {
      yaxis: {
        title: dataset.getFeatureNameWithUnits(featureKey),
      },
      xaxis: {
        title: dataset.getFeatureNameWithUnits(TIME_FEATURE_KEY),
      },
      shapes: [
        {
          ...LINE_SPEC,
          x0: time,
          x1: time,
        },
      ],
      title,
    };

    Plotly.react(this.parentRef, traces, layout, CONFIG);
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
