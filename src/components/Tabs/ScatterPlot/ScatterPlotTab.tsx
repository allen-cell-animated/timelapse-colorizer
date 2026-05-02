import { ExportOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import Plotly, { type PlotData } from "plotly.js-dist-min";
import React, { memo, type ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Color } from "three";

import { SwitchIconSVG } from "src/assets";
import type { Dataset } from "src/colorizer";
import { CENTROID_Y_FEATURE_KEY, TIME_FEATURE_KEY } from "src/colorizer/Dataset";
import { PlotRangeType, ViewMode } from "src/colorizer/types";
import { hasAnyValueChanged, isPositiveInteger } from "src/colorizer/utils/data_utils";
import type { ShowAlertBannerCallback } from "src/components/Banner/hooks";
import IconButton from "src/components/Buttons/IconButton";
import TextButton from "src/components/Buttons/TextButton";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import LoadingSpinner from "src/components/LoadingSpinner";
import { SHORTCUT_KEYS } from "src/constants";
import { useIsMouseButtonDownRef } from "src/hooks";
import { useViewerStateStoreDebounced } from "src/hooks/useViewerStateStoreDebounced";
import { colorizeStateSelector } from "src/state";
import { useViewerStateStore } from "src/state/ViewerState";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { downloadCsv } from "src/utils/file_io";
import {
  colorizeScatterplotPoints,
  filterDataByRange,
  getCrosshairShapes,
  getHistogramBins,
  getScatterplotDataAsCsv,
  isHistogramEvent,
  makeLineTrace,
  scatterplotTraceToShapes,
} from "src/utils/scatter_plot_data_utils";
import { areAnyHotkeysPressed } from "src/utils/user_input";

// TODO: Translate into seconds/minutes/hours for datasets where frame duration is known?

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

const DEFAULT_RANGE_TYPE = PlotRangeType.ALL_TIME;

const PLOT_RANGE_SELECT_ITEMS = Object.values(PlotRangeType);

const BIN_COUNTS = [20, 50, 100, 200];

type ScatterPlotTabProps = {
  isVisible: boolean;
  showAlert: ShowAlertBannerCallback;
};

const ScatterPlotContainer = styled.div`
  & canvas {
    // Remove Plotly border
    border: 0px solid transparent !important;
  }
  // Center plot horizontally
  margin: 0 auto;
`;

/**
 * A tab that displays an interactive scatter plot between two features in the dataset.
 */
export default memo(function ScatterPlotTab(props: ScatterPlotTabProps): ReactElement {
  //////////////////////////////////
  // State and Refs
  //////////////////////////////////
  const theme = useContext(AppThemeContext);

  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const outOfRangeDrawSettings = useViewerStateStore((state) => state.outOfRangeDrawSettings);
  const rangeType = useViewerStateStore((state) => state.scatterRangeType);
  const selectedFeatureKey = useViewerStateStore((state) => state.featureKey);
  const tracks = useViewerStateStore((state) => state.tracks);
  const addTracks = useViewerStateStore((state) => state.addTracks);
  const toggleTrack = useViewerStateStore((state) => state.toggleTrack);
  const setTracks = useViewerStateStore((state) => state.setTracks);
  const clearTracks = useViewerStateStore((state) => state.clearTracks);
  const setFrame = useViewerStateStore((state) => state.setFrame);
  const setRangeType = useViewerStateStore((state) => state.setScatterRangeType);
  const setXAxis = useViewerStateStore((state) => state.setScatterXAxis);
  const setYAxis = useViewerStateStore((state) => state.setScatterYAxis);
  const xAxisFeatureKey = useViewerStateStore((state) => state.scatterXAxis);
  const yAxisFeatureKey = useViewerStateStore((state) => state.scatterYAxis);
  const histogramBins = useViewerStateStore((state) => state.scatterHistogramBins);
  const setScatterHistogramBins = useViewerStateStore((state) => state.setScatterHistogramBins);
  const viewMode = useViewerStateStore((state) => state.viewMode);

  const xAxisPlotRange = useRef<[number, number]>([-Infinity, Infinity]);
  const yAxisPlotRange = useRef<[number, number]>([-Infinity, Infinity]);

  const resetXAxisPlotRange = useCallback((): void => {
    xAxisPlotRange.current = [-Infinity, Infinity];
  }, []);
  const resetYAxisPlotRange = useCallback((): void => {
    yAxisPlotRange.current = [-Infinity, Infinity];
  }, []);

  // Debounce changes to the dataset and other frequently-changing values to
  // prevent noticeably blocking the UI thread with a re-render
  const [colorizeConfig, isDebouncePending] = useViewerStateStoreDebounced(colorizeStateSelector, 100, {
    dataset: 500,
  });
  const { dataset } = colorizeConfig;

  const plottedIds = useRef<Set<number>>(new Set());

  const { isVisible } = props;

  // TODO: `isRendering` sometimes doesn't trigger the loading spinner.
  const [isRendering, setIsRendering] = useState(false);

  const plotDivRef = useRef<HTMLDivElement>(null);
  const [plotRef, setPlotRef] = useState<Plotly.PlotlyHTMLElement | null>(null);
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
      setPlotRef(plot);
    });
  }, [plotDivRef.current]);

  /** Incrementing UI revision number. Updated whenever a breaking UI change happens and the view must be reset. */
  const uiRevision = useRef(0);

  const currentRangeType = useRef<PlotRangeType>(rangeType);
  currentRangeType.current = rangeType;

  // Track last rendered props + state to make optimizations on re-renders
  const lastRenderedState = useRef({
    rangeType: DEFAULT_RANGE_TYPE,
    xAxisFeatureKey: null as null | string,
    yAxisFeatureKey: null as null | string,
    dataset: dataset,
  });

  const hasConfigChanged =
    rangeType !== lastRenderedState.current.rangeType ||
    xAxisFeatureKey !== lastRenderedState.current.xAxisFeatureKey ||
    yAxisFeatureKey !== lastRenderedState.current.yAxisFeatureKey;

  useEffect(() => {
    if (hasConfigChanged) {
      setIsRendering(true);
    }
  }, [hasConfigChanged]);

  //////////////////////////////////
  // Event Handlers
  //////////////////////////////////

  const isLeftMouseButtonDownRef = useIsMouseButtonDownRef(0);

  // Store the currently hovered ID in a ref; this will be used to handle click
  // events and tell if the user clicked on a point or not.
  const hoveredIdRef = useRef<number | null>(null);
  useEffect(() => {
    const onHoverPlot = (eventData: Plotly.PlotMouseEvent): void => {
      if (eventData.points.length === 0 || isHistogramEvent(eventData)) {
        hoveredIdRef.current = null;
        return;
      }
      const point = eventData.points[0];
      const objectId = Number.parseInt(point.data.ids[point.pointNumber], 10);
      hoveredIdRef.current = objectId;
    };
    const onUnhoverPlot = (): void => {
      // Ignore unhover during left mouse clicks. If the plot is re-rendered
      // (e.g. `Plotly.relayout`) while the mouse is held down, the hover popup
      // disappears and an erroneous "unhover" event is fired, even if a point
      // is still under the cursor.
      if (isLeftMouseButtonDownRef.current) {
        return;
      }
      hoveredIdRef.current = null;
    };

    plotRef?.on("plotly_hover", onHoverPlot);
    plotRef?.on("plotly_unhover", onUnhoverPlot);
    return () => {
      plotRef?.removeAllListeners("plotly_hover");
      plotRef?.removeAllListeners("plotly_unhover");
    };
  }, [plotRef]);

  /** Selects the clicked track and jumps to the corresponding time. */
  const handleIdClicked = useCallback(
    async (objectId: number) => {
      if (dataset === null) {
        return;
      }
      const trackId = dataset.getTrackId(objectId);
      const track = dataset.getTrack(trackId);
      if (!track) {
        return;
      }
      const frame = dataset.times ? dataset.times[objectId] : track.times[0];
      await setFrame(frame);
      if (currentRangeType.current === PlotRangeType.CURRENT_FRAME) {
        if (areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode)) {
          toggleTrack(track);
        } else {
          // Select only the clicked track.
          setTracks(track);
        }
      } else if (currentRangeType.current === PlotRangeType.ALL_TIME) {
        // Assume we are either selecting a track while none is selected, or selecting
        // a different timepoint in the same track.
        addTracks(track);
      }
    },
    [dataset, setFrame, toggleTrack, setTracks, addTracks]
  );

  /**
   * Clears the selected tracks (if not in multi-select mode or current-track
   * mode).
   */
  const handleBgClicked = useCallback((): void => {
    if (
      currentRangeType.current !== PlotRangeType.CURRENT_TRACK &&
      !areAnyHotkeysPressed(SHORTCUT_KEYS.viewport.multiTrackSelect.keycode)
    ) {
      clearTracks();
    }
  }, [clearTracks]);

  // Handle click events on the XY plot component directly instead of the
  // `plotly_click` event, since it (1) more reliably detects mouse events
  // during time playback, (2) reports clicks on empty space, and (3) ignores
  // axis/histogram clicks.
  useEffect(() => {
    const onClick = async (): Promise<void> => {
      const objectId = hoveredIdRef.current;
      if (objectId !== null) {
        handleIdClicked(objectId);
      } else {
        handleBgClicked();
      }
    };
    const xyPlotDiv = plotDivRef.current?.querySelector(".plot-container .xy");
    xyPlotDiv?.addEventListener("click", onClick);
    return () => {
      xyPlotDiv?.removeEventListener("click", onClick);
    };
  }, [plotDivRef.current, handleIdClicked, handleBgClicked]);

  // Sync axis ranges on relayout events (zoom)
  useEffect(() => {
    const onRelayout = (eventData: Plotly.PlotRelayoutEvent): void => {
      if (eventData["xaxis.autorange"]) {
        resetXAxisPlotRange();
      } else {
        const xRange0 = eventData["xaxis.range[0]"] ?? xAxisPlotRange.current[0];
        const xRange1 = eventData["xaxis.range[1]"] ?? xAxisPlotRange.current[1];
        xAxisPlotRange.current[0] = Math.min(xRange0, xRange1);
        xAxisPlotRange.current[1] = Math.max(xRange0, xRange1);
      }
      if (eventData["yaxis.autorange"]) {
        resetYAxisPlotRange();
      } else {
        const yRange0 = eventData["yaxis.range[0]"] ?? yAxisPlotRange.current[0];
        const yRange1 = eventData["yaxis.range[1]"] ?? yAxisPlotRange.current[1];
        yAxisPlotRange.current[0] = Math.min(yRange0, yRange1);
        yAxisPlotRange.current[1] = Math.max(yRange0, yRange1);
      }
    };
    plotRef?.on("plotly_relayout", onRelayout);
    return () => {
      plotRef?.removeAllListeners("plotly_relayout");
    };
  }, [plotRef, resetXAxisPlotRange, resetYAxisPlotRange]);

  //////////////////////////////////
  // Helper Methods
  //////////////////////////////////

  /** Retrieve feature data, if it exists. */
  const getData = (featureKey: string | null, dataset: Dataset | null): Uint32Array | Float32Array | undefined => {
    if (featureKey === null || dataset === null) {
      return undefined;
    }
    return dataset.getFeatureData(featureKey)?.data;
  };

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

  const clearPlotAndStopRender = (): void => {
    // TODO: Show histograms on default, cleared layout
    Plotly.react(plotDivRef.current!, [], {}, PLOTLY_CONFIG);
    setIsRendering(false);
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
      domain: [0, 0.85],
      showgrid: false,
      showline: true,
      zeroline: true,
    };
    const histogramAxis: Partial<Plotly.LayoutAxis> = {
      domain: [0.9, 1],
      showgrid: false,
      hoverformat: "f",
    };
    const newHistogramTrace = { ...histogramTrace };

    let min = dataset?.getFeatureData(featureKey)?.min || 0;
    let max = dataset?.getFeatureData(featureKey)?.max || 0;

    if (0 < min && min < (max - min) / 20) {
      // If min is close to zero (within 5% of the range), snap to zero.
      min = 0;
    }
    if (dataset && dataset.isFeatureCategorical(featureKey)) {
      // Add extra padding for categories so they're nicely centered
      min -= 0.5;
      max += 0.5;
    } else {
      // Add a little padding to the max so points aren't cut off by the edge of the plot.
      // (ideally this would be a pixel padding, but plotly doesn't support that.)
      max += (max - min) / 100;
    }
    scatterPlotAxis.range = [min, max];
    if (viewMode === ViewMode.VIEW_2D && featureKey === CENTROID_Y_FEATURE_KEY) {
      // In 2D mode, the origin (0,0) is in the top left corner, versus in plot
      // the origin is in the bottom left by default. Reverse the Y-axis
      // centroid value in 2D so the plot matches the onscreen objects.
      scatterPlotAxis.range = [max, min];
    }

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

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  // Plot dependencies, not including time.
  const basePlotDependencies = [
    ...Array.from(Object.values(colorizeConfig)),
    xAxisFeatureKey,
    yAxisFeatureKey,
    histogramBins,
    rangeType,
    tracks,
    isVisible,
    plotDivRef.current,
    resetXAxisPlotRange,
    resetYAxisPlotRange,
  ];

  const prevDependenciesRef = useRef<typeof basePlotDependencies | null>(null);
  const rawXDataRef = useRef<Uint32Array | Float32Array | undefined>(undefined);
  const rawYDataRef = useRef<Uint32Array | Float32Array | undefined>(undefined);

  /**
   * Returns an array of shapes that draw a crosshair + colored scatterplot dot over the
   * points in selected tracks visible in the current frame.
   */
  const getCurrentFrameShapes = (): Partial<Plotly.Shape>[] => {
    const crosshairShapes: Partial<Plotly.Shape>[] = [];
    if (!rawXDataRef.current || !rawYDataRef.current || !dataset) {
      return [];
    }
    const xData: number[] = [];
    const yData: number[] = [];
    const ids: number[] = [];
    const segIds: number[] = [];
    const trackIds: number[] = [];
    for (const track of tracks.values()) {
      const currentObjectId = track.getIdAtTime(currentFrame);
      if (currentObjectId !== -1) {
        // Get crosshair for this shape and store data for rendering the dots
        crosshairShapes.push(
          ...getCrosshairShapes(rawXDataRef.current[currentObjectId], rawYDataRef.current[currentObjectId])
        );
        xData.push(rawXDataRef.current[currentObjectId]);
        yData.push(rawYDataRef.current[currentObjectId]);
        ids.push(currentObjectId);
        segIds.push(dataset!.getSegmentationId(currentObjectId));
        trackIds.push(track.trackId);
      }
    }
    const outOfRangeOutlineColor = outOfRangeDrawSettings.color.clone().multiplyScalar(0.8);

    // Render the dots. See TODO in `scatterplotTraceToShapes` for refactoring
    // `colorizeScatterplotPoints`.
    const pointShapes = scatterplotTraceToShapes(
      colorizeScatterplotPoints(colorizeConfig, xAxisFeatureKey, yAxisFeatureKey, xData, yData, ids, segIds, trackIds, {
        outOfRange: {
          color: theme.color.layout.background,
          line: { width: 2, color: "#" + outOfRangeOutlineColor.getHexString() + "40" },
        },
      })
    );
    return crosshairShapes.concat(pointShapes);
  };

  const renderPlot = (forceRelayout: boolean = false): void => {
    const rawXData = getData(xAxisFeatureKey, dataset);
    const rawYData = getData(yAxisFeatureKey, dataset);
    // Save raw data for drawing layout traces
    rawXDataRef.current = rawXData;
    rawYDataRef.current = rawYData;

    if (!rawXData || !rawYData || !xAxisFeatureKey || !yAxisFeatureKey || !dataset || !plotDivRef.current) {
      clearPlotAndStopRender();
      return;
    }

    // Filter data by the range type, if applicable
    const result = filterDataByRange(dataset, currentFrame, rawXData, rawYData, rangeType);
    if (result === undefined) {
      clearPlotAndStopRender();
      return;
    }
    const { xData, yData, segIds, objectIds, trackIds } = result;

    plottedIds.current = new Set(objectIds);

    let markerBaseColor = undefined;
    if (rangeType === PlotRangeType.ALL_TIME && tracks.size > 0) {
      // Use a light grey for other markers when a track is selected.
      markerBaseColor = new Color("#dddddd");
    }

    const isUsingTime = xAxisFeatureKey === TIME_FEATURE_KEY || yAxisFeatureKey === TIME_FEATURE_KEY;

    // Configure traces
    const traces = colorizeScatterplotPoints(
      colorizeConfig,
      xAxisFeatureKey,
      yAxisFeatureKey,
      xData,
      yData,
      objectIds,
      segIds,
      trackIds,
      {},
      markerBaseColor,
      // disable hover for all points other than the track when one is selected
      tracks.size === 0 || rangeType !== PlotRangeType.ALL_TIME
    );
    const shapes: Partial<Plotly.Shape>[] = [];

    const xHistogram: Partial<Plotly.PlotData> = {
      x: xData,
      name: "x density",
      marker: { color: theme.color.plots.histogram, line: { color: theme.color.plots.histogramOutline, width: 1 } },
      yaxis: "y2",
      type: "histogram",
      // @ts-ignore. TODO: Update once the plotly types are updated.
      xbins: getHistogramBins(dataset, xAxisFeatureKey, histogramBins),
      // When using categorical features, use a fallback of 20 bins for nicer
      // spacing/alignment of auto-generated bins.
      // @ts-ignore. TODO: Update once the plotly types are updated.
      nbinsx: 20,
    };
    const yHistogram: Partial<PlotData> = {
      y: yData,
      name: "y density",
      marker: { color: theme.color.plots.histogram, line: { color: theme.color.plots.histogramOutline, width: 1 } },
      xaxis: "x2",
      type: "histogram",
      // @ts-ignore. TODO: Update once the plotly types are updated.
      ybins: getHistogramBins(dataset, yAxisFeatureKey, histogramBins),
      // @ts-ignore. TODO: Update once the plotly types are updated.
      nbinsy: 20,
    };

    traces.push(xHistogram);
    traces.push(yHistogram);

    // Render current track as an extra trace.
    for (const track of tracks.values()) {
      const trackData = filterDataByRange(
        dataset,
        currentFrame,
        rawXData,
        rawYData,
        PlotRangeType.CURRENT_TRACK,
        track
      );
      if (trackData && rangeType !== PlotRangeType.CURRENT_FRAME) {
        // Render an extra trace for lines connecting the points in the current track when time is a feature.
        if (isUsingTime) {
          traces.push(
            makeLineTrace(trackData.xData, trackData.yData, trackData.objectIds, trackData.segIds, trackData.trackIds)
          );
        }
        // Connect track points as a line trace.
        const outOfRangeOutlineColor = outOfRangeDrawSettings.color.clone().multiplyScalar(0.8);
        const trackTraces = colorizeScatterplotPoints(
          colorizeConfig,
          xAxisFeatureKey,
          yAxisFeatureKey,
          trackData.xData,
          trackData.yData,
          trackData.objectIds,
          trackData.segIds,
          trackData.trackIds,
          {
            outOfRange: {
              color: theme.color.layout.background,
              line: { width: 1, color: "#" + outOfRangeOutlineColor.getHexString() + "40" },
            },
          }
        );
        traces.push(...trackTraces);
        plottedIds.current = new Set([...plottedIds.current, ...trackData.objectIds]);
      }
    }

    // Render crosshair at the current time for all tracks.
    shapes.push(...getCurrentFrameShapes());

    // Format axes
    const { scatterPlotAxis: scatterPlotXAxis, histogramAxis: histogramXAxis } = getAxisLayoutsFromRange(
      xAxisFeatureKey,
      xHistogram
    );
    const { scatterPlotAxis: scatterPlotYAxis, histogramAxis: histogramYAxis } = getAxisLayoutsFromRange(
      yAxisFeatureKey,
      yHistogram
    );

    scatterPlotXAxis.title = dataset.getFeatureNameWithUnits(xAxisFeatureKey);
    // Due to limited space in the Y-axis, hide categorical feature names.
    scatterPlotYAxis.title = dataset.isFeatureCategorical(yAxisFeatureKey)
      ? ""
      : dataset.getFeatureNameWithUnits(yAxisFeatureKey);

    // Add extra margin for categorical feature labels on the Y axis.
    const leftMarginPx = Math.max(60, estimateTextWidthPxForCategories(yAxisFeatureKey));
    const layout: Partial<Plotly.Layout> = {
      autosize: true,
      showlegend: false,
      xaxis: scatterPlotXAxis,
      yaxis: scatterPlotYAxis,
      xaxis2: histogramXAxis,
      yaxis2: histogramYAxis,
      margin: { l: leftMarginPx, r: 50, b: 50, t: 20 },
      font: {
        // Unfortunately using the Lato font family causes the text to render with SEVERE
        // aliasing. Using the default plotly font family causes the X and Y axes to be
        // two different fonts, but it's better than using Lato.
        // Possible workarounds include converting the Lato TTF to an SVG font.
        // family: theme.font.family,
        size: 12,
      },
      shapes,
    };

    if (forceRelayout || shouldPlotUiReset()) {
      uiRevision.current += 1;
      // Reset axis ranges because zoom will be reset.
      resetXAxisPlotRange();
      resetYAxisPlotRange();
    }
    // @ts-ignore. TODO: Update once the plotly types are updated.
    layout.uirevision = uiRevision.current;

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
    if (!isVisible) {
      return;
    }
    const hasOnlyFrameChanged = !hasAnyValueChanged(basePlotDependencies, prevDependenciesRef.current);
    const shouldSkipFrameChangeRender = hasOnlyFrameChanged && rangeType === PlotRangeType.ALL_TIME;
    if (shouldSkipFrameChangeRender && plotDivRef.current !== null) {
      // Only the frame changed, so we can skip the render and just do a relayout instead.
      Plotly.relayout(plotDivRef.current, { shapes: getCurrentFrameShapes() });
      return;
    }
    setIsRendering(true);
    renderPlot();
    prevDependenciesRef.current = basePlotDependencies;
  }, [...basePlotDependencies, currentFrame]);

  //////////////////////////////////
  // Component Rendering
  //////////////////////////////////

  const canDownloadScatterPlotCsv =
    dataset !== null && xAxisFeatureKey !== null && yAxisFeatureKey !== null && selectedFeatureKey !== null;

  const downloadScatterPlotCsv = useCallback(() => {
    if (!canDownloadScatterPlotCsv) {
      return;
    }
    const viewerState = useViewerStateStore.getState();
    const featureSet = new Set([xAxisFeatureKey, yAxisFeatureKey, selectedFeatureKey]);
    // Remove time as a feature axis if present, since it's included already as
    // a metadata column in the CSV.
    featureSet.delete(TIME_FEATURE_KEY);
    const features = Array.from(featureSet);
    const filters = new Map([
      [xAxisFeatureKey, xAxisPlotRange.current],
      [yAxisFeatureKey, yAxisPlotRange.current],
    ]);
    const csvString = getScatterplotDataAsCsv(
      dataset,
      Array.from(plottedIds.current),
      viewerState.inRangeLUT,
      features,
      filters
    );
    const name = viewerState.datasetKey ? `${viewerState.datasetKey}-scatterplot.csv` : "scatterplot.csv";
    downloadCsv(name, csvString);
  }, [dataset, xAxisFeatureKey, yAxisFeatureKey, selectedFeatureKey, canDownloadScatterPlotCsv]);

  const menuItems = useMemo((): SelectItem[] => {
    const featureKeys = dataset ? dataset.featureKeys : [];
    return featureKeys.map((key: string) => {
      return { value: key, label: dataset?.getFeatureNameWithUnits(key) ?? key };
    });
  }, [dataset]);

  const makeControlBar = (menuItems: SelectItem[]): ReactElement => {
    return (
      <FlexRow $gap={6}>
        <FlexRowAlignCenter $gap={8} style={{ flexWrap: "wrap", width: "100%" }}>
          <SelectionDropdown
            label={"X"}
            selected={xAxisFeatureKey || ""}
            items={menuItems}
            onChange={setXAxis}
            controlWidth="100%"
            containerStyle={{ flexGrow: 1, flexBasis: "210px", flexShrink: 1 }}
          />
          <Tooltip title="Swap axes" trigger={["hover", "focus"]}>
            <IconButton
              onClick={() => {
                const temp = xAxisFeatureKey;
                setXAxis(yAxisFeatureKey);
                setYAxis(temp);
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
            onChange={setYAxis}
            controlWidth="100%"
            containerStyle={{ flexGrow: 1, flexBasis: "210px", flexShrink: 1 }}
          />
          <div>
            <SelectionDropdown
              label={"Show objects from"}
              selected={rangeType}
              items={PLOT_RANGE_SELECT_ITEMS}
              controlWidth={"120px"}
              onChange={(value: string) => setRangeType(value as PlotRangeType)}
              showSelectedItemTooltip={false}
            ></SelectionDropdown>
          </div>
          <div style={{ marginLeft: 6 }}>
            <SelectionDropdown
              label="Histogram bins"
              selected={histogramBins.toString()}
              items={BIN_COUNTS.map((value) => ({ value: value.toString(), label: value.toString() }))}
              isCreatable={true}
              isValidNewOption={(value: string) => {
                const bins = parseInt(value, 10);
                return isPositiveInteger(value) && BIN_COUNTS.indexOf(bins) === -1;
              }}
              onChange={function (value: string): void {
                const bins = parseInt(value, 10);
                if (isPositiveInteger(value)) {
                  setScatterHistogramBins(bins);
                }
              }}
              width="100px"
              controlWidth="80px"
            ></SelectionDropdown>
          </div>
        </FlexRowAlignCenter>
        <TextButton onClick={downloadScatterPlotCsv} disabled={!canDownloadScatterPlotCsv}>
          <ExportOutlined style={{ marginRight: "2px" }} />
          Export CSV
        </TextButton>
      </FlexRow>
    );
  };

  const makePlotButtons = (): ReactElement => {
    return (
      <FlexRow $gap={6} style={{ position: "absolute", right: "5px", top: "5px", zIndex: 10 }}>
        <Button
          onClick={() => {
            setIsRendering(true);
            clearTracks();
          }}
          disabled={tracks.size === 0}
        >
          Clear Tracks
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
        <LoadingSpinner loading={isRendering || isDebouncePending} style={{ marginTop: "10px" }}>
          {makePlotButtons()}
          <ScatterPlotContainer
            style={{ width: "calc(min(100%, 680px) - 40px)", aspectRatio: "7 / 6", padding: "5px" }}
            ref={plotDivRef}
          ></ScatterPlotContainer>
        </LoadingSpinner>
      </div>
    </>
  );
});
