import React, {
  ReactElement,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Dataset } from "../../colorizer";
import LabeledDropdown from "../LabeledDropdown";
import IconButton from "../IconButton";
import { SwapOutlined } from "@ant-design/icons";
import { FlexRowAlignCenter } from "../../styles/utils";
import { ColorRampData } from "../../constants";
import { PlotData, PlotMarker } from "plotly.js-dist-min";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { Button, Tooltip } from "antd";
import styled from "styled-components";
import Plotly from "plotly.js-dist-min";
import LoadingSpinner from "../LoadingSpinner";
import { AppThemeContext } from "../AppStyle";

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
  displayModeBar: false,
  responsive: true,
};

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const theme = useContext(AppThemeContext);

  const [isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is async and does not stop the state update, so we need to track
  // completion with a separate flag.
  const [isRendering, setIsRendering] = useState(false);

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

  // TODO: Implement color ramps in a worker thread. This was originally removed for performance issues.
  // Plotly's performance can be improved by generating traces for colors rather than feeding it the raw
  // data and asking it to colorize it. This might be better in a worker?
  // https://www.somesolvedproblems.com/2020/03/improving-plotly-performance-coloring.html

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
      setIsRendering(true);
    });
  };
  const [yAxisFeatureName, _setYAxisFeatureName] = useState<string | null>(null);
  const setYAxisFeatureName = (featureName: string | null) => {
    startTransition(() => {
      _setYAxisFeatureName(featureName);
      setIsRendering(true);
    });
  };

  const getData = useCallback(
    (featureName: string | null, dataset: Dataset | null): Uint32Array | Float32Array | string[] | null | undefined => {
      if (featureName === null || dataset === null) {
        return undefined;
      }

      if (featureName === FRAME_FEATURE.name) {
        return dataset.times;
      }

      const featureData = dataset.getFeatureData(featureName);
      if (!featureData) {
        return undefined;
      }

      if (dataset.isFeatureCategorical(featureName)) {
        // Map feature data to string categories
        const categories: string[] = dataset.getFeatureCategories(featureName) || [];
        return Array.from(dataset.getFeatureData(featureName).data).map((value) => {
          return categories[value];
        });
      }

      return dataset.getFeatureData(featureName).data;
    },
    []
  );

  // Update plot layout
  useEffect(() => {
    let xData = getData(xAxisFeatureName, dataset);
    let yData = getData(yAxisFeatureName, dataset);

    if (plotDivRef.current === null) {
      setIsRendering(false);
      return;
    }

    if (!xData || !yData) {
      setIsRendering(false);
      Plotly.react(plotDivRef.current!, [], {}, CONFIG);
      return;
    }

    const markerConfig: Partial<PlotMarker> = {
      color: theme.color.themeDark + "40",
      size: 4,
    };

    const markerTrace: Partial<PlotData> = {
      x: xData,
      y: yData,
      name: "",
      type: "scattergl",
      mode: "markers",
      marker: markerConfig,
    };

    var xDensityTrace: Partial<PlotData> = {
      x: xData,
      name: "x density",
      marker: { color: theme.color.themeLight },
      yaxis: "y2",
      type: "histogram",
    };
    var yDensityTrace: Partial<PlotData> = {
      y: yData,
      name: "y density",
      marker: { color: theme.color.themeLight },
      xaxis: "x2",
      type: "histogram",
    };

    const estimateTextWidthPxForCategories = () => {
      if (yAxisFeatureName === null || !dataset?.isFeatureCategorical(yAxisFeatureName)) {
        return 0;
      }
      const categories = dataset.getFeatureCategories(yAxisFeatureName) || [];
      return (
        categories.reduce((_prev, val, acc) => {
          return Math.max(val.length, acc);
        }, 0) * 10
      );
    };
    // TODO: Show categories as box and whisker plots?

    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories());

    Plotly.react(
      plotDivRef.current,
      [markerTrace, xDensityTrace, yDensityTrace],
      {
        autosize: true,
        showlegend: false,
        xaxis: {
          title: xAxisFeatureName || "",
          domain: [0, 0.8],
          showgrid: false,
          zeroline: true,
        },
        yaxis: { title: yAxisFeatureName || "", domain: [0, 0.8], showgrid: false, zeroline: true },
        xaxis2: { domain: [0.85, 1], showgrid: false, zeroline: true },
        yaxis2: { domain: [0.85, 1], showgrid: false, zeroline: true },
        margin: { l: leftMarginPx, r: 50, b: 50, t: 20, pad: 4 },
      },
      CONFIG
    ).then(() => {
      setIsRendering(false);
    });
  }, [plotDivRef.current, dataset, xAxisFeatureName, yAxisFeatureName]);

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  featureNames.push(FRAME_FEATURE.name);

  return (
    <>
      <FlexRowAlignCenter $gap={6} style={{ flexWrap: "wrap" }}>
        <LabeledDropdown
          label={"X:"}
          selected={xAxisFeatureName || ""}
          items={featureNames}
          onChange={setXAxisFeatureName}
        />
        <Tooltip title="Swap axes">
          <IconButton
            onClick={() => {
              setXAxisFeatureName(yAxisFeatureName);
              setYAxisFeatureName(xAxisFeatureName);
              setIsRendering(true);
            }}
            type="link"
          >
            <SwapOutlined />
          </IconButton>
        </Tooltip>
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
            setIsRendering(true);
          }}
        >
          Clear
        </Button>
      </FlexRowAlignCenter>
      <LoadingSpinner loading={isPending || isRendering} style={{ marginTop: "10px" }}>
        <ScatterPlotContainer
          style={{ width: "100%", height: "400px", padding: "5px" }}
          ref={plotDivRef}
        ></ScatterPlotContainer>
      </LoadingSpinner>
    </>
  );
});
