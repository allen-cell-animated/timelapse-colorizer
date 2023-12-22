import React, { ReactElement, memo, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Plot from "react-plotly.js";
import { Dataset } from "../../colorizer";
import LabeledDropdown from "../LabeledDropdown";
import IconButton from "../IconButton";
import { RetweetOutlined } from "@ant-design/icons";
import { FlexRowAlignCenter } from "../../styles/utils";
import { ColorRampData } from "../../constants";
import { PlotMarker } from "plotly.js-dist-min";
import { useDebounce } from "../../colorizer/utils/react_utils";

const FRAME_FEATURE = { key: "frame", name: "Frame" };

type ScatterPlotTabProps = {
  dataset: Dataset | null;
  colorRampData: ColorRampData;
  colorRampFeature: string | null;
  colorRampFeatureMin: number;
  colorRampFeatureMax: number;
};
const defaultProps: Partial<ScatterPlotTabProps> = {};

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const [isPending, startTransition] = useTransition();

  const dataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  const colorRampData = useDeferredValue<ColorRampData>(useDebounce(props.colorRampData, 500));
  const colorRampFeature = useDeferredValue<string | null>(useDebounce(props.colorRampFeature, 500));
  const colorRampFeatureMin = useDeferredValue<number>(useDebounce(props.colorRampFeatureMin, 500));
  const colorRampFeatureMax = useDeferredValue<number>(useDebounce(props.colorRampFeatureMax, 500));

  const [xAxisFeatureName, _setXAxisFeatureName] = useState<string | null>(null);
  const setXAxisFeatureName = (featureName: string | null) => {
    startTransition(() => {
      _setXAxisFeatureName(featureName);
    });
  };
  const [yAxisFeatureName, _setYAxisFeatureName] = useState<string | null>(null);
  const setYAxisFeatureName = (featureName: string | null) => {
    startTransition(() => {
      _setYAxisFeatureName(featureName);
    });
  };

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  featureNames.push(FRAME_FEATURE.name);

  const getData = (
    featureName: string | null,
    dataset: Dataset | null
  ): Uint32Array | Float32Array | null | undefined => {
    if (featureName === null || dataset === null) {
      return undefined;
    }
    if (featureName === FRAME_FEATURE.name) {
      return dataset.times;
    } else {
      return dataset.getFeatureData(featureName).data;
    }
  };

  const colorStopsToColorScale = (colorStops: string[]): [number, string][] => {
    const colorScale: [number, string][] = [];
    for (let i = 0; i < colorStops.length; i++) {
      colorScale.push([i / (colorStops.length - 1), colorStops[i] + "80"]);
    }
    return colorScale;
  };

  const coloredFeatureData = useMemo(() => getData(colorRampFeature, dataset), [colorRampFeature, dataset]);
  const colorConfig: Partial<PlotMarker> = {
    color: coloredFeatureData || [0],
    cmin: colorRampFeatureMin,
    cmax: colorRampFeatureMax,
    colorscale: colorStopsToColorScale(colorRampData.colorStops),
  };

  // TODO: memoize to avoid re-rendering
  const xData = useMemo(() => getData(xAxisFeatureName, dataset), [xAxisFeatureName, dataset]);
  const yData = useMemo(() => getData(yAxisFeatureName, dataset), [yAxisFeatureName, dataset]);

  return (
    <>
      <FlexRowAlignCenter $gap={6}>
        <LabeledDropdown
          label={"X:"}
          selected={xAxisFeatureName || ""}
          items={featureNames}
          onChange={setXAxisFeatureName}
        />
        <IconButton
          onClick={() => {
            setXAxisFeatureName(yAxisFeatureName);
            setYAxisFeatureName(xAxisFeatureName);
          }}
        >
          <RetweetOutlined />
        </IconButton>
        <LabeledDropdown
          label={"Y:"}
          selected={yAxisFeatureName || ""}
          items={featureNames}
          onChange={setYAxisFeatureName}
        />
      </FlexRowAlignCenter>
      <div>
        {isPending ? (
          <p>Loading...</p>
        ) : (
          <Plot
            data={[
              {
                x: xData || [],
                y: yData || [],
                type: "scattergl",
                mode: "markers",
                marker: { ...colorConfig },
              },
            ]}
            layout={{
              xaxis: { title: xAxisFeatureName || "" },
              yaxis: { title: yAxisFeatureName || "" },
              width: 640,
              height: 400,
            }}
          ></Plot>
        )}
      </div>
    </>
  );
});
