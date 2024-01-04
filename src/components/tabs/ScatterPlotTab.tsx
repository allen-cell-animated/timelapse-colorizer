import React, {
  ReactElement,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Dataset } from "../../colorizer";
import LabeledDropdown from "../LabeledDropdown";
import IconButton from "../IconButton";
import { RetweetOutlined, SwapOutlined } from "@ant-design/icons";
import { FlexRowAlignCenter } from "../../styles/utils";
import { ColorRampData } from "../../constants";
import { PlotMarker } from "plotly.js-dist-min";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { Button } from "antd";
import styled from "styled-components";
import Plotly from "plotly.js-dist-min";

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

const CONFIG: Partial<Plotly.Config> = {
  displayModeBar: true,
  responsive: true,
};

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const [isPending, startTransition] = useTransition();
  const plotDivRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mount the plot to the DOM
    Plotly.newPlot(
      plotDivRef.current!,
      [],
      {
        autosize: true,
        xaxis: { title: xAxisFeatureName || "" },
        yaxis: { title: yAxisFeatureName || "" },
      },
      CONFIG
    );
  }, [plotDivRef.current]);

  // Note: This does not actually prevent the dataset from blocking the UI thread, it just
  // delays the update slightly until after the dataset loads in so the block is not as noticeable.
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const propDataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  useMemo(() => {
    startTransition(() => {
      setDataset(propDataset);
    });
  }, [propDataset]);

  const colorRampData = useDeferredValue<ColorRampData>(useDebounce(props.colorRampData, 500));
  const colorRampFeature = useDeferredValue<string | null>(useDebounce(props.colorRampFeature, 500));
  const colorRampFeatureMin = useDeferredValue<number>(useDebounce(props.colorRampFeatureMin, 500));
  const colorRampFeatureMax = useDeferredValue<number>(useDebounce(props.colorRampFeatureMax, 500));

  // const [colorRampData, setColorRampData] = useState<ColorRampData>(props.colorRampData);
  // const [colorRampFeature, setColorRampFeature] = useState<string | null>(props.colorRampFeature);
  // const [colorRampFeatureMin, setColorRampFeatureMin] = useState<number>(props.colorRampFeatureMin);
  // const [colorRampFeatureMax, setColorRampFeatureMax] = useState<number>(props.colorRampFeatureMax);

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

  const getData = useCallback(
    (featureName: string | null, dataset: Dataset | null): Uint32Array | Float32Array | null | undefined => {
      if (featureName === null || dataset === null) {
        return undefined;
      }
      if (featureName === FRAME_FEATURE.name) {
        return dataset.times;
      } else {
        return dataset.getFeatureData(featureName).data;
      }
    },
    []
  );

  // Update layout
  useEffect(() => {
    const xData = getData(xAxisFeatureName, dataset);
    const yData = getData(yAxisFeatureName, dataset);
    if (plotDivRef.current === null) {
      return;
    }

    if (!xData || !yData) {
      Plotly.react(plotDivRef.current!, [], {}, CONFIG);
      return;
    }

    const markerConfig: Partial<PlotMarker> = {
      color: "rgba(0, 0, 0, 0.25)",
      size: 4,
    };

    Plotly.react(
      plotDivRef.current,
      [{ x: xData, y: yData, type: "scattergl", mode: "markers", marker: markerConfig }],
      {
        autosize: true,
        xaxis: { title: xAxisFeatureName || "" },
        yaxis: { title: yAxisFeatureName || "" },
      },
      CONFIG
    );
  }, [plotDivRef.current, dataset, xAxisFeatureName, yAxisFeatureName]);

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  featureNames.push(FRAME_FEATURE.name);

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

  return (
    <>
      <FlexRowAlignCenter $gap={6} style={{ flexWrap: "wrap" }}>
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
          type="link"
        >
          <SwapOutlined />
        </IconButton>
        <LabeledDropdown
          label={"Y:"}
          selected={yAxisFeatureName || ""}
          items={featureNames}
          onChange={setYAxisFeatureName}
        />
        <Button
          style={{ marginLeft: "auto" }}
          onClick={() => {
            setXAxisFeatureName(null);
            setYAxisFeatureName(null);
          }}
        >
          Clear
        </Button>
      </FlexRowAlignCenter>
      {isPending ? <p>Loading...</p> : <></>}
      <ScatterPlotContainer
        style={{ marginTop: "10px", width: "100%", height: "100%", padding: "5px" }}
        ref={plotDivRef}
      ></ScatterPlotContainer>
    </>
  );
});
