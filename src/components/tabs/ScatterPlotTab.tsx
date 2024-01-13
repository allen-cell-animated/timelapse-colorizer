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

const TIME_FEATURE = { key: "time", name: "Time" };

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
  isVisible: boolean;
};
const defaultProps: Partial<ScatterPlotTabProps> = {};

const ScatterPlotContainer = styled.div`
  & canvas {
    // Remove Plotly border
    border: 0px solid transparent !important;
  }
`;

/**
 * Returns true if the given Plotly mouse event took place over a histogram subplot.
 */
function isHistogramEvent(eventData: Plotly.PlotMouseEvent): boolean {
  return eventData.points[0].data.type === "histogram";
}

/**
 * A tab that displays an interactive scatter plot between two features in the dataset.
 */
export default memo(function ScatterPlotTab(inputProps: ScatterPlotTabProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<ScatterPlotTabProps>;

  const theme = useContext(AppThemeContext);

  const [isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is synchronous and can freeze the state update render,
  // so we need to track completion with a separate flag.
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

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  const [dataset, setDataset] = useState<Dataset | null>(null);

  const propDataset = useDeferredValue<Dataset | null>(useDebounce(props.dataset, 500));
  // Show loading spinner
  useEffect(() => {
    setIsRendering(true);
  }, [props.dataset]);
  // Handle actual dataset
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

  const getData = useCallback(
    (featureName: string | null, dataset: Dataset | null): Uint32Array | Float32Array | undefined => {
      if (featureName === null || dataset === null) {
        return undefined;
      }
      if (featureName === TIME_FEATURE.name) {
        return dataset.times || undefined;
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
  // Helper Methods
  //////////////////////////////////

  /**
   * Returns a hex color string with increasing transparency as the number of markers increases.
   */
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

  /**
   * Returns an object with flags indicating which props have changed since the last render.
   */
  const getChangeFlags = () => {
    const lastState = lastRenderedState.current;
    return {
      haveAxesChanged:
        lastState.xAxisFeatureName !== xAxisFeatureName || lastState.yAxisFeatureName !== yAxisFeatureName,
      hasRangeChanged: lastState.rangeType !== rangeType,
      hasTrackChanged: lastState.selectedTrack !== props.selectedTrack,
      hasFrameChanged: lastState.currentFrame !== props.currentFrame,
      hasDatasetChanged: lastState.dataset !== dataset,
    };
  };

  const shouldRenderUpdate = (): boolean => {
    if (!props.isVisible) {
      return false;
    }
    const flags = getChangeFlags();

    if (flags.haveAxesChanged || flags.hasRangeChanged || flags.hasDatasetChanged || flags.hasTrackChanged) {
      return true;
    }
    // Ignore changes to the current frame if we are not showing the current frame
    if (rangeType !== RangeType.CURRENT_FRAME && flags.hasFrameChanged && !flags.hasTrackChanged) {
      return false;
    }
    // Ignore changes to track if we are not showing by track
    if (rangeType !== RangeType.CURRENT_TRACK && flags.hasTrackChanged && !flags.hasFrameChanged) {
      return false;
    }
    return true;
  };

  const shouldPlotUiReset = (): boolean => {
    const flags = getChangeFlags();
    // If any flags besides frame and track have changed, reset the plot UI.
  };

  const clearPlotAndStopRender = (): void => {
    Plotly.react(plotDivRef.current!, [], {}, PLOTLY_CONFIG);
    setIsRendering(false);
  };

  /**
   * Reduces the given data to only show the selected range (frame, track, or all data points).
   * @param rawXData raw data for the X-axis feature
   * @param rawYData raw data for the Y-axis feature.
   * @returns One of the following:
   *   - `undefined` if the data could not be filtered.
   *   - An object with the following arrays:
   *     - `xData`: The filtered x data.
   *     - `yData`: The filtered y data.
   *     - `objectIds`: The object IDs corresponding to the index of the filtered data.
   */
  const filterDataByRange = (
    rawXData: Uint32Array | Float32Array,
    rawYData: Uint32Array | Float32Array,
    range: RangeType
  ): { xData: number[]; yData: number[]; objectIds: number[] } | undefined => {
    let xData: number[] = [];
    let yData: number[] = [];
    let objectIds: number[] = [];

    if (range === RangeType.CURRENT_FRAME) {
      // Filter data to only show the current frame.
      if (!dataset?.times) {
        return undefined;
      }
      pointNumToObjectId.current = [];
      for (let i = 0; i < dataset.times.length; i++) {
        if (dataset.times[i] === props.currentFrame) {
          objectIds.push(i + 1);
          xData.push(rawXData[i]);
          yData.push(rawYData[i]);
        }
      }
    } else if (range === RangeType.CURRENT_TRACK) {
      // Filter data to only show the current track.
      if (!props.selectedTrack) {
        return undefined;
      }
      for (let i = 0; i < props.selectedTrack.ids.length; i++) {
        const id = props.selectedTrack.ids[i];
        xData.push(rawXData[id]);
        yData.push(rawYData[id]);
      }
      objectIds = Array.from(props.selectedTrack.ids);
    } else {
      // All time
      objectIds = [...Array(rawXData.length).keys()];
      xData = Array.from(rawXData);
      yData = Array.from(rawYData);
    }
    return { xData, yData, objectIds };
  };

  /**
   * Creates the scatterplot and histogram axes for a given feature. Normalizes for dataset min/max to
   * prevents axes from jumping during time or track playback.
   * @param featureName Name of the feature to generate layouts for.
   * @param histogramTrace Histogram trace. Configures the histogram bins if categorical features are chosen.
   * @returns
   */
  const getAxisLayoutsFromRange = (
    featureName: string,
    histogramTrace: Partial<PlotData>
  ): {
    scatterPlotAxis: Partial<Plotly.LayoutAxis>;
    histogramAxis: Partial<Plotly.LayoutAxis>;
    histogramTrace: Partial<PlotData>;
  } => {
    let scatterPlotAxis: Partial<Plotly.LayoutAxis> = {
      // Due to limited space in the Y-axis, hide categorical feature name.
      domain: [0, 0.8],
      showgrid: false,
      zeroline: true,
    };
    const histogramAxis: Partial<Plotly.LayoutAxis> = {
      domain: [0.85, 1],
      showgrid: false,
      zeroline: true,
      hoverformat: "f",
    };

    let min = dataset?.getFeatureData(featureName)?.min || 0;
    let max = dataset?.getFeatureData(featureName)?.max || 0;

    // Special case for time feature, which isn't in the dataset
    if (featureName === TIME_FEATURE.name) {
      min = 0;
      max = dataset?.numberOfFrames || 0;
    }

    if (dataset && dataset.isFeatureCategorical(featureName)) {
      // Add extra padding for categories so they're nicely centered
      min -= 0.5;
      max += 0.5;
    } else {
      // Add a little padding to the min/max so points aren't on the edge of the plot.
      // (ideally this would be a pixel padding, but plotly doesn't support that.)
      min -= (max - min) / 10;
      max += (max - min) / 10;
    }
    scatterPlotAxis.range = [min, max];

    // TODO: Fix histograms during current frame playback so they're relative to the max bin size across
    // all frames? Currently they are shown relative to the current frame's max bin size, which might be misleading.

    // TODO: Add special handling for integer features once implemented, so their histograms use reasonable
    // bin sizes to prevent jumping.

    if (dataset && dataset.isFeatureCategorical(featureName)) {
      // Create custom tick marks for the categories
      const categories = dataset.getFeatureCategories(featureName) || [];
      scatterPlotAxis = {
        ...scatterPlotAxis,
        tickmode: "array",
        tick0: "0", // start at 0
        dtick: "1", // tick increment is 1
        tickvals: [...Array(categories.length).keys()], // map from category index to category label
        ticktext: categories,
        zeroline: false,
      };
      // Enforce histogram traces for categorical features. This prevents a bug where the histograms
      // would suddenly change width if a category wasn't present in the given data range.
      histogramTrace.xbins = { start: min, end: max, size: (max - min) / categories.length };
      // @ts-ignore. TODO: Update once the plotly types are updated.
      histogramTrace.ybins = { start: min, end: max, size: (max - min) / categories.length };
    }
    return { scatterPlotAxis, histogramAxis, histogramTrace };
  };

  /**
   * VERY roughly estimate the max width in pixels needed for a categorical feature.
   */
  const estimateTextWidthPxForCategories = (featureName: string): number => {
    if (featureName === null || !dataset?.isFeatureCategorical(featureName)) {
      return 0;
    }
    const categories = dataset.getFeatureCategories(featureName) || [];
    return (
      categories.reduce((_prev, val, acc) => {
        return Math.max(val.length, acc);
      }, 0) * 8
    );
  };

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  /**
   * Render the plot if the relevant props have changed.
   */
  useEffect(() => {
    if (!shouldRenderUpdate()) {
      setIsRendering(false);
      return;
    }

    let rawXData = getData(xAxisFeatureName, dataset);
    let rawYData = getData(yAxisFeatureName, dataset);

    if (!rawXData || !rawYData || !xAxisFeatureName || !yAxisFeatureName || !dataset || !plotDivRef.current) {
      clearPlotAndStopRender();
      return;
    }

    // Filter data by the range type, if applicable
    const result = filterDataByRange(rawXData, rawYData, rangeType);
    if (!result) {
      clearPlotAndStopRender();
      return;
    }
    const { xData, yData, objectIds } = result;
    pointNumToObjectId.current = objectIds;

    const markerConfig: Partial<PlotMarker> = {
      color: getMarkerColor(xData.length, theme.color.themeDark),
      size: 4,
    };

    // Use the text to save the track ID and object ID for each point.
    const pointInfoText = objectIds.map((objectId) => {
      const trackId = dataset.getTrackId(objectId);
      return `Track ID: ${trackId}<br>Object ID: ${objectId}`;
    });

    // Configure traces
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
        `<br>%{text}`,
    };
    const xHistogram: Partial<Plotly.PlotData> = {
      x: xData,
      name: "x density",
      marker: { color: theme.color.themeLight, line: { color: theme.color.themeDark, width: 1 } },
      yaxis: "y2",
      type: "histogram",
      // @ts-ignore. TODO: Update once the plotly types are updated.
      nbinsx: 20,
    };
    const yHistogram: Partial<PlotData> = {
      y: yData,
      name: "y density",
      marker: { color: theme.color.themeLight, line: { color: theme.color.themeDark, width: 1 } },
      xaxis: "x2",
      type: "histogram",
      // @ts-ignore. TODO: Update once the plotly types are updated.
      nbinsy: 20,
    };

    const traces = [markerTrace, xHistogram, yHistogram];

    if (props.selectedTrack && rangeType !== RangeType.CURRENT_TRACK) {
      // Render current track as an extra trace.
      const trackData = filterDataByRange(rawXData, rawYData, RangeType.CURRENT_TRACK);
      if (trackData) {
        const { xData: trackXData, yData: trackYData } = trackData;
        const trackMarkerTrace: Partial<PlotData> = {
          x: trackXData,
          y: trackYData,
          text: pointInfoText,
          name: "Current track",
          type: "scattergl",
          mode: "markers",
          marker: {
            color: theme.color.themeLight,
            size: 6,
            line: {
              color: theme.color.themeDark,
              width: 1,
            },
          },
          hovertemplate:
            `${xAxisFeatureName}: %{x} ${dataset.getFeatureUnits(xAxisFeatureName)}` +
            `<br>${yAxisFeatureName}: %{y} ${dataset.getFeatureUnits(yAxisFeatureName)}` +
            `<br>%{text}`,
        };
        traces.push(trackMarkerTrace);
      }
    }

    // Configure bins for histograms as needed
    // TODO: Show categories as box and whisker plots?
    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories(yAxisFeatureName));

    // Format axes
    const { scatterPlotAxis: scatterPlotXAxis, histogramAxis: histogramXAxis } = getAxisLayoutsFromRange(
      xAxisFeatureName,
      xHistogram
    );
    const { scatterPlotAxis: scatterPlotYAxis, histogramAxis: histogramYAxis } = getAxisLayoutsFromRange(
      yAxisFeatureName,
      yHistogram
    );

    scatterPlotXAxis.title = dataset.getFeatureNameWithUnits(xAxisFeatureName || "");
    // Due to limited space in the Y-axis, hide categorical feature names.
    scatterPlotYAxis.title = dataset.isFeatureCategorical(yAxisFeatureName)
      ? ""
      : dataset.getFeatureNameWithUnits(yAxisFeatureName || "");

    Plotly.react(
      plotDivRef.current,
      traces,
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
  }, [plotDivRef.current, dataset, xAxisFeatureName, yAxisFeatureName, rangeType, props.currentFrame, props.selectedTrack, props.isVisible]);

  //////////////////////////////////
  // Rendering
  //////////////////////////////////

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  const menuItems: MenuItemType[] = featureNames.map((name) => {
    return { key: name, label: dataset?.getFeatureNameWithUnits(name) };
  });
  menuItems.push({ key: TIME_FEATURE.name, label: TIME_FEATURE.name });

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
            clearPlotAndStopRender();
          }}
        >
          Clear
        </Button>
        <LoadingSpinner loading={isPending || isRendering} style={{ marginTop: "10px" }}>
          <ScatterPlotContainer
            style={{ width: "100%", height: "450px", padding: "5px" }}
            ref={plotDivRef}
          ></ScatterPlotContainer>
        </LoadingSpinner>
      </div>
    </>
  );
});
