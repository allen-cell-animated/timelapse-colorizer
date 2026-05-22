import type Plotly from "plotly.js-dist-min";
import React, { type ReactElement, useEffect, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

import { SelectionOutlineColorMode, TabType, type VectorFieldData } from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "src/components/LoadingSpinner";
import Plot3dConeControls from "src/components/Tabs/Plot3d/Plot3dConeControls";
import Plot3dFeatureControls from "src/components/Tabs/Plot3d/Plot3dFeatureControls";
import { useInteractionListener } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

import Plot3d from "./Plot3d";
import Plot3dLineControls from "./Plot3dLineControls";
import { make3dConeTrace } from "./plot_3d_utils";

const RESUME_PLAYBACK_TIMEOUT_MS = 500;

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

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
  const rawBins = useViewerStateStore((state) => state.plot3dVectorBins);
  const xAxisFeatureKey = useViewerStateStore((state) => state.plot3dXAxis);
  const yAxisFeatureKey = useViewerStateStore((state) => state.plot3dYAxis);
  const zAxisFeatureKey = useViewerStateStore((state) => state.plot3dZAxis);
  const rawConeSize = useViewerStateStore((state) => state.plot3dVectorScale);
  const applyGaussian = useViewerStateStore((state) => state.plot3dUseGaussian);
  const coneColorRampKey = useViewerStateStore((state) => state.plot3dVectorColorRampKey);
  const coneColorRampReversed = useViewerStateStore((state) => state.plot3dVectorColorRampReversed);
  const coneColorRamp = useViewerStateStore((state) => state.plot3dColorRamp);
  const rawThreshold = useViewerStateStore((state) => state.plot3dVectorThreshold);
  const rawMovingAverageWindow = useViewerStateStore((state) => state.plot3dLineMovingAverageWindow);

  const isPlotTabVisible = useViewerStateStore((state) => state.openTab === TabType.PLOT_3D);

  const bins = useDebounce(rawBins, 100);
  const coneSize = useDebounce(rawConeSize, 100);
  const threshold = useDebounce(rawThreshold, 100);
  const movingAverageWindow = useDebounce(rawMovingAverageWindow, 100);

  // Mount Plotly plot on component mount
  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
    return () => {
      plot3dRef.current?.dispose();
      plot3dRef.current = null;
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
    if (!dataset || !xAxisFeatureKey || !yAxisFeatureKey || !zAxisFeatureKey || !plot3dRef.current) {
      setVectorFieldData(null);
      return;
    }
    setIsLoading(true);

    currentVectorFieldRequestIdRef.current += 1;
    const requestId = currentVectorFieldRequestIdRef.current;
    const workerPool = getSharedWorkerPool();
    const vectorFlowFieldPromise = workerPool.getVectorFlowField(
      dataset,
      xAxisFeatureKey,
      yAxisFeatureKey,
      zAxisFeatureKey,
      [bins, bins, bins],
      inRangeLut,
      applyGaussian ? 0.15 : undefined
    );

    vectorFlowFieldPromise
      .then((vectorFieldData) => {
        // Check if a newer requests supercedes this one before updating state
        if (requestId !== currentVectorFieldRequestIdRef.current || !plot3dRef.current) {
          return;
        }
        setVectorFieldData(vectorFieldData);
        plot3dRef.current.xAxisFeatureKey = xAxisFeatureKey;
        plot3dRef.current.yAxisFeatureKey = yAxisFeatureKey;
        plot3dRef.current.zAxisFeatureKey = zAxisFeatureKey;
      })
      .finally(() => {
        if (requestId === currentVectorFieldRequestIdRef.current) {
          setIsLoading(false);
        }
      });
  };

  const flowFieldDeps = [dataset, xAxisFeatureKey, yAxisFeatureKey, zAxisFeatureKey, bins, applyGaussian, inRangeLut];

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
          colorRampReversed: coneColorRampReversed,
          threshold,
        })
      );
    }
  }, [dataset, vectorFieldData, threshold, coneSize, coneColorRampKey, coneColorRampReversed]);

  // Sync plot with state changes
  useEffect(() => {
    if (plot3dRef.current && isPlotTabVisible) {
      plot3dRef.current.dataset = dataset;
      plot3dRef.current.tracks = tracks;
      plot3dRef.current.trackToColor = outlineColorMode === SelectionOutlineColorMode.USE_PALETTE ? trackColors : null;
      plot3dRef.current.coneTrace = coneTrace as Plotly.Data | null;
      plot3dRef.current.lineAverageWindow = movingAverageWindow;
      plot3dRef.current.plot(currentFrame);
    }
  }, [dataset, tracks, currentFrame, coneTrace, isPlotTabVisible, movingAverageWindow]);

  //// Rendering ////

  const disabled = !dataset;

  return (
    <FlexColumn style={{ height: "100%", marginBottom: 10 }} $gap={8}>
      {/* Plot Feature Controls */}
      <FlexRow $gap={8} style={{ flexGrow: 1 }}>
        <Plot3dFeatureControls disabled={disabled} />
      </FlexRow>

      {/* Cone Controls */}
      <FlexRowAlignCenter $gap={12}>
        <Plot3dConeControls disabled={disabled} />
        <Plot3dLineControls disabled={disabled} />
      </FlexRowAlignCenter>

      {/* Plot Container */}
      <LoadingSpinner loading={isLoading} style={{ width: "100%", height: "100%" }}>
        <div ref={plotContainerRef} style={{ width: "auto", height: "100%", zIndex: "0" }}></div>
      </LoadingSpinner>
    </FlexColumn>
  );
}
