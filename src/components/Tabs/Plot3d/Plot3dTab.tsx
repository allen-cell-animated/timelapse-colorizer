import type Plotly from "plotly.js-dist-min";
import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

import {
  ColorRamp,
  DEFAULT_COLOR_RAMP_KEY,
  KNOWN_COLOR_RAMPS,
  SelectionOutlineColorMode,
  TabType,
  type VectorFieldData,
} from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "src/components/LoadingSpinner";
import Plot3dConeControls from "src/components/Tabs/Plot3d/Plot3dConeControls";
import Plot3dFeatureControls from "src/components/Tabs/Plot3d/Plot3dFeatureControls";
import { useInteractionListener } from "src/hooks";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

import { make3dConeTrace } from "./plot_3d_utils";
import Plot3d from "./Plot3d";
import Plot3dLineControls from "./Plot3dLineControls";

const RESUME_PLAYBACK_TIMEOUT_MS = 500;

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  const [rawBins, setBins] = useState(25);
  const bins = useDebounce(rawBins, 100);
  const [xAxisFeatureKey, setXAxisFeatureKey] = useState<string | null>(null);
  const [yAxisFeatureKey, setYAxisFeatureKey] = useState<string | null>(null);
  const [zAxisFeatureKey, setZAxisFeatureKey] = useState<string | null>(null);
  const [applyGaussian, setApplyGaussian] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  const [vectorFieldData, setVectorFieldData] = useState<VectorFieldData | null>(null);
  const currentVectorFieldRequestIdRef = useRef(0);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const [isPlaybackTempPaused, setIsPlaybackTempPaused] = useState(false);
  const resumePlaybackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rawConeSize, setConeSize] = useState(1);
  const coneSize = useDebounce(rawConeSize, 100);
  const [coneColorRampKey, setConeColorRampKey] = useState<string>("matplotlib-turbo");
  const [coneColorRampReversed, setConeColorRampReversed] = useState(false);
  const [rawThreshold, setThreshold] = useState(2);
  const threshold = useDebounce(rawThreshold, 100);
  const [rawMovingAverageWindow, setMovingAverageWindow] = useState(1);
  const movingAverageWindow = useDebounce(rawMovingAverageWindow, 100);

  const dataset = useViewerStateStore((state) => state.dataset);
  const tracks = useViewerStateStore((state) => state.tracks);
  const trackColors = useViewerStateStore((state) => state.trackColors);
  const outlineColorMode = useViewerStateStore((state) => state.outlineColorMode);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const inRangeLut = useViewerStateStore((state) => state.inRangeLUT);

  const coneColorRampData = KNOWN_COLOR_RAMPS.get(coneColorRampKey) ?? KNOWN_COLOR_RAMPS.get(DEFAULT_COLOR_RAMP_KEY)!;
  const coneColorRamp = useMemo(() => {
    return new ColorRamp(coneColorRampData.colorStops);
  }, [coneColorRampData]);

  const isPlotTabVisible = useViewerStateStore((state) => state.openTab === TabType.PLOT_3D);

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

  // Clear selected features as needed when dataset changes
  useEffect(() => {
    if (dataset) {
      if (xAxisFeatureKey !== null && !dataset.hasFeatureKey(xAxisFeatureKey)) {
        setXAxisFeatureKey(null);
      }
      if (yAxisFeatureKey !== null && !dataset.hasFeatureKey(yAxisFeatureKey)) {
        setYAxisFeatureKey(null);
      }
      if (zAxisFeatureKey !== null && !dataset.hasFeatureKey(zAxisFeatureKey)) {
        setZAxisFeatureKey(null);
      }
    }
  }, [dataset]);

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
      !plot3dRef.current
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
        applyGaussian ? 0.15 : undefined
      )
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

  return (
    <FlexColumn style={{ height: "100%", marginBottom: 10 }} $gap={8}>
      {/* Plot Feature Controls */}
      <FlexRow $gap={8} style={{ flexGrow: 1 }}>
        <Plot3dFeatureControls
          xAxisFeatureKey={xAxisFeatureKey}
          setXAxisFeatureKey={setXAxisFeatureKey}
          yAxisFeatureKey={yAxisFeatureKey}
          setYAxisFeatureKey={setYAxisFeatureKey}
          zAxisFeatureKey={zAxisFeatureKey}
          setZAxisFeatureKey={setZAxisFeatureKey}
          bins={rawBins}
          setBins={setBins}
          applyGaussian={applyGaussian}
          setApplyGaussian={setApplyGaussian}
        />
      </FlexRow>

      {/* Cone Controls */}
      <FlexRowAlignCenter $gap={12}>
        <Plot3dConeControls
          coneSize={rawConeSize}
          setConeSize={setConeSize}
          coneColorRampKey={coneColorRampKey}
          setConeColorRampKey={setConeColorRampKey}
          coneColorRampReversed={coneColorRampReversed}
          setConeColorRampReversed={setConeColorRampReversed}
          threshold={rawThreshold}
          setThreshold={setThreshold}
        />
        <Plot3dLineControls
          movingAverageWindow={rawMovingAverageWindow}
          setMovingAverageWindow={setMovingAverageWindow}
        />
      </FlexRowAlignCenter>

      {/* Plot Container */}
      <LoadingSpinner loading={isLoading} style={{ width: "100%", height: "100%" }}>
        <div ref={plotContainerRef} style={{ width: "auto", height: "100%", zIndex: "0" }}></div>
      </LoadingSpinner>
    </FlexColumn>
  );
}
