import Plotly from "plotly.js-dist-min";
import { Color } from "three";

import type { Dataset, Track } from "src/colorizer";
import { make3dTrackPathTrace } from "src/components/Tabs/Plot3d/plot_3d_utils";

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

/**
 * Renders a 3D plot of tracks and vector fields using Plotly.
 */
export default class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public tracks: Map<number, Track> | null;
  public trackToColor: Map<number, Color> | null;
  public baseTrackColor: Color = new Color("rgb(80, 80, 80)");
  public xAxisFeatureKey: string | null = null;
  public yAxisFeatureKey: string | null = null;
  public zAxisFeatureKey: string | null = null;

  public coneTrace: Plotly.Data | null = null;
  public lineAverageWindow: number = 5;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.tracks = null;
    this.trackToColor = null;
    this.parentRef = parentRef;
    Plotly.newPlot(this.parentRef, [], {}, CONFIG);

    this.plot = this.plot.bind(this);
  }

  //// Helper methods /////

  private getTrackColor(trackId: number): string {
    let color = this.baseTrackColor;
    if (this.tracks && this.trackToColor && this.tracks.size > 1) {
      color = this.trackToColor.get(trackId) ?? this.baseTrackColor;
    }
    return "#" + color.getHexString();
  }

  private getTrackTrace(track: Track, time: number): Plotly.Data[] {
    if (!this.dataset || !this.xAxisFeatureKey || !this.yAxisFeatureKey || !this.zAxisFeatureKey) {
      return [];
    }
    // TODO: Store track traces so they don't need to be recalculated on each
    // frame.
    return make3dTrackPathTrace(
      this.dataset,
      track,
      time,
      this.xAxisFeatureKey,
      this.yAxisFeatureKey,
      this.zAxisFeatureKey,
      {
        lineAverageWindow: this.lineAverageWindow,
        trackColor: this.getTrackColor(track.trackId),
      }
    );
  }

  private makeAxisLayout(featureKey: string | null): Partial<Plotly.Axis> {
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
  }

  //// Plotting ////

  plot(currTime: number): void {
    if (!this.dataset || !this.xAxisFeatureKey || !this.yAxisFeatureKey || !this.zAxisFeatureKey) {
      return;
    }

    const traces: Plotly.Data[] = [];
    if (this.tracks) {
      for (const track of this.tracks.values()) {
        traces.push(...this.getTrackTrace(track, currTime));
      }
    }
    if (this.coneTrace) {
      traces.push(this.coneTrace);
    }

    const layout: Partial<Plotly.Layout> = {
      ...LAYOUT,
      scene: {
        xaxis: this.makeAxisLayout(this.xAxisFeatureKey),
        yaxis: this.makeAxisLayout(this.yAxisFeatureKey),
        zaxis: this.makeAxisLayout(this.zAxisFeatureKey),
        // TODO: Allow aspect ratio to be configurable?
        aspectmode: "cube",
      },
    };

    Plotly.react(this.parentRef, traces, layout, CONFIG);
  }
}
