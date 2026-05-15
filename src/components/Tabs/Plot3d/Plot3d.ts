import Plotly from "plotly.js-dist-min";

import { Dataset, Track } from "src/colorizer";

const CONFIG: Partial<Plotly.Config> = {
  responsive: true,
  frameMargins: 0,
  // Fixes a bug where the plotly logo changes SVG logo colors in the header
  displaylogo: false,
};

const LAYOUT: Partial<Plotly.Layout> = {
  uirevision: "a",
  margin: {
    l: 0,
    r: 0,
    b: 0,
    t: 15,
  },
};

export default class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public tracks: Map<number, Track> | null;
  public xAxisFeatureKey: string | null = null;
  public yAxisFeatureKey: string | null = null;
  public zAxisFeatureKey: string | null = null;

  public coneTrace: Plotly.Data | null = null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.tracks = null;
    this.parentRef = parentRef;

    Plotly.newPlot(this.parentRef, [], {}, CONFIG);

    this.plot = this.plot.bind(this);
  }

  plot(currTime: number): void {
    const traces: Plotly.Data[] = [];

    // TRACE 1: Track path
    if (
      this.tracks &&
      this.tracks.size > 0 &&
      this.dataset &&
      this.xAxisFeatureKey &&
      this.yAxisFeatureKey &&
      this.zAxisFeatureKey
    ) {
      for (const track of this.tracks.values()) {
        const endTime = Math.min(currTime, track.endTime());
        // TODO: Show gaps/discontinuities in the track path?
        const ids: number[] = [];
        const times: number[] = [];
        let lastValidId = track.ids[0];
        let lastValidTime = track.startTime();
        for (let t = track.startTime(); t <= endTime; t++) {
          const id = track.getIdAtTime(t);
          if (id !== null) {
            ids.push(id);
            times.push(t);
            lastValidTime = t;
            lastValidId = id;
          } else {
            ids.push(lastValidId); // Use the last valid ID to fill gaps
            times.push(lastValidTime);
          }
        }

        const hoverTemplate =
          `${this.dataset?.getFeatureNameWithUnits(this.xAxisFeatureKey) ?? ""}: %{x}<br>` +
          `${this.dataset?.getFeatureNameWithUnits(this.yAxisFeatureKey) ?? ""}: %{y}<br>` +
          `${this.dataset?.getFeatureNameWithUnits(this.zAxisFeatureKey) ?? ""}: %{z}<br>` +
          `Time: %{customdata}`;

        const xData = this.dataset.getFeatureData(this.xAxisFeatureKey)?.data ?? [];
        const yData = this.dataset.getFeatureData(this.yAxisFeatureKey)?.data ?? [];
        const zData = this.dataset.getFeatureData(this.zAxisFeatureKey)?.data ?? [];
        if (xData.length > 0 && yData.length > 0 && zData.length > 0) {
          const scatterPlotTrace: Plotly.Data = {
            x: ids.map((id) => xData[id]),
            y: ids.map((id) => yData[id]),
            z: ids.map((id) => zData[id]),
            // TODO: use customdata to store time?,
            customdata: times,
            mode: "lines",
            type: "scatter3d",
            opacity: 1,
            line: {
              width: 4,
              color: "rgb(80, 80, 80)",
            },
            showlegend: false,
            hovertemplate: hoverTemplate,
          };
          traces.push(scatterPlotTrace);

          // Add a point for the current time
          const currId = track.getIdAtTime(currTime);
          if (currId !== -1) {
            const currentPointTrace: Plotly.Data = {
              x: [xData[lastValidId]],
              y: [yData[lastValidId]],
              z: [zData[lastValidId]],
              customdata: [currTime],
              mode: "markers",
              type: "scatter3d",
              marker: {
                size: 3,
                color: "rgb(255, 0, 0)",
              },
              showlegend: false,
              hovertemplate: hoverTemplate,
            };
            traces.push(currentPointTrace);
          }
        }
      }
    }

    // TRACE 2: Arrow plot
    if (this.coneTrace) {
      traces.push(this.coneTrace);
    }

    const makeAxisLayout = (featureKey: string | null): Partial<Plotly.Axis> => {
      if (!featureKey || !this.dataset) {
        return { zeroline: false };
      }
      const featureData = this.dataset.getFeatureData(featureKey);
      if (!featureData) {
        return { title: "" };
      }
      let range: [number, number] = [featureData.min, featureData.max];
      // For flow field features, use the min and max of the data. Adjust min
      //  + max slightly to prevent a bug where cones at the plot edges have
      //  visual artifacts
      range = [featureData.min - Math.abs(featureData.min) * 0.01, featureData.max + Math.abs(featureData.max) * 0.01];

      return {
        title: this.dataset.getFeatureNameWithUnits(featureKey) ?? "",
        range,
        zeroline: false,
      };
    };

    const layout: Partial<Plotly.Layout> = {
      ...LAYOUT,
      scene: {
        xaxis: makeAxisLayout(this.xAxisFeatureKey),
        yaxis: makeAxisLayout(this.yAxisFeatureKey),
        zaxis: makeAxisLayout(this.zAxisFeatureKey),
      },
    };

    Plotly.react(this.parentRef, traces, layout, CONFIG);
  }
}
