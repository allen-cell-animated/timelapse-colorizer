import { Button, Tooltip } from "antd";
import Plotly, { PlotData, PlotMarker } from "plotly.js-dist-min";
import React, { memo, ReactElement, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { Color, ColorRepresentation, HexColorString } from "three";
import { useShallow } from "zustand/shallow";

import { SwitchIconSVG } from "../../assets";
import { Dataset, Track } from "../../colorizer";
import { DrawMode, PlotRangeType, ScatterPlotConfig, ViewerConfig } from "../../colorizer/types";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexRow, FlexRowAlignCenter } from "../../styles/utils";
import { ShowAlertBannerCallback } from "../Banner/hooks";
import { SelectItem } from "../Dropdowns/types";
import {
  DataArray,
  drawCrosshair,
  getBucketIndex,
  getFeatureOrTimeNameWithUnits,
  getHoverTemplate,
  isHistogramEvent,
  makeEmptyTraceData,
  makeLineTrace,
  scaleColorOpacityByMarkerCount,
  SCATTERPLOT_TIME_FEATURE,
  splitTraceData,
  subsampleColorRamp,
  TraceData,
} from "./scatter_plot_data_utils";

import { useViewerStateStore } from "../../colorizer/state/ViewerState";
import { AppThemeContext } from "../AppStyle";
import SelectionDropdown from "../Dropdowns/SelectionDropdown";
import IconButton from "../IconButton";
import LoadingSpinner from "../LoadingSpinner";

// TODO: Translate into seconds/minutes/hours for datasets where frame duration is known?

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

const MAX_POINTS_PER_TRACE = 1024;
const COLOR_RAMP_SUBSAMPLES = 100;
const NUM_RESERVED_BUCKETS = 2;
const BUCKET_INDEX_OUTOFRANGE = 0;
const BUCKET_INDEX_OUTLIERS = 1;
const PLOTLY_CLICK_TIMEOUT_MS = 10;

const DEFAULT_RANGE_TYPE = PlotRangeType.ALL_TIME;

const PLOT_RANGE_SELECT_ITEMS = Object.values(PlotRangeType);

type ScatterPlotTabProps = {
  currentFrame: number;
  selectedTrack: Track | null;
  findTrack: (trackId: number | null, seekToFrame: boolean) => void;
  setFrame: (frame: number) => Promise<void>;
  isVisible: boolean;
  isPlaying: boolean;

  selectedFeatureKey: string | null;
  categoricalPalette: Color[];
  inRangeIds: Uint8Array;

  viewerConfig: ViewerConfig;
  scatterPlotConfig: ScatterPlotConfig;
  updateScatterPlotConfig: (config: Partial<ScatterPlotConfig>) => void;
  showAlert: ShowAlertBannerCallback;
};

const ScatterPlotContainer = styled.div`
  & canvas {
    // Remove Plotly border
    border: 0px solid transparent !important;
  }
`;

/**
 * A tab that displays an interactive scatter plot between two features in the dataset.
 */
export default memo(function ScatterPlotTab(props: ScatterPlotTabProps): ReactElement {
  // ^ Memo prevents re-rendering if the props haven't changed.
  const theme = useContext(AppThemeContext);

  const store = useViewerStateStore(
    useShallow((state) => ({
      dataset: state.dataset,
      colorRampRange: state.colorRampRange,
      colorRamp: state.colorRamp,
      categoricalPalette: state.categoricalPalette,
    }))
  );

  const dataset = useDebounce(store.dataset, 500);
  const colorRamp = store.colorRamp;
  const categoricalPalette = useDebounce(store.categoricalPalette, 100);
  const [colorRampMin, colorRampMax] = useDebounce(store.colorRampRange, 100);

  const [isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is synchronous and can freeze the state update render,
  // so we need to track completion with a separate flag.
  // TODO: `isRendering` sometimes doesn't trigger the loading spinner.
  const [isRendering, setIsRendering] = useState(false);

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  const plotRef = React.useRef<Plotly.PlotlyHTMLElement | null>(null);
  useEffect(() => {
    // Mount the plot to the DOM
    Plotly.newPlot(
      plotDivRef.current!,
      [],
      {
        autosize: true,
        xaxis: { title: xAxisFeatureKey || "" },
        yaxis: { title: yAxisFeatureKey || "" },
      },
      PLOTLY_CONFIG
    ).then((plot) => {
      plotRef.current = plot;
    });
  }, [plotDivRef.current]);

  /** Incrementing UI revision number. Updated whenever a breaking UI change happens and the view must be reset. */
  const uiRevision = useRef(0);

  // Plotly doesn't report click events if empty parts of the canvas are clicked. See
  // https://github.com/plotly/plotly.js/issues/2696. To detect clicks on blank areas of the plot,
  // we have to detect ANY click event and see if a plotly click event is reported within a short
  // time frame. This can happen before OR after plotly reports it, so we need to handle both cases.
  // If no plotly click event was reported, we assume the click was on a blank area of the plot.
  const timeOfLastPointClicked = useRef<number>(0);
  const emptyClickTimeout = useRef<number | null>(null);
  const currentRangeType = useRef<PlotRangeType>(props.scatterPlotConfig.rangeType);
  currentRangeType.current = props.scatterPlotConfig.rangeType;

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  const { selectedTrack, currentFrame, selectedFeatureKey, isPlaying, isVisible, inRangeIds, viewerConfig } = props;

  useEffect(() => {
    const onClick = (): void => {
      // A point was recently clicked so ignore the click event.
      if (timeOfLastPointClicked.current + PLOTLY_CLICK_TIMEOUT_MS > Date.now()) {
        return;
      }
      // Start a timeout to clear the track, which will be cleared if a plotly
      // click event occurs.
      emptyClickTimeout.current = window.setTimeout(() => {
        if (currentRangeType.current !== PlotRangeType.CURRENT_TRACK) {
          props.findTrack(null, false);
        }
      }, PLOTLY_CLICK_TIMEOUT_MS);
    };

    // Attach listener to the XY plot only (and not the histogram or axes)
    const xyPlotDiv = plotDivRef.current?.querySelector(".plot-container .xy");
    xyPlotDiv?.addEventListener("click", onClick);
    return () => {
      xyPlotDiv?.removeEventListener("click", onClick);
    };
  }, [plotDivRef.current, props.findTrack]);

  useMemo(() => {
    if (props.scatterPlotConfig.xAxis === null && props.scatterPlotConfig.yAxis === null && props.selectedFeatureKey) {
      props.updateScatterPlotConfig({
        yAxis: props.selectedFeatureKey,
        xAxis: SCATTERPLOT_TIME_FEATURE.value,
      });
    }
  }, [props.selectedFeatureKey]);

  // Trigger render spinner when playback starts, but only if the render is being delayed.
  // If a render is allowed to happen (such as in the current-track- or current-frame-only
  // range types), `isRendering` will be set to false immediately and the spinner will be hidden again.
  useEffect(() => {
    if (isPlaying) {
      setIsRendering(true);
    }
  }, [isPlaying]);

  const [scatterConfig, _setScatterConfig] = useState(props.scatterPlotConfig);
  useEffect(() => {
    if (props.scatterPlotConfig !== scatterConfig) {
      setIsRendering(true);
      startTransition(() => {
        _setScatterConfig(props.scatterPlotConfig);
      });
    }
  }, [props.scatterPlotConfig]);
  const { xAxis: xAxisFeatureKey, yAxis: yAxisFeatureKey, rangeType } = scatterConfig;

  const isDebouncePending =
    props.scatterPlotConfig !== scatterConfig ||
    dataset !== store.dataset ||
    colorRampMin !== store.colorRampRange[0] ||
    colorRampMax !== store.colorRampRange[1];

  //////////////////////////////////
  // Click Handlers
  //////////////////////////////////

  // Add click event listeners to the plot. When clicking a point, find the track and jump to
  // that frame.
  useEffect(() => {
    const onClickPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (!dataset || eventData.points.length === 0 || isHistogramEvent(eventData)) {
        return;
      }

      // Clear any timeouts for detecting clicks on blank areas of the plot.
      if (emptyClickTimeout.current) {
        clearTimeout(emptyClickTimeout.current);
        emptyClickTimeout.current = null;
      }
      timeOfLastPointClicked.current = Date.now();

      const point = eventData.points[0];
      const objectId = Number.parseInt(point.data.ids[point.pointNumber], 10);
      const trackId = dataset.getTrackId(objectId);
      const frame = dataset.times ? dataset.times[objectId] : undefined;
      if (frame !== undefined) {
        props.setFrame(frame).then(() => {
          props.findTrack(trackId, false);
        });
      } else {
        // Jump to first frame where the track is valid
        props.findTrack(trackId, true);
      }
    };

    plotRef.current?.on("plotly_click", onClickPlot);
    return () => {
      plotRef.current?.removeAllListeners("plotly_click");
    };
  }, [plotRef.current, dataset, props.findTrack, props.setFrame]);

  //////////////////////////////////
  // Helper Methods
  //////////////////////////////////

  /** Retrieve feature data, if it exists. Accounts for the artificially-added time feature. */
  const getData = (featureKey: string | null, dataset: Dataset | null): Uint32Array | Float32Array | undefined => {
    if (featureKey === null || dataset === null) {
      return undefined;
    }
    if (featureKey === SCATTERPLOT_TIME_FEATURE.value) {
      return dataset.times || undefined;
    }
    return dataset.getFeatureData(featureKey)?.data;
  };

  // Track last rendered props + state to make optimizations on re-renders
  type LastRenderedState = {
    rangeType: PlotRangeType;
    xAxisFeatureKey: string | null;
    yAxisFeatureKey: string | null;
    dataset: Dataset | null;
  };

  const lastRenderedState = useRef<LastRenderedState>({
    rangeType: DEFAULT_RANGE_TYPE,
    xAxisFeatureKey: null,
    yAxisFeatureKey: null,
    dataset: dataset,
  });

  /** Returns whether the changes would result in a new plot, requiring the zoom and UI to reset. */
  const shouldPlotUiReset = (): boolean => {
    // Only reset the plot if the axes or range have changed, ignoring the track or frame.
    // This prevents clicking on a new track from resetting the plot view.
    const lastState = lastRenderedState.current;
    const haveAxesChanged =
      lastState.xAxisFeatureKey !== xAxisFeatureKey || lastState.yAxisFeatureKey !== yAxisFeatureKey;
    const hasRangeChanged = lastState.rangeType !== rangeType;
    const hasDatasetChanged = lastState.dataset !== dataset;
    return haveAxesChanged || hasRangeChanged || hasDatasetChanged;
  };

  /** Whether to ignore the render request until later (but continue to show as pending.) */
  const shouldDelayRender = (): boolean => {
    // Don't render when tab is not visible.
    // Also, don't render updates during playback, to prevent blocking the UI.
    return !props.isVisible || (isPlaying && rangeType === PlotRangeType.ALL_TIME);
  };

  const clearPlotAndStopRender = (): void => {
    // TODO: Show histograms on default, cleared layout
    Plotly.react(plotDivRef.current!, [], {}, PLOTLY_CONFIG);
    setIsRendering(false);
  };

  /**
   * Removes data from all indices where xData or yData is NaN or Infinity.
   */
  const sanitizeNumericDataArrays = (
    xData: DataArray,
    yData: DataArray,
    objectIds: number[],
    trackIds: number[]
  ): { xData: DataArray; yData: DataArray; objectIds: number[]; trackIds: number[] } => {
    // Boolean array, true if both x and y are not NaN/infinity
    const isFiniteLut = Array.from(Array(xData.length)).map(
      (_, i) => Number.isFinite(xData[i]) && Number.isFinite(yData[i])
    );

    return {
      xData: xData.filter((_, i) => isFiniteLut[i]),
      yData: yData.filter((_, i) => isFiniteLut[i]),
      objectIds: objectIds.filter((_, i) => isFiniteLut[i]),
      trackIds: trackIds.filter((_, i) => isFiniteLut[i]),
    };
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
    rawXData: DataArray,
    rawYData: DataArray,
    range: PlotRangeType
  ):
    | undefined
    | {
        xData: DataArray;
        yData: DataArray;
        objectIds: number[];
        trackIds: number[];
      } => {
    let xData: DataArray = [];
    let yData: DataArray = [];
    let objectIds: number[] = [];
    let trackIds: number[] = [];

    if (range === PlotRangeType.CURRENT_FRAME) {
      // Filter data to only show the current frame.
      if (!dataset?.times) {
        return undefined;
      }
      for (let i = 0; i < dataset.times.length; i++) {
        if (dataset.times[i] === currentFrame) {
          objectIds.push(i);
          trackIds.push(dataset.getTrackId(i));
          xData.push(rawXData[i]);
          yData.push(rawYData[i]);
        }
      }
    } else if (range === PlotRangeType.CURRENT_TRACK) {
      // Filter data to only show the current track.
      if (!selectedTrack) {
        return { xData: [], yData: [], objectIds: [], trackIds: [] };
      }
      for (let i = 0; i < selectedTrack.ids.length; i++) {
        const id = selectedTrack.ids[i];
        xData.push(rawXData[id]);
        yData.push(rawYData[id]);
      }
      objectIds = Array.from(selectedTrack.ids);
      trackIds = Array(selectedTrack.ids.length).fill(selectedTrack.trackId);
    } else {
      // All time
      objectIds = [...rawXData.keys()];
      trackIds = Array.from(dataset!.trackIds || []);
      // Copying the reference is faster than `Array.from()`.
      xData = rawXData;
      yData = rawYData;
    }
    // TODO: Consider moving this or making it conditional if it causes performance issues.
    return sanitizeNumericDataArrays(xData, yData, objectIds, trackIds);
  };

  /**
   * Creates the scatterplot and histogram axes for a given feature. Normalizes for dataset min/max to
   * prevents axes from jumping during time or track playback.
   * @param featureKey Name of the feature to generate layouts for.
   * @param histogramTrace The default histogram trace configuration.
   * @returns An object with the following keys:
   *  - `scatterPlotAxis`: Layout for the scatter plot axis.
   *  - `histogramAxis`: Layout for the histogram axis.
   *  - `histogramTrace`: A copy of the histogram trace, with potentially updated bin sizes.
   */
  const getAxisLayoutsFromRange = (
    featureKey: string,
    histogramTrace: Partial<PlotData>
  ): {
    scatterPlotAxis: Partial<Plotly.LayoutAxis>;
    histogramAxis: Partial<Plotly.LayoutAxis>;
    histogramTrace: Partial<PlotData>;
  } => {
    let scatterPlotAxis: Partial<Plotly.LayoutAxis> = {
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
    const newHistogramTrace = { ...histogramTrace };

    let min = dataset?.getFeatureData(featureKey)?.min || 0;
    let max = dataset?.getFeatureData(featureKey)?.max || 0;

    // Special case for time feature, which isn't in the dataset
    if (featureKey === SCATTERPLOT_TIME_FEATURE.value) {
      min = 0;
      max = dataset?.numberOfFrames || 0;
    }

    if (dataset && dataset.isFeatureCategorical(featureKey)) {
      // Add extra padding for categories so they're nicely centered
      min -= 0.5;
      max += 0.5;
    } else {
      // Add a little padding to the min/max so points aren't cut off by the edge of the plot.
      // (ideally this would be a pixel padding, but plotly doesn't support that.)
      min -= (max - min) / 10;
      max += (max - min) / 10;
    }
    scatterPlotAxis.range = [min, max];

    // TODO: Show categories as box and whisker plots instead of scatterplot?
    // TODO: Add special handling for integer features once implemented, so their histograms use reasonable
    // bin sizes to prevent jumping.

    if (dataset && dataset.isFeatureCategorical(featureKey)) {
      // Create custom tick marks for the categories
      const categories = dataset.getFeatureCategories(featureKey) || [];
      scatterPlotAxis = {
        ...scatterPlotAxis,
        tickmode: "array",
        tick0: "0", // start at 0
        dtick: "1", // tick increment is 1
        tickvals: [...categories.keys()], // map from category index to category label
        ticktext: categories,
        zeroline: false,
      };
      // Enforce bins on histogram traces for categorical features. This prevents a bug where the histograms
      // would suddenly change width if a category wasn't present in the given data range.
      newHistogramTrace.xbins = { start: min, end: max, size: (max - min) / categories.length };
      // @ts-ignore. TODO: Update once the plotly types are updated.
      newHistogramTrace.ybins = { start: min, end: max, size: (max - min) / categories.length };
    }
    return { scatterPlotAxis, histogramAxis, histogramTrace: newHistogramTrace };
  };

  /**
   * VERY roughly estimate the max width in pixels needed for a categorical feature.
   */
  const estimateTextWidthPxForCategories = (featureKey: string): number => {
    if (featureKey === null || !dataset?.isFeatureCategorical(featureKey)) {
      return 0;
    }
    const categories = dataset.getFeatureCategories(featureKey) || [];
    return (
      categories.reduce((_prev: any, val: string, acc: number) => {
        return Math.max(val.length, acc);
      }, 0) * 8
    );
  };

  /**
   * Applies coloring to point traces in a scatterplot. Does this by splitting the data into multiple traces each with a solid
   * color, which is much faster than using Plotly's native color ramping. Also enforces a maximum number of points
   * per trace, which significantly speeds up Plotly renders.
   *
   * @param xData
   * @param yData
   * @param objectIds
   * @param trackIds
   * @param markerConfig Additional marker configuration to apply to all points. By default,
   * markers are size 4.
   * @param {Color | undefined} overrideColor When defined, uses a base color for all points, instead of
   * calculating based on the color ramp or palette.
   */
  const colorizeScatterplotPoints = (
    xData: DataArray,
    yData: DataArray,
    objectIds: number[],
    trackIds: number[],
    markerConfig: Partial<PlotMarker> & { outliers?: Partial<PlotMarker>; outOfRange?: Partial<PlotMarker> } = {},
    overrideColor?: Color,
    allowHover = true
  ): Partial<PlotData>[] => {
    if (selectedFeatureKey === null || dataset === null || !xAxisFeatureKey || !yAxisFeatureKey) {
      return [];
    }
    const featureData = dataset.getFeatureData(selectedFeatureKey);
    if (!featureData) {
      return [];
    }

    // Generate colors
    const categories = dataset.getFeatureCategories(selectedFeatureKey);
    const isCategorical = categories !== null;
    const usingOverrideColor = markerConfig.color || overrideColor;
    overrideColor = overrideColor || new Color(markerConfig.color as ColorRepresentation);

    let colors: Color[];
    if (usingOverrideColor) {
      // Do no coloring! Keep all points in the same bucket, which will still be split up later.
      colors = [overrideColor];
    } else if (isCategorical) {
      colors = categoricalPalette.slice(0, categories.length);
    } else {
      colors = subsampleColorRamp(colorRamp, COLOR_RAMP_SUBSAMPLES);
    }

    const colorMinValue = isCategorical ? 0 : colorRampMin;
    const colorMaxValue = isCategorical ? categories.length - 1 : colorRampMax;

    // Make a bucket group for each ramp/palette color and for the out-of-range and outliers.
    const traceDataBuckets: TraceData[] = [];
    const overrideColorHex: HexColorString = `#${overrideColor.getHexString()}`;

    let outOfRangeColor: HexColorString = `#${viewerConfig.outOfRangeDrawSettings.color.getHexString()}`;
    let outlierColor: HexColorString = `#${viewerConfig.outlierDrawSettings.color.getHexString()}`;
    const outOfRangeMarker = { ...markerConfig, ...markerConfig.outOfRange };
    const outlierMarker = { ...markerConfig, ...markerConfig.outliers };
    if (usingOverrideColor) {
      outlierColor = overrideColorHex;
      outOfRangeColor = overrideColorHex;
    }

    traceDataBuckets.push(makeEmptyTraceData(outOfRangeColor, outOfRangeMarker)); // 0 = out of range
    traceDataBuckets.push(makeEmptyTraceData(outlierColor, outlierMarker)); // 1 = outliers

    for (let i = NUM_RESERVED_BUCKETS; i < colors.length + NUM_RESERVED_BUCKETS; i++) {
      let color: HexColorString = `#${colors[i - NUM_RESERVED_BUCKETS].getHexString()}`;
      const marker = markerConfig;
      if (usingOverrideColor) {
        color = overrideColorHex;
      }
      traceDataBuckets.push(makeEmptyTraceData(color, marker));
    }

    // Sort data into buckets
    for (let i = 0; i < xData.length; i++) {
      const objectId = objectIds[i];
      const isMinMaxNaN = Number.isNaN(colorMaxValue) && Number.isNaN(colorMinValue);
      const isNaN = Number.isNaN(featureData.data[objectId]);
      const isOutlier = dataset.outliers ? dataset.outliers[objectId] : false;
      const isOutOfRange = inRangeIds[objectId] === 0;

      if (Number.isNaN(objectId) || objectId === undefined || objectId <= 0) {
        continue;
      }

      let bucketIndex;
      if (isOutOfRange) {
        bucketIndex = BUCKET_INDEX_OUTOFRANGE;
      } else if (isOutlier || isNaN || isMinMaxNaN) {
        bucketIndex = BUCKET_INDEX_OUTLIERS;
      } else if (usingOverrideColor) {
        bucketIndex = NUM_RESERVED_BUCKETS;
      } else {
        bucketIndex =
          getBucketIndex(featureData.data[objectId], colorMinValue, colorMaxValue, colors.length) +
          NUM_RESERVED_BUCKETS;
      }

      const bucket = traceDataBuckets[bucketIndex];
      bucket.x.push(xData[i]);
      bucket.y.push(yData[i]);
      bucket.objectIds.push(objectIds[i]);
      bucket.trackIds.push(trackIds[i]);
    }

    // Apply transparency to the colors
    const totalPoints = xData.length;
    const numOutOfRange = traceDataBuckets[BUCKET_INDEX_OUTOFRANGE].x.length;
    const numOutliers = traceDataBuckets[BUCKET_INDEX_OUTLIERS].x.length;
    const numInRange = totalPoints - numOutOfRange - numOutliers;
    // Use total number to calculate transparency for the out of range and outlier buckets, so they do not appear
    // unusually opaque if there are only a small number of points.
    traceDataBuckets[BUCKET_INDEX_OUTOFRANGE].color = scaleColorOpacityByMarkerCount(
      totalPoints,
      traceDataBuckets[BUCKET_INDEX_OUTOFRANGE].color
    );
    traceDataBuckets[BUCKET_INDEX_OUTLIERS].color = scaleColorOpacityByMarkerCount(
      totalPoints,
      traceDataBuckets[BUCKET_INDEX_OUTLIERS].color
    );
    traceDataBuckets.slice(2).forEach((bucket) => {
      bucket.color = scaleColorOpacityByMarkerCount(numInRange, bucket.color);
    });

    // Optionally delete the outlier and out of range buckets to hide the values.
    if (viewerConfig.outlierDrawSettings.mode === DrawMode.HIDE && !markerConfig.outliers) {
      traceDataBuckets.splice(1, 1);
    }
    if (viewerConfig.outOfRangeDrawSettings.mode === DrawMode.HIDE && !markerConfig.outOfRange) {
      traceDataBuckets.splice(0, 1);
    }

    // Transform buckets into traces
    const traces: Partial<PlotData>[] = traceDataBuckets
      .filter((bucket) => bucket.x.length > 0) // Remove empty buckets
      .reduce((acc: TraceData[], bucket: TraceData) => {
        // Split the traces into smaller chunks to prevent plotly from freezing.
        acc.push(...splitTraceData(bucket, MAX_POINTS_PER_TRACE));
        return acc;
      }, [])
      .map((bucket) => {
        return {
          x: bucket.x,
          y: bucket.y,
          ids: bucket.objectIds.map((id) => id.toString()),
          customdata: bucket.trackIds,
          name: "",
          type: "scattergl",
          mode: "markers",
          marker: {
            color: bucket.color,
            size: 4,
            ...bucket.marker,
          },
          hoverinfo: allowHover ? "text" : "skip",
          hovertemplate: allowHover ? getHoverTemplate(dataset, xAxisFeatureKey, yAxisFeatureKey) : undefined,
        };
      });

    return traces;
  };

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  const plotDependencies = [
    dataset,
    xAxisFeatureKey,
    yAxisFeatureKey,
    rangeType,
    currentFrame,
    selectedTrack,
    isVisible,
    isPlaying,
    plotDivRef.current,
    viewerConfig,
    selectedFeatureKey,
    colorRampMin,
    colorRampMax,
    colorRamp,
    inRangeIds,
    categoricalPalette,
  ];

  const renderPlot = (forceRelayout: boolean = false): void => {
    const rawXData = getData(xAxisFeatureKey, dataset);
    const rawYData = getData(yAxisFeatureKey, dataset);

    if (!rawXData || !rawYData || !xAxisFeatureKey || !yAxisFeatureKey || !dataset || !plotDivRef.current) {
      clearPlotAndStopRender();
      return;
    }

    // Filter data by the range type, if applicable
    const result = filterDataByRange(rawXData, rawYData, rangeType);
    if (result === undefined) {
      clearPlotAndStopRender();
      return;
    }
    const { xData, yData, objectIds, trackIds } = result;

    let markerBaseColor = undefined;
    if (rangeType === PlotRangeType.ALL_TIME && selectedTrack) {
      // Use a light grey for other markers when a track is selected.
      markerBaseColor = new Color("#dddddd");
    }

    const isUsingTime =
      xAxisFeatureKey === SCATTERPLOT_TIME_FEATURE.value || yAxisFeatureKey === SCATTERPLOT_TIME_FEATURE.value;

    // Configure traces
    const traces = colorizeScatterplotPoints(
      xData,
      yData,
      objectIds,
      trackIds,
      {},
      markerBaseColor,
      // disable hover for all points other than the track when one is selected
      selectedTrack === null || rangeType !== PlotRangeType.ALL_TIME
    );

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

    traces.push(xHistogram);
    traces.push(yHistogram);

    // Render current track as an extra trace.
    const trackData = filterDataByRange(rawXData, rawYData, PlotRangeType.CURRENT_TRACK);
    if (trackData && rangeType !== PlotRangeType.CURRENT_FRAME) {
      // Render an extra trace for lines connecting the points in the current track when time is a feature.
      if (isUsingTime) {
        traces.push(makeLineTrace(trackData.xData, trackData.yData, trackData.objectIds, trackData.trackIds));
      }
      // Render track points
      const outOfRangeOutlineColor = viewerConfig.outOfRangeDrawSettings.color.clone().multiplyScalar(0.8);
      const trackTraces = colorizeScatterplotPoints(
        trackData.xData,
        trackData.yData,
        trackData.objectIds,
        trackData.trackIds,
        {
          outOfRange: {
            color: theme.color.layout.background,
            line: { width: 1, color: "#" + outOfRangeOutlineColor.getHexString() + "40" },
          },
        }
      );
      traces.push(...trackTraces);
    }

    // Render currently selected object as an extra crosshair trace.
    if (selectedTrack) {
      const currentObjectId = selectedTrack.getIdAtTime(currentFrame);
      if (currentObjectId !== -1) {
        traces.push(...drawCrosshair(rawXData[currentObjectId], rawYData[currentObjectId]));
        traces.push(
          ...colorizeScatterplotPoints(
            [rawXData[currentObjectId]],
            [rawYData[currentObjectId]],
            [currentObjectId],
            [selectedTrack.trackId],
            { size: 4 }
          )
        );
      }
    }

    // Format axes
    const { scatterPlotAxis: scatterPlotXAxis, histogramAxis: histogramXAxis } = getAxisLayoutsFromRange(
      xAxisFeatureKey,
      xHistogram
    );
    const { scatterPlotAxis: scatterPlotYAxis, histogramAxis: histogramYAxis } = getAxisLayoutsFromRange(
      yAxisFeatureKey,
      yHistogram
    );

    scatterPlotXAxis.title = getFeatureOrTimeNameWithUnits(xAxisFeatureKey, dataset);
    // Due to limited space in the Y-axis, hide categorical feature names.
    scatterPlotYAxis.title = dataset.isFeatureCategorical(yAxisFeatureKey)
      ? ""
      : getFeatureOrTimeNameWithUnits(yAxisFeatureKey, dataset);

    // Add extra margin for categorical feature labels on the Y axis.
    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories(yAxisFeatureKey));
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

    if (forceRelayout || shouldPlotUiReset()) {
      uiRevision.current += 1;
      // @ts-ignore. TODO: Update once the plotly types are updated.
      layout.uirevision = uiRevision.current;
    } else {
      // @ts-ignore. TODO: Update once the plotly types are updated.
      layout.uirevision = uiRevision.current;
    }

    try {
      Plotly.react(plotDivRef.current, traces, layout, PLOTLY_CONFIG).then(() => {
        setIsRendering(false);
        lastRenderedState.current = {
          xAxisFeatureKey,
          yAxisFeatureKey,
          rangeType,
          dataset,
        };
      });
    } catch (error) {
      console.error(error);
      props.showAlert({
        message: "Could not update scatter plot.",
        type: "warning",
        closable: true,
        // TODO: add a better handler for different types of error messages. Handle string vs. Error.
        description: [
          'Encountered the following error when rendering the scatter plot: "' + error + '"',
          "This may be due to invalid values in the feature data. If the issue persists, please contact the dataset creator or report an issue from the Help menu.",
        ],
        showDoNotShowAgainCheckbox: true,
      });
      clearPlotAndStopRender();
    }
  };

  /**
   * Re-render the plot when the relevant props change.
   */
  useEffect(() => {
    if (shouldDelayRender()) {
      return;
    }
    renderPlot();
  }, plotDependencies);

  //////////////////////////////////
  // Component Rendering
  //////////////////////////////////

  const menuItems = useMemo((): SelectItem[] => {
    const featureKeys = dataset ? dataset.featureKeys : [];
    const menuItems: SelectItem[] = featureKeys.map((key: string) => {
      return { value: key, label: dataset?.getFeatureNameWithUnits(key) ?? key };
    });
    menuItems.push(SCATTERPLOT_TIME_FEATURE);
    return menuItems;
  }, [dataset]);

  const makeControlBar = (menuItems: SelectItem[]): ReactElement => {
    return (
      <FlexRowAlignCenter $gap={6} style={{ flexWrap: "wrap" }}>
        <SelectionDropdown
          label={"X"}
          selected={xAxisFeatureKey || ""}
          items={menuItems}
          onChange={(key: string) => props.updateScatterPlotConfig({ xAxis: key })}
        />
        <Tooltip title="Swap axes" trigger={["hover", "focus"]}>
          <IconButton
            onClick={() => {
              props.updateScatterPlotConfig({
                xAxis: yAxisFeatureKey,
                yAxis: xAxisFeatureKey,
              });
            }}
            type="link"
          >
            <SwitchIconSVG />
          </IconButton>
        </Tooltip>
        <SelectionDropdown
          label={"Y"}
          selected={yAxisFeatureKey || ""}
          items={menuItems}
          onChange={(key: string) => props.updateScatterPlotConfig({ yAxis: key })}
        />

        <div style={{ marginLeft: "10px" }}>
          <SelectionDropdown
            label={"Show objects from"}
            selected={rangeType}
            items={PLOT_RANGE_SELECT_ITEMS}
            width={"120px"}
            onChange={(value: string) => props.updateScatterPlotConfig({ rangeType: value as PlotRangeType })}
          ></SelectionDropdown>
        </div>
      </FlexRowAlignCenter>
    );
  };

  const makePlotButtons = (): ReactElement => {
    return (
      <FlexRow $gap={6} style={{ position: "absolute", right: "5px", top: "5px", zIndex: 10 }}>
        <Button
          onClick={() => {
            setIsRendering(true);
            props.findTrack(null, false);
          }}
          disabled={selectedTrack === null}
        >
          Clear Track
        </Button>

        <Button
          onClick={() => {
            setIsRendering(true);
            setTimeout(() => renderPlot(true), 100);
          }}
          type="primary"
        >
          Reset Zoom
        </Button>
      </FlexRow>
    );
  };

  return (
    <>
      {makeControlBar(menuItems)}
      <div style={{ position: "relative" }}>
        <LoadingSpinner loading={isPending || isRendering || isDebouncePending} style={{ marginTop: "10px" }}>
          {makePlotButtons()}
          <ScatterPlotContainer
            style={{ width: "100%", height: "475px", padding: "5px" }}
            ref={plotDivRef}
          ></ScatterPlotContainer>
        </LoadingSpinner>
      </div>
    </>
  );
});
