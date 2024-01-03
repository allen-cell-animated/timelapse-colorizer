import React, { ReactElement, memo, useDeferredValue, useMemo, useState, useTransition } from "react";
import Plot from "react-plotly.js";
import { Dataset } from "../../colorizer";
import LabeledDropdown from "../LabeledDropdown";
import IconButton from "../IconButton";
import { RetweetOutlined } from "@ant-design/icons";
import { FlexRowAlignCenter } from "../../styles/utils";
import { ColorRampData } from "../../constants";
import { PlotMarker } from "plotly.js-dist-min";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { Button } from "antd";
import styled from "styled-components";

const FRAME_FEATURE = { key: "frame", name: "Frame" };

type ScatterPlotTabProps = {
  dataset: Dataset | null;
  colorRampData: ColorRampData;
  colorRampFeature: string | null;
  colorRampFeatureMin: number;
  colorRampFeatureMax: number;
};
const defaultProps: Partial<ScatterPlotTabProps> = {};

const ScatterPlotContainer = styled.div`
  & canvas {
    border: 0px solid transparent !important;
  }
`;

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const [isPending, startTransition] = useTransition();

  const dataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  const colorRampData = useDeferredValue<ColorRampData>(useDebounce(props.colorRampData, 500));
  const colorRampFeature = useDeferredValue<string | null>(useDebounce(props.colorRampFeature, 500));
  const colorRampFeatureMin = useDeferredValue<number>(useDebounce(props.colorRampFeatureMin, 500));
  const colorRampFeatureMax = useDeferredValue<number>(useDebounce(props.colorRampFeatureMax, 500));

  // const [dataset, setDataset] = useState<Dataset | null>(null);
  // const [colorRampData, setColorRampData] = useState<ColorRampData>(props.colorRampData);
  // const [colorRampFeature, setColorRampFeature] = useState<string | null>(props.colorRampFeature);
  // const [colorRampFeatureMin, setColorRampFeatureMin] = useState<number>(props.colorRampFeatureMin);
  // const [colorRampFeatureMax, setColorRampFeatureMax] = useState<number>(props.colorRampFeatureMax);

  // useMemo(() => {
  //   startTransition(() => {
  //     setDataset(props.dataset);
  //   });
  // }, [props.dataset]);

  // useMemo(() => {
  //   startTransition(() => {
  //     setColorRampFeature(props.colorRampFeature);
  //     setColorRampData(props.colorRampData);
  //     setColorRampFeatureMin(props.colorRampFeatureMin);
  //     setColorRampFeatureMax(props.colorRampFeatureMax);
  //   });
  // }, [props.colorRampData, props.colorRampFeature, props.colorRampFeatureMin, props.colorRampFeatureMax]);

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
      // Transparency is set to 50% (alpha = 0x80)
      colorScale.push([i / (colorStops.length - 1), colorStops[i] + "80"]);
    }
    return colorScale;
  };

  const coloredFeatureData = useMemo(() => getData(colorRampFeature, dataset), [colorRampFeature, dataset]);

  // TODO: Plotly's performance can be improved by generating traces for colors rather than feeding it the raw
  // data and asking it to colorize it. This might be better in a worker?
  // https://www.somesolvedproblems.com/2020/03/improving-plotly-performance-coloring.html

  const colorConfig: Partial<PlotMarker> = useMemo(() => {
    return {
      color: Array.from(coloredFeatureData || [0]),
      cmin: colorRampFeatureMin,
      cmax: colorRampFeatureMax,
      colorscale: colorStopsToColorScale(colorRampData.colorStops),
    };
  }, [coloredFeatureData, colorRampFeatureMin, colorRampFeatureMax, colorRampData]);

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
        <Button style={{ marginLeft: "auto" }}>Sync Coloring</Button>
      </FlexRowAlignCenter>
      <ScatterPlotContainer style={{ marginTop: "10px", width: "100%" }}>
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
                marker: { ...colorConfig, size: 4 },
              },
            ]}
            layout={{
              autosize: true,
              xaxis: { title: xAxisFeatureName || "" },
              yaxis: { title: yAxisFeatureName || "" },
            }}
            useResizeHandler
            config={{ responsive: true }}
          ></Plot>
        )}
      </ScatterPlotContainer>
    </>
  );
});
