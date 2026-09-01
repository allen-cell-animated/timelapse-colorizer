import type Plotly from "plotly.js-dist-min";
import React, { type ReactElement, useEffect, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

import { PlotTabType, SelectionOutlineColorMode, TabType, type VectorFieldData } from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "src/components/LoadingSpinner";
import PlotsTabToolbar from "src/components/Tabs/Plots/PlotsTabToolbar";
import type { SharedPlotTabProps } from "src/components/Tabs/Plots/types";
import { useInteractionListener } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn } from "src/styles/utils";

import FlowFieldToolbar from "./controls/FlowFieldToolbar";
import { make3dConeTrace } from "./flow_field_utils";
import FlowFieldPlot from "./FlowFieldPlot";

const MINIMUM_BIN_COUNT = 10;
const RESUME_PLAYBACK_TIMEOUT_MS = 500;

type FlowFieldTabProps = SharedPlotTabProps;

export default function FlowFieldPlotTab(props: FlowFieldTabProps): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<FlowFieldPlot | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [vectorFieldData, setVectorFieldData] = useState<VectorFieldData | null>(null);
  const currentVectorFieldRequestIdRef = useRef(0);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const [isPlaybackTempPaused, setIsPlaybackTempPaused] = useState(false);
  const resumePlaybackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global state
  const dataset = useViewerStateStore((state) => state.dataset);
  const tracks = useViewerStateStore((state) => state.tracks);
  const trackColors = useViewerStateStore((state) => state.trackColors);
  const outlineColorMode = useViewerStateStore((state) => state.outlineColorMode);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);
  const inRangeLut = useViewerStateStore((state) => state.inRangeLUT);
  // 3D plot state
  const applyGaussian = useViewerStateStore((state) => state.plot3dUseGaussian);
  const coneColorRamp = useViewerStateStore((state) => state.plot3dVectorColorRamp);
  const gaussianBandwidthPct = useViewerStateStore((state) => state.plot3dGaussianBandwidthPct);
  const rawBins = useViewerStateStore((state) => state.plot3dVectorBins);
  const rawConeSize = useViewerStateStore((state) => state.plot3dVectorScale);
  const rawMovingAverageLineWidth = useViewerStateStore((state) => state.plot3dLineWidth);
  const rawMovingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);
  const rawSubsampling = useViewerStateStore((state) => state.plot3dVectorSubsampling);
  const rawThreshold = useViewerStateStore((state) => state.plot3dVectorThreshold);
  const xAxisFeatureKey = useViewerStateStore((state) => state.plot3dXAxis);
  const yAxisFeatureKey = useViewerStateStore((state) => state.plot3dYAxis);
  const zAxisFeatureKey = useViewerStateStore((state) => state.plot3dZAxis);

  const isPlotTabVisible = useViewerStateStore(
    (state) => state.openTab === TabType.PLOTS && state.plotTab === PlotTabType.PLOT_3D
  );

  const bins = useDebounce(rawBins, 100);
  const subsampling = useDebounce(rawSubsampling, 100);
  const coneSize = useDebounce(rawConeSize, 100);
  const threshold = useDebounce(rawThreshold, 100);
  const movingAverageWindow = useDebounce(rawMovingAverageWindow, 100);
  const lineWidth = useDebounce(rawMovingAverageLineWidth, 100);

  // Mount Plotly plot on component mount
  useEffect(() => {
    plotRef.current = new FlowFieldPlot(plotContainerRef.current!);
    return () => {
      plotRef.current?.dispose();
      plotRef.current = null;
    };
  }, []);

  //// Interaction Handlers ////

  // Plotly does not respond to user input (panning, zoom) when the plot is
  // rapidly updating. Therefore, we need to pause playback when the user
  // interacts with the plot, and resume playback once interactions have
  // stopped.

  const onInteractionStart = (): void => {
    if (resumePlaybackTimeoutRef.current) {
      clearTimeout(resumePlaybackTimeoutRef.current);
      resumePlaybackTimeoutRef.current = null;
    }
    if (timeControls.isPlaying()) {
      timeControls.pause();
      setIsPlaybackTempPaused(true);
    }
  };

  const onInteractionEnd = (): void => {
    if (isPlaybackTempPaused) {
      resumePlaybackTimeoutRef.current = setTimeout(() => {
        timeControls.play();
        setIsPlaybackTempPaused(false);
      }, RESUME_PLAYBACK_TIMEOUT_MS);
    }
  };

  useInteractionListener(plotContainerRef.current, onInteractionStart, onInteractionEnd);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (resumePlaybackTimeoutRef.current) {
        clearTimeout(resumePlaybackTimeoutRef.current);
      }
    };
  }, []);

  //// Data Handlers ////

  // Calculate flow field when dataset or selected features change
  const calculateFlowField = async (): Promise<void> => {
    if (
      !dataset ||
      !xAxisFeatureKey ||
      !yAxisFeatureKey ||
      !zAxisFeatureKey ||
      !dataset.hasFeatureKey(xAxisFeatureKey) ||
      !dataset.hasFeatureKey(yAxisFeatureKey) ||
      !dataset.hasFeatureKey(zAxisFeatureKey) ||
      !dataset.times ||
      !dataset.trackIds ||
      !plotRef.current
    ) {
      setVectorFieldData(null);
      return;
    }
    setIsLoading(true);

    currentVectorFieldRequestIdRef.current += 1;
    const requestId = currentVectorFieldRequestIdRef.current;
    const workerPool = getSharedWorkerPool();
    workerPool
      .getVectorFlowField(
        dataset,
        xAxisFeatureKey,
        yAxisFeatureKey,
        zAxisFeatureKey,
        [bins, bins, bins],
        inRangeLut,
        applyGaussian ? gaussianBandwidthPct / 100 : undefined,
        subsampling
      )
      .then((vectorFieldData) => {
        // Check if a newer requests supercedes this one before updating state
        if (requestId !== currentVectorFieldRequestIdRef.current || !plotRef.current) {
          return;
        }
        setVectorFieldData(vectorFieldData);
        plotRef.current.xAxisFeatureKey = xAxisFeatureKey;
        plotRef.current.yAxisFeatureKey = yAxisFeatureKey;
        plotRef.current.zAxisFeatureKey = zAxisFeatureKey;
      })
      .finally(() => {
        if (requestId === currentVectorFieldRequestIdRef.current) {
          setIsLoading(false);
        }
      });
  };

  const flowFieldDeps = [
    dataset,
    xAxisFeatureKey,
    yAxisFeatureKey,
    zAxisFeatureKey,
    bins,
    applyGaussian,
    gaussianBandwidthPct,
    inRangeLut,
    subsampling,
  ];

  useEffect(() => {
    calculateFlowField();
  }, flowFieldDeps);

  // Build new cone trace when calculated vector field data or cone settings change
  useEffect(() => {
    if (!vectorFieldData || !dataset) {
      setConeTrace(null);
    } else {
      setConeTrace(
        make3dConeTrace(vectorFieldData, {
          coneSize,
          colorRamp: coneColorRamp,
          // Scale threshold based on bin count. At the minimum bin count, the
          // `threshold` value maps directly to the number of deltas that fell
          // into a bin. As the bin count increases, dividing by the number of
          // bins keeps the thresholding visually consistent.
          threshold: threshold * (MINIMUM_BIN_COUNT / bins),
        })
      );
    }
  }, [dataset, vectorFieldData, threshold, bins, coneSize, coneColorRamp]);

  // Sync plot with state changes
  useEffect(() => {
    if (plotRef.current && isPlotTabVisible) {
      plotRef.current.dataset = dataset;
      plotRef.current.tracks = tracks;
      plotRef.current.trackToColor = outlineColorMode === SelectionOutlineColorMode.USE_PALETTE ? trackColors : null;
      plotRef.current.coneTrace = coneTrace as Plotly.Data | null;
      plotRef.current.lineAverageWindow = movingAverageWindow;
      plotRef.current.lineWidth = lineWidth;
      plotRef.current.plot(currentFrame);
    }
  }, [dataset, tracks, currentFrame, coneTrace, isPlotTabVisible, movingAverageWindow, lineWidth]);

  //// Rendering ////

  return (
    <FlexColumn style={{ height: "100%", marginBottom: 10 }} $gap={8}>
      <PlotsTabToolbar>
        {props.toolbar}
        <FlowFieldToolbar />
      </PlotsTabToolbar>

      {/* Plot Container */}
      <LoadingSpinner loading={isLoading} style={{ width: "100%", height: "100%" }}>
        <div ref={plotContainerRef} style={{ width: "auto", height: "100%", zIndex: "0" }}></div>
      </LoadingSpinner>
    </FlexColumn>
  );
}
