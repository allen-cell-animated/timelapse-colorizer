import Plotly, { PlotData } from "plotly.js-dist-min";
import { ColorRamp } from "../../colorizer";
import { remap } from "../../colorizer/utils/math_utils";
import { Color } from "three";

export type DataArray = Uint32Array | Float32Array | number[];

export type TraceData = {
  x: number[];
  y: number[];
  objectIds: number[];
  trackIds: number[];
  color: Color;
  marker: Partial<Plotly.PlotMarker>;
};

/**
 * Sample a color ramp at evenly-spaced points, returning the resulting array of colors.
 * @param {ColorRampData} colorRamp The gradient to sample.
 * @param {number} numColors The number of colors to sample. Must be >= 2.
 * @returns {Color[]} An array of length `numColors` containing the sampled colors.
 */
export function subsampleColorRamp(colorRamp: ColorRamp, numColors: number): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < numColors; i++) {
    colors.push(colorRamp.sample(i / (numColors - 1)));
  }
  return colors;
}

/**
 * Returns the index of a bucket that a value should be sorted into, based on a provided range and number of buckets.
 * Assumes that each bucket is evenly spaced.
 * @param value
 * @param minValue Min value, inclusive.
 * @param maxValue Max value, inclusive.
 * @param numBuckets Number of buckets in the range between min and max values.
 * @returns The index of the nearest bucket that the value should be sorted into, from 0 to `numBuckets - 1`. Clamps the value
 * to the min/max values if it is outside the range.
 */
export function getBucketIndex(value: number, minValue: number, maxValue: number, numBuckets: number): number {
  return Math.round(remap(value, minValue, maxValue, 0, numBuckets - 1, true));
}

/**
 * Splits a trace into one or more smaller subtraces so that all the subtraces have at
 * most `maxPoints` data points.
 * @param traceData The trace to split. (Will not be modified.)
 * @param maxPoints The maximum number of points any subtrace can have.
 * @returns An array of subtraces, with the same color as the original trace. Each will have
 * a (non-overlapping) subset of the original trace's data points.
 */
export function splitTraceData(traceData: TraceData, maxPoints: number): TraceData[] {
  if (traceData.x.length <= maxPoints) {
    return [traceData];
  }
  const traces: TraceData[] = [];
  for (let i = 0; i < traceData.x.length; i += maxPoints) {
    const end = Math.min(i + maxPoints, traceData.x.length);
    const trace: TraceData = {
      x: traceData.x.slice(i, end),
      y: traceData.y.slice(i, end),
      objectIds: traceData.objectIds.slice(i, end),
      trackIds: traceData.trackIds.slice(i, end),
      color: traceData.color,
      marker: traceData.marker,
    };
    traces.push(trace);
  }
  return traces;
}

/**
 * Returns true if a Plotly mouse event took place over a histogram subplot.
 */
export function isHistogramEvent(eventData: Plotly.PlotMouseEvent): boolean {
  return eventData.points.length > 0 && eventData.points[0].data.type === "histogram";
}

/**
 * Returns a hex color string with increasing transparency as the number of markers increases.
 * Base color must be a 7-character RGB hex string (e.g. `#000000`).
 */
export function applyMarkerTransparency(numMarkers: number, baseColor: string): string {
  if (baseColor.length !== 7) {
    throw new Error("ScatterPlotTab.getMarkerColor: Base color '" + baseColor + "' must be 7-character hex string.");
  }
  // Interpolate linearly between 80% and 25% transparency from 0 up to a max of 1000 markers.
  const opacity = remap(numMarkers, 0, 1000, 0.8, 0.25);
  return (
    baseColor +
    Math.floor(opacity * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

/** Draws a simple line graph with the provided data points. */
export function makeLineTrace(xData: DataArray, yData: DataArray): Partial<Plotly.PlotData> {
  return {
    x: xData,
    y: yData,
    type: "scattergl",
    mode: "lines",
    line: {
      color: "#aaaaaa",
    },
  };
}

/**
 * Returns an array of Plotly traces that render a crosshair at the X,Y coordinates.
 */
export function drawCrosshair(x: number, y: number): Partial<PlotData>[] {
  const crosshair: Partial<PlotData> = {
    x: [x],
    y: [y],
    type: "scattergl",
    mode: "markers",
    marker: {
      size: 10,
      line: {
        color: "#000",
        width: 1,
      },
      symbol: "cross-thin",
    },
  };
  // Add a transparent white outline behind the marker for contrast.
  const crosshairBg = { ...crosshair };
  crosshairBg.marker = {
    ...crosshairBg.marker,
    line: {
      color: "#ffffffa0",
      width: 4,
    },
  };
  return [crosshairBg, crosshair];
}
