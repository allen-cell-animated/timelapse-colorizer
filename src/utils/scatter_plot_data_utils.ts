import { unparse } from "papaparse";
import type { PlotData, PlotMarker, PlotMouseEvent, Shape } from "plotly.js-dist-min";
import type { Color } from "three";

import {
  type ColorRamp,
  CSV_COL_FILTERED,
  CSV_COL_OUTLIER,
  CSV_COL_SEG_ID,
  CSV_COL_TIME_WITH_UNITS,
  CSV_COL_TRACK,
  type Dataset,
  type HexColorString,
} from "src/colorizer";
import { type FeatureData, FeatureType, TIME_FEATURE_KEY, TRACK_FEATURE_KEY } from "src/colorizer/Dataset";
import { remap } from "src/colorizer/utils/math_utils";

export type DataArray = Uint32Array | Float32Array | number[];

export type TraceData = {
  x: number[];
  y: number[];
  objectIds: number[];
  segIds: number[];
  trackIds: number[];
  color: HexColorString;
  marker: Partial<PlotMarker>;
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
 * Buckets are evenly spaced and the first and last buckets center on the min and max values.
 *
 * @param value
 * @param minValue Min value, inclusive.
 * @param maxValue Max value, inclusive.
 * @param numBuckets Number of buckets in the range between min and max values.
 * @returns The index of the nearest bucket that the value should be sorted into, from 0 to `numBuckets - 1`. Clamps the value
 * to the min/max values if it is outside the range.
 *
 * Note: Buckets at the endpoints of the value range are half-sized, as they are centered on `minValue` and `maxValue`
 * and the values out of range are clipped. This matches color ramp gradient behavior.
 * @example
 * ```
 * getBucketIndex(i, 0, 1, 2) = 0 for i < 0.5
 * .                          = 1 for 0.5 <= i
 *
 * getBucketIndex(i, 0, 1, 3) = 0 for i < 0.25
 * .                          = 1 for 0.25 <= i < 0.75
 * .                          = 2 for 0.75 <= i
 * ```
 */
export function getBucketIndex(value: number, minValue: number, maxValue: number, numBuckets: number): number {
  return Math.round(remap(value, minValue, maxValue, 0, numBuckets - 1, true));
}

/** Returns a TraceData object with empty data arrays, and the specified color and marker data.*/
export function makeEmptyTraceData(color: HexColorString, marker: Partial<PlotMarker>): TraceData {
  return {
    x: [],
    y: [],
    objectIds: [],
    segIds: [],
    trackIds: [],
    color,
    marker,
  };
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
      segIds: traceData.segIds.slice(i, end),
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
export function isHistogramEvent(eventData: PlotMouseEvent): boolean {
  return eventData.points.length > 0 && eventData.points[0].data.type === "histogram";
}

/**
 * Appends alpha opacity information to a hex color string, making it less opaque as the number of markers increases.
 */
export function scaleColorOpacityByMarkerCount(numMarkers: number, baseColor: HexColorString): HexColorString {
  if (baseColor.length !== 7) {
    throw new Error("ScatterPlotTab.getMarkerColor: Base color '" + baseColor + "' must be 7-character hex string.");
  }
  // Interpolate linearly between 80% and 25% transparency from 0 up to a max of 1000 markers.
  const opacity = remap(numMarkers, 0, 1000, 0.8, 0.25);
  const opacityString = Math.floor(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return (baseColor + opacityString) as HexColorString;
}

/**
 * Returns a Plotly hovertemplate string for a scatter plot trace.
 * The trace must include the `id` (object ID) and `customdata` (track ID) fields.
 */
export function getHoverTemplate(dataset: Dataset, xAxisFeatureKey: string, yAxisFeatureKey: string): string {
  return (
    `${dataset.getFeatureName(xAxisFeatureKey)}: %{x} ${dataset.getFeatureUnits(xAxisFeatureKey)}` +
    `<br>${dataset.getFeatureName(yAxisFeatureKey)}: %{y} ${dataset.getFeatureUnits(yAxisFeatureKey)}` +
    `<br>Track ID: %{customdata[0]}<br>Label ID: %{customdata[1]}<extra></extra>`
  );
}

/** Draws a simple line graph with the provided data points. */
export function makeLineTrace(
  xData: DataArray,
  yData: DataArray,
  objectIds: number[],
  segIds: number[],
  trackIds: number[],
  hovertemplate?: string
): Partial<PlotData> {
  const stackedCustomData = trackIds.map((id, index) => {
    return [id.toString(), segIds[index].toString()];
  });
  return {
    x: xData,
    y: yData,
    type: "scattergl",
    mode: "lines",
    line: {
      color: "#aaaaaa",
    },
    ids: objectIds.map((id) => id.toString()),
    customdata: stackedCustomData,
    hoverinfo: "skip", // will be overridden if hovertemplate is provided
    hovertemplate,
  };
}

function getLineShape(x: number, y: number, xDim: number, yDim: number, color: string, width: number): Partial<Shape> {
  return {
    xanchor: x,
    yanchor: y,
    x0: -xDim / 2,
    x1: +xDim / 2,
    y0: -yDim / 2,
    y1: +yDim / 2,
    xsizemode: "pixel",
    ysizemode: "pixel",
    type: "line",
    layer: "above",
    line: {
      color,
      width,
    },
  };
}

export function getCrosshairShapes(x: number, y: number): Partial<Shape>[] {
  // Draws a black crosshair with a white transparent outline for contrast.
  return [
    getLineShape(x, y, 12, 0, "#ffffffa0", 4),
    getLineShape(x, y, 0, 12, "#ffffffa0", 4),
    getLineShape(x, y, 12, 0, "#000", 1.2),
    getLineShape(x, y, 0, 12, "#000", 1.2),
  ];
}

/**
 * Transforms an array of PlotData scatterplot points into shapes that can be
 * drawn on a Plotly plot as overlays (e.g., for track dots in the crosshair
 * pass).
 */
export function scatterplotTraceToShapes(traces: Partial<PlotData>[]): Partial<Shape>[] {
  // TODO: This is hacky since we're discarding a bunch of extra work that
  // `colorizeScatterplotPoints` is doing; consider breaking up
  // `colorizeScatterplotPoints` into two separate functions
  // (`getScatterplotTraceData` and `traceDataToTrace`) and changing this function
  // to use the output from `getScatterplotTraceData` instead.
  const shapes: Partial<Shape>[] = [];
  for (const trace of traces) {
    const count = trace.ids?.length ?? 0;
    for (let i = 0; i < count; i++) {
      const x = (trace.x as number[])[i];
      const y = (trace.y as number[])[i];
      const color = (trace.marker?.color as string) ?? "#000";
      const line = trace.marker?.line;
      const lineColor = (line?.color as string) ?? "#0000";
      const lineWidth = (line?.width as number) ?? 0;
      const radius = ((trace.marker?.size as number) ?? 4) / 2;

      shapes.push({
        xanchor: x,
        yanchor: y,
        x0: -radius,
        x1: +radius,
        y0: -radius,
        y1: +radius,
        xsizemode: "pixel",
        ysizemode: "pixel",
        type: "circle",
        layer: "above",
        fillcolor: color,
        line: {
          color: lineColor,
          width: lineWidth,
        },
      });
    }
  }

  return shapes;
}

function isValueOutOfRange(value: number, range?: [number, number]): boolean {
  if (range) {
    // Check if value outside of range (range is treated as inclusive)
    return value < range[0] || value > range[1];
  }
  return false;
}

export function getScatterplotDataAsCsv(
  dataset: Dataset,
  objectIds: number[],
  inRangeLUT: Uint8Array,
  featureKeys: string[],
  featureToRangeFilter: Map<string, [number, number]> = new Map(),
  delimiter: string = ","
): string {
  for (const featureKey of featureKeys) {
    if (!dataset.hasFeatureKey(featureKey)) {
      throw new Error(`Cannot generate CSV data: Missing feature data for key '${featureKey}'.`);
    }
  }
  const allFeatureData = featureKeys.map((featureKey) => dataset.getFeatureData(featureKey)) as FeatureData[];
  const featureNames = featureKeys.map((featureKey) => dataset.getFeatureNameWithUnits(featureKey));
  const headerRow = [
    CSV_COL_SEG_ID,
    CSV_COL_TRACK,
    CSV_COL_TIME_WITH_UNITS,
    ...featureNames,
    CSV_COL_OUTLIER,
    CSV_COL_FILTERED,
  ];

  const csvRows: (string | number)[][] = [];
  for (const id of objectIds) {
    const segId = dataset.getSegmentationId(id);
    const track = dataset.getTrackId(id);
    const time = dataset.getTime(id);

    // Check if track or time are excluded by filters
    let skipRow =
      isValueOutOfRange(track, featureToRangeFilter.get(TRACK_FEATURE_KEY)) ||
      isValueOutOfRange(time, featureToRangeFilter.get(TIME_FEATURE_KEY));
    if (skipRow) {
      continue;
    }

    const row: (string | number)[] = [segId, track, time];
    for (const featureData of allFeatureData) {
      let value: string | number = featureData.data[id];
      // Apply axis filters to exclude points that are outside range.
      if (isValueOutOfRange(value as number, featureToRangeFilter.get(featureData.key))) {
        skipRow = true;
        break;
      }
      // Parse categorical data back into original string labels
      if (featureData.type === FeatureType.CATEGORICAL && featureData.categories) {
        value = featureData.categories[value] ?? "";
      }
      row.push(value);
    }
    if (skipRow) {
      continue;
    }
    // Sort outliers and filtered status after feature columns
    const outlier = dataset.outliers && dataset.outliers[id] === 1 ? "true" : "false";
    const filtered = inRangeLUT[id] === 1 ? "true" : "false";
    row.push(outlier, filtered);
    csvRows.push(row);
  }

  const csvString = unparse(
    { fields: headerRow, data: csvRows },
    { delimiter: delimiter, header: true, escapeFormulae: true }
  );
  return csvString;
}

/**
 * Returns the Plotly configuration for histogram bin sizing for a given
 * feature. Uses a fallback if the feature is missing or categorical.
 */
export function getHistogramBins(dataset: Dataset, featureKey: string, numBins: number): PlotData["xbins"] | undefined {
  const featureData = dataset.getFeatureData(featureKey);
  if (!featureData) {
    return undefined;
  }
  const min = featureData.min ?? 0;
  const max = featureData.max ?? 0;
  if (dataset.isFeatureCategorical(featureKey) || numBins <= 0 || min > max) {
    return undefined;
  }
  return {
    start: min,
    end: max,
    size: (max - min) / numBins,
  };
}
