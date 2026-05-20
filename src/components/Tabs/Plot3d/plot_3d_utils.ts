import type Plotly from "plotly.js-dist-min";

import type { ColorRamp, Dataset, Track, VectorFieldData } from "src/colorizer";
import { getMovingAverage } from "src/colorizer/utils/data_utils";
import { thresholdVectorFlowFieldByCount } from "src/colorizer/utils/math_utils";

export function make3dConeTrace(
  vectorFieldData: VectorFieldData,
  config: { threshold: number; colorRamp: ColorRamp; colorRampReversed: boolean; coneSize: number }
): Plotly.Data | null {
  if (!vectorFieldData) {
    return null;
  }
  const data = thresholdVectorFlowFieldByCount(vectorFieldData, config.threshold);
  const colorScale = config.colorRamp.getPlotlyColorScale(config.colorRampReversed);
  return {
    type: "cone",
    x: data.xPos,
    y: data.yPos,
    z: data.zPos,
    u: data.xData,
    v: data.yData,
    w: data.zData,
    showscale: false,
    sizemode: "scaled",
    sizeref: config.coneSize,
    colorscale: colorScale,
    hoverinfo: "none",
  } as Plotly.Data;
}

export function make3dTrackPathTrace(
  dataset: Dataset,
  track: Track,
  time: number,
  xAxisFeatureKey: string,
  yAxisFeatureKey: string,
  zAxisFeatureKey: string,
  config: { lineAverageWindow: number; trackColor: string }
): Plotly.Data[] {
  // TODO: Show gaps/discontinuities in the track path?
  const traces = [];

  const ids: number[] = [];
  const times: number[] = [];
  let lastValidId = track.ids[0];
  let lastValidTime = track.startTime();
  for (let t = track.startTime(); t <= track.endTime(); t++) {
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
    `${dataset?.getFeatureNameWithUnits(xAxisFeatureKey) ?? ""}: %{x}<br>` +
    `${dataset?.getFeatureNameWithUnits(yAxisFeatureKey) ?? ""}: %{y}<br>` +
    `${dataset?.getFeatureNameWithUnits(zAxisFeatureKey) ?? ""}: %{z}<br>` +
    `Time: %{customdata}`;

  const xFeatureData = dataset.getFeatureData(xAxisFeatureKey)?.data ?? [];
  const yFeatureData = dataset.getFeatureData(yAxisFeatureKey)?.data ?? [];
  const zFeatureData = dataset.getFeatureData(zAxisFeatureKey)?.data ?? [];
  const xData = getMovingAverage(
    ids.map((id) => xFeatureData[id]),
    config.lineAverageWindow,
    true
  );
  const yData = getMovingAverage(
    ids.map((id) => yFeatureData[id]),
    config.lineAverageWindow,
    true
  );
  const zData = getMovingAverage(
    ids.map((id) => zFeatureData[id]),
    config.lineAverageWindow,
    true
  );

  const scatterPlotTrace: Plotly.Data = {
    x: xData,
    y: yData,
    z: zData,
    // TODO: use customdata to store time?,
    customdata: times,
    mode: "lines",
    type: "scatter3d",
    opacity: 1,
    line: {
      width: 4,
      color: config.trackColor ?? "rgb(80, 80, 80)",
    },
    showlegend: false,
    hovertemplate: hoverTemplate,
  };
  traces.push(scatterPlotTrace);

  // Add a point for the current time
  const currId = track.times.indexOf(time);
  if (currId !== -1) {
    const currentPointTrace: Plotly.Data = {
      x: [xData[currId]],
      y: [yData[currId]],
      z: [zData[currId]],
      customdata: [time],
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

  return traces;
}
