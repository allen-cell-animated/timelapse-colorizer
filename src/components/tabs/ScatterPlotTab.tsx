import { Button, Tooltip } from "antd";
import { MenuItemType } from "antd/es/menu/hooks/useItems";
import { RetweetOutlined } from "@ant-design/icons";
import Plotly, { PlotData, PlotMarker } from "plotly.js-dist-min";
import React, { ReactElement, memo, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";

import { AppThemeContext } from "../AppStyle";
import { Dataset, Track } from "../../colorizer";
import { remap } from "../../colorizer/utils/math_utils";
import { useTransitionedDebounce } from "../../colorizer/utils/react_utils";
import IconButton from "../IconButton";
import LabeledDropdown from "../LabeledDropdown";
import LoadingSpinner from "../LoadingSpinner";
import { FlexRow, FlexRowAlignCenter } from "../../styles/utils";

/** Extra selectable axis feature, representing the frame number. */
const TIME_FEATURE = { key: "time", name: "Time" };
// TODO: Translate into seconds/minutes/hours for datasets where frame duration is known?

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
  findTrack: (trackId: number | null, seekToFrame: boolean) => void;
  setFrame: (frame: number) => Promise<void>;
  isVisible: boolean;
  isPlaying: boolean;
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

  /** Incrementing UI revision number. Updated whenever a breaking UI change happens and the view must be reset. */
  const [uiRevision, setUiRevision] = useState(0);

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  // TODO: chunk up multiple `useTransition` updates at once?
  const dataset = useTransitionedDebounce(props.dataset, startTransition, () => setIsRendering(true), 500);
  const isPlaying = useTransitionedDebounce(props.isPlaying, startTransition, () => setIsRendering(true), 5);
  const selectedTrack = useTransitionedDebounce(props.selectedTrack, startTransition, () => setIsRendering(true), 0);
  const currentFrame = useTransitionedDebounce(props.currentFrame, startTransition, () => setIsRendering(true), 0);

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
      if (eventData.points.length === 0 || isHistogramEvent(eventData) || !dataset) {
        // User clicked on nothing or on a histogram
        props.findTrack(null, false);
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
  const getChangeFlags = (): {
    haveAxesChanged: boolean;
    hasRangeChanged: boolean;
    hasTrackChanged: boolean;
    hasFrameChanged: boolean;
    hasDatasetChanged: boolean;
  } => {
    const lastState = lastRenderedState.current;
    return {
      haveAxesChanged:
        lastState.xAxisFeatureName !== xAxisFeatureName || lastState.yAxisFeatureName !== yAxisFeatureName,
      hasRangeChanged: lastState.rangeType !== rangeType,
      hasTrackChanged: lastState.selectedTrack !== selectedTrack,
      hasFrameChanged: lastState.currentFrame !== currentFrame,
      hasDatasetChanged: lastState.dataset !== dataset,
    };
  };

  const shouldDelayUpdate = (): boolean => {
    if (!props.isVisible) {
      return true;
    }
    // Do not render updates during playback, to prevent blocking the UI.
    if (isPlaying && rangeType === RangeType.ALL_TIME) {
      return true;
    }
    return false;
  };

  const shouldPlotUiReset = (): boolean => {
    const flags = getChangeFlags();
    // If any flags besides frame and track have changed, reset the plot UI.
    // This prevents clicking on a new track from resetting the plot view.
    return flags.haveAxesChanged || flags.hasRangeChanged || flags.hasDatasetChanged;
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
  ):
    | {
        xData: number[] | Uint32Array | Float32Array;
        yData: number[] | Uint32Array | Float32Array;
        objectIds: number[];
      }
    | undefined => {
    let xData: number[] | Uint32Array | Float32Array = [];
    let yData: number[] | Uint32Array | Float32Array = [];
    let objectIds: number[] = [];

    if (range === RangeType.CURRENT_FRAME) {
      // Filter data to only show the current frame.
      if (!dataset?.times) {
        return undefined;
      }
      pointNumToObjectId.current = [];
      for (let i = 0; i < dataset.times.length; i++) {
        if (dataset.times[i] === currentFrame) {
          objectIds.push(i);
          xData.push(rawXData[i]);
          yData.push(rawYData[i]);
        }
      }
    } else if (range === RangeType.CURRENT_TRACK) {
      // Filter data to only show the current track.
      if (!selectedTrack) {
        return { xData: [], yData: [], objectIds: [] };
      }
      for (let i = 0; i < selectedTrack.ids.length; i++) {
        const id = selectedTrack.ids[i];
        xData.push(rawXData[id]);
        yData.push(rawYData[id]);
      }
      objectIds = Array.from(selectedTrack.ids);
    } else {
      // All time
      objectIds = [...Array(rawXData.length).keys()];
      xData = rawXData;
      yData = rawYData;
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
      categories.reduce((_prev: any, val: string, acc: number) => {
        return Math.max(val.length, acc);
      }, 0) * 8
    );
  };

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  const plotDependencies = [
    dataset,
    xAxisFeatureName,
    yAxisFeatureName,
    rangeType,
    currentFrame,
    selectedTrack,
    props.isVisible,
    isPlaying,
    plotDivRef.current,
  ];

  /**
   * Render the plot if the relevant props have changed.
   */
  const renderPlot = useCallback(() => {
    const rawXData = getData(xAxisFeatureName, dataset);
    const rawYData = getData(yAxisFeatureName, dataset);

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

    // Use a light grey for other markers when a track is selected during the "All time" range view.
    const markerBaseColor = rangeType === RangeType.ALL_TIME && selectedTrack ? "#cccccc" : theme.color.themeDark;
    const markerConfig: Partial<PlotMarker> = {
      color: getMarkerColor(xData.length, markerBaseColor),
      size: 4,
    };
    const hoverTemplate =
      `${xAxisFeatureName}: %{x} ${dataset.getFeatureUnits(xAxisFeatureName)}` +
      `<br>${yAxisFeatureName}: %{y} ${dataset.getFeatureUnits(yAxisFeatureName)}` +
      `<br>%{text}`;
    const isUsingTime = xAxisFeatureName === TIME_FEATURE.name || yAxisFeatureName === TIME_FEATURE.name;

    // Use the text to save the track ID and object ID for each point.
    const generatePointText = (ids: number[]): string[] => {
      return ids.map((id) => {
        const trackId = dataset!.getTrackId(id);
        return `Track ID: ${trackId}<br>Object ID: ${id}`;
      });
    };

    // Configure traces
    const markerTrace: Partial<PlotData> = {
      x: xData,
      y: yData,
      text: generatePointText(objectIds),
      name: "",
      type: "scattergl",
      mode: "markers",
      marker: markerConfig,
      hovertemplate: hoverTemplate,
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

    // TODO: Handle currently selected object on current frame/track.
    // TODO: Maybe broken when clicking on track trace. (only on current frame?)
    if (selectedTrack && rangeType === RangeType.ALL_TIME) {
      // Render current track as an extra trace.
      const trackData = filterDataByRange(rawXData, rawYData, RangeType.CURRENT_TRACK);
      if (trackData) {
        const { xData: trackXData, yData: trackYData } = trackData;
        const trackMarkerTrace: Partial<PlotData> = {
          x: trackXData,
          y: trackYData,
          text: generatePointText(selectedTrack.ids),
          type: "scattergl",
          mode: isUsingTime ? "lines+markers" : "markers",
          marker: {
            color: getMarkerColor(trackXData.length, theme.color.themeDark),
            size: 5,
          },
          hovertemplate: hoverTemplate,
        };
        traces.push(trackMarkerTrace);
      }
    }

    // Render currently selected object as an extra trace.
    if (selectedTrack) {
      const currentObjectId = selectedTrack.getIdAtTime(currentFrame);
      const currentObjectText = generatePointText([currentObjectId]);

      const currentObjectMarkerTrace: Partial<PlotData> = {
        x: [rawXData[currentObjectId]],
        y: [rawYData[currentObjectId]],
        text: currentObjectText,
        type: "scattergl",
        mode: "markers",
        marker: {
          color: theme.color.themeLight,
          size: 10,
          line: {
            color: theme.color.text.primary,
            width: 1,
          },
          symbol: "cross-thin",
        },
        hovertemplate: hoverTemplate,
      };
      traces.push(currentObjectMarkerTrace);
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

    const layout = {
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
    };

    if (shouldPlotUiReset()) {
      setUiRevision(uiRevision + 1);
      // @ts-ignore. TODO: Update once the plotly types are updated.
      layout.uirevision = uiRevision + 1;
    } else {
      // @ts-ignore. TODO: Update once the plotly types are updated.
      layout.uirevision = uiRevision;
    }

    Plotly.react(plotDivRef.current, traces, layout, PLOTLY_CONFIG).then(() => {
      setIsRendering(false);
      lastRenderedState.current = {
        xAxisFeatureName,
        yAxisFeatureName,
        rangeType,
        ...props,
      };
    });
  }, plotDependencies);

  useEffect(() => {
    if (shouldDelayUpdate()) {
      return;
    }
    renderPlot();
  }, plotDependencies);

  //////////////////////////////////
  // Rendering
  //////////////////////////////////

  // TODO: Replace w/ keys
  const featureNames = dataset?.featureNames || [];
  const menuItems: MenuItemType[] = featureNames.map((name: string) => {
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
        <FlexRow $gap={6} style={{ position: "absolute", right: "5px", top: "5px", zIndex: 10 }}>
          {
            // TODO: Implement axes reset, since plotly's default reset behavior uses autorange.
            // See https://community.plotly.com/t/double-click-reset-view-button-to-reset-zoom-doesnt-restore-the-graph-to-its-original-axis-range/15668/12
            /* <Tooltip title="Reset zoom">
            <IconButton
              type="outlined"
              onClick={() => {
                setIsRendering(true);
                renderPlot();
              }}
            >
              <ExpandOutlined />
            </IconButton>
          </Tooltip> */
          }
          <Tooltip title="Clear selected axes">
            <Button
              onClick={() => {
                setXAxisFeatureName(null);
                setYAxisFeatureName(null);
                clearPlotAndStopRender();
              }}
            >
              Clear
            </Button>
          </Tooltip>
        </FlexRow>

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
