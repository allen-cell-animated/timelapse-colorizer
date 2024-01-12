import { Button, Tooltip } from "antd";
import { MenuItemType } from "antd/es/menu/hooks/useItems";
import { RetweetOutlined } from "@ant-design/icons";
import Plotly, { PlotData, PlotMarker } from "plotly.js-dist-min";
import React, {
  ReactElement,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import styled from "styled-components";

import { AppThemeContext } from "../AppStyle";
import { Dataset, Track } from "../../colorizer";
import { remap } from "../../colorizer/utils/math_utils";
import { useDebounce } from "../../colorizer/utils/react_utils";
import IconButton from "../IconButton";
import LabeledDropdown from "../LabeledDropdown";
import LoadingSpinner from "../LoadingSpinner";
import { FlexRowAlignCenter } from "../../styles/utils";

const FRAME_FEATURE = { key: "time", name: "Time" };

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

enum RangeType {
  ALL_TIME = "All time",
  CURRENT_TRACK = "Current track",
  CURRENT_FRAME = "Current frame",
}
const DEFAULT_RANGE_TYPE = RangeType.ALL_TIME;

type ScatterPlotTabProps = {
  dataset: Dataset | null;
  currentFrame: number;
  selectedTrack: Track | null;
  findTrack: (trackId: number, seekToFrame: boolean) => void;
  setFrame: (frame: number) => Promise<void>;
};
const defaultProps: Partial<ScatterPlotTabProps> = {};

const ScatterPlotContainer = styled.div`
  & canvas {
    border: 0px solid transparent !important;
  }
`;

function isHistogramEvent(eventData: Plotly.PlotMouseEvent): boolean {
  return eventData.points[0].data.type === "histogram";
}

export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const theme = useContext(AppThemeContext);

  const [isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is async and does not stop the state update, so we need to track
  // completion with a separate flag.
  const [isRendering, setIsRendering] = useState(false);

  /** Maps from the point number to an object's ID in the dataset.
   * Null if the point number maps 1:1 to the dataset object ID.
   */
  const pointNumToObjectId = useRef<number[] | null>();

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  const plotRef = React.useRef<Plotly.PlotlyHTMLElement | null>(null);
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
      PLOTLY_CONFIG
    ).then((plot) => {
      plotRef.current = plot;
    });
  }, [plotDivRef.current]);

  // Note: This does not actually prevent the dataset from blocking the UI thread, it just
  // delays the update slightly until after the dataset loads in so the block is not as noticeable.
  const [dataset, setDataset] = useState<Dataset | null>(null);
  // Show loading spinner as soon as the dataset prop changes, but don't initiate a re-render
  // until after the debounce has settled.
  const propDataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  useEffect(() => {
    setIsRendering(true);
  }, [props.dataset]);
  useMemo(() => {
    startTransition(() => {
      setDataset(propDataset);
    });
  }, [propDataset]);

  // TODO: Implement color ramps in a worker thread. This was originally removed for performance issues.
  // Plotly's performance can be improved by generating traces for colors rather than feeding it the raw
  // data and asking it to colorize it. This might be better in a worker?
  // https://www.somesolvedproblems.com/2020/03/improving-plotly-performance-coloring.html

  // Track last rendered props + state to make smart optimizations on re-renders
  type LastRenderedState = {
    rangeType: RangeType;
    xAxisFeatureName: string | null;
    yAxisFeatureName: string | null;
  } & ScatterPlotTabProps;

  const lastRenderedState = useRef<LastRenderedState>({
    rangeType: DEFAULT_RANGE_TYPE,
    xAxisFeatureName: null,
    yAxisFeatureName: null,
    ...props,
  });

  const [rangeType, _setRangeType] = useState<RangeType>(DEFAULT_RANGE_TYPE);
  const setRangeType = (newRangeType: RangeType): void => {
    if (newRangeType === rangeType) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setRangeType(newRangeType);
    });
  };

  const [xAxisFeatureName, _setXAxisFeatureName] = useState<string | null>(null);
  const setXAxisFeatureName = (newFeatureName: string | null): void => {
    if (newFeatureName === xAxisFeatureName) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setXAxisFeatureName(newFeatureName);
    });
  };
  const [yAxisFeatureName, _setYAxisFeatureName] = useState<string | null>(null);
  const setYAxisFeatureName = (newFeatureName: string | null): void => {
    if (newFeatureName === yAxisFeatureName) {
      return;
    }
    setIsRendering(true);
    startTransition(() => {
      _setYAxisFeatureName(newFeatureName);
    });
  };

  /**
   * Retrieve the feature data for a given feature. For categorical features, also replaces numeric values with the string category names.
   * Returns undefined if the feature data is not available.
   */
  const getData = useCallback(
    (featureName: string | null, dataset: Dataset | null): Uint32Array | Float32Array | null | undefined => {
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

      return dataset.getFeatureData(featureName)?.data;
    },
    []
  );

  // Add click event listeners to the plot
  const onClickPlot = useCallback(
    (eventData: Plotly.PlotMouseEvent): void => {
      console.log("Click");
      if (eventData.points.length === 0 || isHistogramEvent(eventData) || !dataset) {
        // User clicked on nothing or on a histogram
        return;
      }

      const point = eventData.points[0];
      const objectId = pointNumToObjectId.current![point.pointNumber];
      console.log("Point number: " + point.pointNumber + " Object ID: " + objectId);
      const trackId = dataset.getTrackId(objectId);
      const frame = dataset.times ? dataset.times[objectId] : undefined;
      if (frame !== undefined) {
        props.findTrack(trackId, false);
        props.setFrame(frame);
      } else {
        // Jump to first frame where the track is valid
        props.findTrack(trackId, true);
      }
    },
    [dataset, pointNumToObjectId.current, props.findTrack, props.setFrame]
  );

  useEffect(() => {
    // If a user clicks on a point, find the corresponding track and jump to its frame number.
    plotRef.current?.on("plotly_click", onClickPlot);
    return () => {
      plotRef.current?.removeAllListeners("plotly_click");
    };
  }, [plotRef.current, onClickPlot]);

  //////////////////////////////////
  // Plot Updates
  //////////////////////////////////

  const getMarkerColor = (numMarkers: number, baseColor: string): string => {
    // Increase marker transparency as the number of markers increases.
    const opacity = remap(numMarkers, 0, 1000, 0.8, 0.25);

    return (
      baseColor +
      Math.floor(opacity * 255)
        .toString(16)
        .padStart(2, "0")
    );
  };

  useEffect(() => {
    const clearPlotAndStopRender = (): void => {
      Plotly.react(plotDivRef.current!, [], {}, PLOTLY_CONFIG);
      setIsRendering(false);
    };

    const lastState = lastRenderedState.current;

    const haveAxesChanged =
      lastState.xAxisFeatureName !== xAxisFeatureName || lastState.yAxisFeatureName !== yAxisFeatureName;
    const hasRangeChanged = lastState.rangeType !== rangeType;
    const hasTrackChanged = lastState.selectedTrack !== props.selectedTrack;
    const hasFrameChanged = lastState.currentFrame !== props.currentFrame;
    const hasDatasetChanged = lastState.dataset !== dataset;

    if (!haveAxesChanged && !hasRangeChanged && !hasDatasetChanged) {
      // Ignore changes to the current frame if we are not showing the current frame
      if (rangeType !== RangeType.CURRENT_FRAME && hasFrameChanged && !hasTrackChanged) {
        setIsRendering(false);
        return;
      }
      // Ignore changes to track if we are not showing by track
      if (rangeType !== RangeType.CURRENT_TRACK && hasTrackChanged && !hasFrameChanged) {
        setIsRendering(false);
        return;
      }
    }

    if (plotDivRef.current === null) {
      setIsRendering(false);
      return;
    }

    let xData = getData(xAxisFeatureName, dataset);
    let yData = getData(yAxisFeatureName, dataset);

    if (!xData || !yData || !xAxisFeatureName || !yAxisFeatureName || !dataset) {
      clearPlotAndStopRender();
      return;
    }

    // Filter data by range, if applicable
    if (rangeType === RangeType.CURRENT_FRAME) {
      if (!dataset?.times) {
        clearPlotAndStopRender();
        return;
      }
      pointNumToObjectId.current = [];
      for (let i = 0; i < dataset.times.length; i++) {
        if (dataset.times[i] === props.currentFrame) {
          pointNumToObjectId.current.push(i);
        }
      }
      xData = xData.filter((_value, index) => dataset?.times && dataset?.times[index] === props.currentFrame);
      yData = yData.filter((_value, index) => dataset?.times && dataset?.times[index] === props.currentFrame);
    } else if (rangeType === RangeType.CURRENT_TRACK) {
      if (!props.selectedTrack) {
        clearPlotAndStopRender();
        return;
      }
      // TODO: Optimize by turning this into a for loop over the selected track's id's.
      const trackIds = new Set(props.selectedTrack.ids);
      xData = xData.filter((_value, index) => trackIds.has(index));
      yData = yData.filter((_value, index) => trackIds.has(index));
      pointNumToObjectId.current = Array.from(props.selectedTrack.ids);
    } else {
      // All time
      pointNumToObjectId.current = [...Array(xData.length + 1).keys()].slice(1);
      xData = xData;
      yData = yData;
    }

    const markerConfig: Partial<PlotMarker> = {
      color: getMarkerColor(xData.length, theme.color.themeDark),
      size: 4,
    };

    const pointInfoText = pointNumToObjectId.current.map((objectId) => {
      const trackId = dataset.getTrackId(objectId);
      return `Track ID: ${trackId}<br>Object ID: ${objectId}`;
    });

    // Configure traces for Plotly
    const markerTrace: Partial<PlotData> = {
      x: xData,
      y: yData,
      text: pointInfoText,
      name: "",
      type: "scattergl",
      mode: "markers",
      marker: markerConfig,
      hovertemplate:
        `${xAxisFeatureName}: %{x} ${dataset.getFeatureUnits(xAxisFeatureName)}` +
        `<br>${yAxisFeatureName}: %{y} ${dataset.getFeatureUnits(yAxisFeatureName)}` +
        `<extra>%{text}</extra>`,
    };
    var xHistogram: Partial<Plotly.PlotData> = {
      x: xData,
      name: "x density",
      marker: { color: theme.color.themeLight, line: { color: theme.color.themeDark, width: 1 } },
      yaxis: "y2",
      type: "histogram",
      nbinsx: 20,
    };
    var yHistogram: Partial<PlotData> = {
      y: yData,
      name: "y density",
      marker: { color: theme.color.themeLight, line: { color: theme.color.themeDark, width: 1 } },
      xaxis: "x2",
      type: "histogram",
      nbinsy: 20,
    };

    // Configure bins for histograms as needed

    const estimateTextWidthPxForCategories = (): number => {
      if (yAxisFeatureName === null || !dataset?.isFeatureCategorical(yAxisFeatureName)) {
        return 0;
      }
      const categories = dataset.getFeatureCategories(yAxisFeatureName) || [];
      return (
        categories.reduce((_prev, val, acc) => {
          return Math.max(val.length, acc);
        }, 0) * 8
      );
    };

    // TODO: Show categories as box and whisker plots?

    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories());

    // Format axes
    let scatterPlotXAxis: Partial<Plotly.LayoutAxis> = {
      title: dataset.getFeatureNameWithUnits(xAxisFeatureName || ""),
      domain: [0, 0.8],
      showgrid: false,
      zeroline: true,
    };
    let scatterPlotYAxis: Partial<Plotly.LayoutAxis> = {
      // Due to limited space in the Y-axis, hide categorical feature name.
      title: dataset.isFeatureCategorical(yAxisFeatureName)
        ? ""
        : dataset.getFeatureNameWithUnits(yAxisFeatureName || ""),
      domain: [0, 0.8],
      automargin: true,
      showgrid: false,
      zeroline: true,
    };
    let histogramXAxis: Partial<Plotly.LayoutAxis> = {
      domain: [0.85, 1],
      showgrid: false,
      zeroline: true,
    };
    let histogramYAxis: Partial<Plotly.LayoutAxis> = {
      domain: [0.85, 1],
      showgrid: false,
      zeroline: true,
    };

    const formatRange = (
      featureName: string,
      scatterPlotAxis: Partial<Plotly.LayoutAxis>,
      histogramAxis: Partial<Plotly.LayoutAxis>,
      densityTrace: Partial<PlotData>
    ): [Partial<Plotly.LayoutAxis>, Partial<Plotly.LayoutAxis>, Partial<PlotData>] => {
      let min = dataset?.getFeatureData(featureName)?.min || 0;
      let max = dataset?.getFeatureData(featureName)?.max || 0;
      if (max - min >= 1.0) {
        // Ceil/floor the min/max to the nearest integer
        min = Math.floor(min);
        max = Math.ceil(max);
      }
      // Add a little padding to the min/max so points aren't on the edge of the plot
      min -= (max - min) / 10;
      max += (max - min) / 10;
      scatterPlotAxis.range = [min, max];

      // Ignoring the histograms for now, because Plotly's histogram handling is fairly
      // sophisticated and handles a bunch of edge cases.

      // Set up bins for histograms
      // const binSize = (max - min) / 5;
      // densityTrace.xbins = { start: min, end: max, size: binSize };
      // densityTrace.ybins = { start: min, end: max, size: binSize };

      if (dataset.isFeatureCategorical(featureName)) {
        // Categorical data
        // Create custom tick marks for the categories
        const categories = dataset.getFeatureCategories(featureName) || [];
        scatterPlotAxis = {
          ...scatterPlotAxis,
          tickmode: "array",
          tick0: "0",
          dtick: "1",
          tickvals: [...Array(categories.length).keys()],
          ticktext: categories,
          zeroline: false,
        };
      }
      return [scatterPlotAxis, histogramAxis, densityTrace];
    };

    [scatterPlotXAxis, histogramXAxis, xHistogram] = formatRange(
      xAxisFeatureName,
      scatterPlotXAxis,
      histogramXAxis,
      xHistogram
    );
    [scatterPlotYAxis, histogramYAxis, yHistogram] = formatRange(
      yAxisFeatureName,
      scatterPlotYAxis,
      histogramYAxis,
      yHistogram
    );

    Plotly.react(
      plotDivRef.current,
      [markerTrace, xHistogram, yHistogram],
      {
        autosize: true,
        showlegend: false,
        xaxis: scatterPlotXAxis,
        yaxis: scatterPlotYAxis,
        xaxis2: histogramXAxis,
        yaxis2: histogramYAxis,
        margin: { l: leftMarginPx, r: 50, b: 50, t: 20, pad: 4 },
        font: {
          // Unfortunately using the Lato font family causes the text to render with SEVERE
          // aliasing. Using the default plotly font family causes the X and Y axes to be
          // two different fonts, but it's better than using Lato.
          // Possible workarounds include converting the Lato TTF to an SVG font.
          // family: theme.font.family,
          size: 12,
        },
      },
      PLOTLY_CONFIG
    ).then(() => {
      setIsRendering(false);
      lastRenderedState.current = {
        xAxisFeatureName,
        yAxisFeatureName,
        rangeType,
        ...props,
      };
    });
  }, [plotDivRef.current, dataset, xAxisFeatureName, yAxisFeatureName, rangeType, props.currentFrame, props.selectedTrack]);

  //////////////////////////////////
  // Rendering
  //////////////////////////////////

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  const menuItems: MenuItemType[] = featureNames.map((name) => {
    return { key: name, label: dataset?.getFeatureNameWithUnits(name) };
  });
  menuItems.push({ key: FRAME_FEATURE.name, label: FRAME_FEATURE.name });

  return (
    <>
      <FlexRowAlignCenter $gap={6} style={{ flexWrap: "wrap" }}>
        <LabeledDropdown
          label={"X:"}
          selected={xAxisFeatureName || ""}
          items={menuItems}
          onChange={setXAxisFeatureName}
        />
        <Tooltip title="Swap axes">
          <IconButton
            onClick={() => {
              setXAxisFeatureName(yAxisFeatureName);
              setYAxisFeatureName(xAxisFeatureName);
            }}
            type="link"
          >
            <RetweetOutlined />
          </IconButton>
        </Tooltip>
        <LabeledDropdown
          label={"Y:"}
          selected={yAxisFeatureName || ""}
          items={menuItems}
          onChange={setYAxisFeatureName}
        />

        <LabeledDropdown
          label={"Show objects from:"}
          style={{ marginLeft: "10px" }}
          selected={rangeType}
          items={Object.values(RangeType)}
          width={"120px"}
          onChange={(value) => setRangeType(value as RangeType)}
        ></LabeledDropdown>
      </FlexRowAlignCenter>
      <div style={{ position: "relative" }}>
        <Button
          style={{ position: "absolute", right: "5px", top: "5px", zIndex: 10 }}
          onClick={() => {
            setXAxisFeatureName(null);
            setYAxisFeatureName(null);
          }}
        >
          Clear
        </Button>
        <LoadingSpinner loading={isPending || isRendering} style={{ marginTop: "10px" }}>
          <ScatterPlotContainer
            style={{ width: "100%", height: "380px", padding: "5px" }}
            ref={plotDivRef}
          ></ScatterPlotContainer>
        </LoadingSpinner>
      </div>
    </>
  );
});
