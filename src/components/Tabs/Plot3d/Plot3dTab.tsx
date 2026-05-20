import type Plotly from "plotly.js-dist-min";
import type { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

import {
  ColorRamp,
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DEFAULT_COLOR_RAMP_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
  KNOWN_COLOR_RAMPS,
  SelectionOutlineColorMode,
  TabType,
  type VectorFieldData,
} from "src/colorizer";
import { getSharedWorkerPool } from "src/colorizer/workers/SharedWorkerPool";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import SelectionDropdown from "src/components/Dropdowns/SelectionDropdown";
import type { SelectItem } from "src/components/Dropdowns/types";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import LoadingSpinner from "src/components/LoadingSpinner";
import { make3dConeTrace } from "src/components/Tabs/Plot3d/plot_3d_utils";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

import Plot3d from "./Plot3d";

const SCROLL_PLAYBACK_TIMEOUT_MS = 100;
const RESUME_PLAYBACK_TIMEOUT_MS = 500;

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  const [rawBins, setBins] = useState(25);
  const bins = useDebounce(rawBins, 100);
  const [xAxisFeatureKey, setXAxisFeatureKey] = useState<string | null>("pc_1");
  const [yAxisFeatureKey, setYAxisFeatureKey] = useState<string | null>("pc_2");
  const [zAxisFeatureKey, setZAxisFeatureKey] = useState<string | null>("pc_3");

  const [isLoading, setIsLoading] = useState(false);

  const [vectorFieldData, setVectorFieldData] = useState<VectorFieldData | null>(null);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const [isPlaybackTempPaused, setIsPlaybackTempPaused] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumePlaybackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The number of user interactions (left, middle, or right mouse down) that
  // are currently occurring. When 0, no user interaction is occurring.
  const [numActiveUserInteractions, setNumActiveUserInteractions] = useState(0);

  const [rawConeSize, setConeSize] = useState(1);
  const coneSize = useDebounce(rawConeSize, 100);
  const [coneColorRampKey, setConeColorRampKey] = useState<string>("matplotlib-turbo");
  const [coneColorRampReversed, setConeColorRampReversed] = useState(false);
  const [rawThreshold, setThreshold] = useState(5);
  const threshold = useDebounce(rawThreshold, 100);
  const [rawMovingAverageWindow, setMovingAverageWindow] = useState(1);
  const movingAverageWindow = useDebounce(rawMovingAverageWindow, 100);

  const dataset = useViewerStateStore((state) => state.dataset);
  const tracks = useViewerStateStore((state) => state.tracks);
  const trackColors = useViewerStateStore((state) => state.trackColors);
  const outlineColorMode = useViewerStateStore((state) => state.outlineColorMode);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const coneColorRampData = KNOWN_COLOR_RAMPS.get(coneColorRampKey) ?? KNOWN_COLOR_RAMPS.get(DEFAULT_COLOR_RAMP_KEY)!;
  const coneColorRamp = useMemo(() => {
    return new ColorRamp(coneColorRampData.colorStops);
  }, [coneColorRampData]);

  const isPlotTabVisible = useViewerStateStore((state) => state.openTab === TabType.PLOT_3D);

  // Mount Plotly plot on component mount
  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
  }, []);

  //// Interaction Handlers ////

  // Plotly does not respond to user input (panning, zoom) when the plot is
  // rapidly updating. Therefore, we need to pause playback when the user
  // interacts with the plot, and resume playback once interactions have
  // stopped.

  useEffect(() => {
    if (timeControls.isPlaying()) {
      setNumActiveUserInteractions(0);
    }
  }, [timeControls.isPlaying()]);

  useEffect(() => {
    if (numActiveUserInteractions >= 1) {
      if (timeControls.isPlaying()) {
        timeControls.pause();
        setIsPlaybackTempPaused(true);
      }
      // Stop any existing timeouts to resume playback
      if (resumePlaybackTimeoutRef.current) {
        clearTimeout(resumePlaybackTimeoutRef.current);
        resumePlaybackTimeoutRef.current = null;
      }
    } else if (numActiveUserInteractions === 0 && isPlaybackTempPaused) {
      // Start timeout to resume playback if one doesn't already exist
      if (!resumePlaybackTimeoutRef.current) {
        resumePlaybackTimeoutRef.current = setTimeout(() => {
          timeControls.play();
          setIsPlaybackTempPaused(false);
          resumePlaybackTimeoutRef.current = null;
        }, RESUME_PLAYBACK_TIMEOUT_MS);
      }
    }
  }, [numActiveUserInteractions, isPlaybackTempPaused]);

  useEffect(() => {
    const onMouseDown = (): void => {
      setNumActiveUserInteractions((prev) => prev + 1);
    };
    const onMouseUp = (): void => {
      setNumActiveUserInteractions((prev) => Math.max(prev - 1, 0));
    };
    // TODO: clear mouse interactions on window blur, since events will not fire
    const onScroll = (): void => {
      // If the user is scrolling, treat it as an interaction
      if (!scrollTimeoutRef.current) {
        setNumActiveUserInteractions((prev) => prev + 1);
        scrollTimeoutRef.current = setTimeout(() => {
          setNumActiveUserInteractions((prev) => Math.max(prev - 1, 0));
          scrollTimeoutRef.current = null;
        }, SCROLL_PLAYBACK_TIMEOUT_MS);
      } else {
        // Extend timer
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setNumActiveUserInteractions((prev) => Math.max(prev - 1, 0));
          scrollTimeoutRef.current = null;
        }, SCROLL_PLAYBACK_TIMEOUT_MS);
      }
    };

    const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
    plotDiv?.addEventListener("mousedown", onMouseDown);
    plotDiv?.addEventListener("mouseup", onMouseUp);
    plotDiv?.addEventListener("wheel", onScroll);
    return () => {
      const plotDiv = plotContainerRef.current as PlotlyHTMLElement | null;
      plotDiv?.removeEventListener("mousedown", onMouseDown);
      plotDiv?.removeEventListener("mouseup", onMouseUp);
      plotDiv?.removeEventListener("wheel", onScroll);
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
    if (!dataset || !xAxisFeatureKey || !yAxisFeatureKey || !zAxisFeatureKey || !plot3dRef.current) {
      setVectorFieldData(null);
      return;
    }
    const workerPool = getSharedWorkerPool();
    const vectorFieldData = await workerPool.getVectorFlowField(
      dataset,
      xAxisFeatureKey,
      yAxisFeatureKey,
      zAxisFeatureKey,
      [bins, bins, bins]
    );
    setVectorFieldData(vectorFieldData);
    plot3dRef.current.xAxisFeatureKey = xAxisFeatureKey;
    plot3dRef.current.yAxisFeatureKey = yAxisFeatureKey;
    plot3dRef.current.zAxisFeatureKey = zAxisFeatureKey;
    setIsLoading(false);
  };

  const flowFieldDeps = [dataset, xAxisFeatureKey, yAxisFeatureKey, zAxisFeatureKey, bins];

  useEffect(() => {
    setIsLoading(true);
    calculateFlowField().then(() => setIsLoading(false));
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

  const featureDropdownData = useMemo((): SelectItem[] => {
    if (!dataset) {
      return [];
    }
    return dataset.featureKeys.map((key) => {
      return { value: key, label: dataset.getFeatureNameWithUnits(key) };
    });
  }, [dataset]);

  const getFeatureAxisSelector = (
    axisLabel: string,
    selectedKey: string | null,
    onChangeKey: (newKey: string) => void
  ): ReactElement => {
    return (
      <SelectionDropdown
        label={axisLabel}
        selected={selectedKey || ""}
        items={featureDropdownData}
        onChange={onChangeKey}
        controlWidth="100%"
        containerStyle={{ flexGrow: 1, flexBasis: "140px", flexShrink: 1 }}
      ></SelectionDropdown>
    );
  };

  return (
    <FlexColumn style={{ height: "100%", marginBottom: 10 }} $gap={8}>
      {/* Toolbar */}
      <FlexRow $gap={24}>
        <FlexColumn style={{ flexGrow: 1 }} $gap={8}>
          <FlexRow $gap={8} style={{ flexGrow: 1 }}>
            <FlexRow $gap={12} style={{ flexGrow: 1 }}>
              {getFeatureAxisSelector("X", xAxisFeatureKey, setXAxisFeatureKey)}
              {getFeatureAxisSelector("Y", yAxisFeatureKey, setYAxisFeatureKey)}
              {getFeatureAxisSelector("Z", zAxisFeatureKey, setZAxisFeatureKey)}
              <SelectionDropdown
                label={"Bins"}
                selected={rawBins.toString()}
                items={[10, 25, 50, 100].map((num) => ({ value: num.toString(), label: num.toString() }))}
                onChange={(value: string) => {
                  const parsedValue = parseInt(value);
                  if (!isNaN(parsedValue) && parsedValue > 0) {
                    setBins(parsedValue);
                  }
                }}
                width="100px"
                controlWidth="70px"
              ></SelectionDropdown>
            </FlexRow>
          </FlexRow>
        </FlexColumn>
      </FlexRow>

      {/* Plot Controls */}
      <FlexRowAlignCenter $gap={12}>
        <h3>Cone size</h3>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            type="value"
            value={rawConeSize}
            onChange={setConeSize}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={10}
            maxSliderBound={2.5}
            step={0.1}
            marks={[1]}
            numberFormatter={(number) => number?.toFixed(1)}
          ></LabeledSlider>
        </div>
        <ColorRampSelection
          selectedRamp={coneColorRampKey}
          onChangeRamp={function (colorRampKey: string, reversed: boolean): void {
            setConeColorRampKey(colorRampKey);
            setConeColorRampReversed(reversed);
          }}
          reversed={coneColorRampReversed}
          colorRampsToDisplay={DISPLAY_COLOR_RAMP_LINEAR_KEYS}
          selectedPaletteKey={DEFAULT_CATEGORICAL_PALETTE_KEY}
          onChangePalette={() => {}}
          numCategories={0}
          categoricalPalettesToDisplay={DISPLAY_CATEGORICAL_PALETTE_KEYS}
        />
        <h3>Threshold</h3>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            type="value"
            value={rawThreshold}
            onChange={setThreshold}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={50}
            maxSliderBound={20}
            step={1}
            marks={[5]}
            numberFormatter={(number) => number?.toFixed(0)}
          ></LabeledSlider>
        </div>
        <h3>Line Moving Avg.</h3>
        <div style={{ width: "180px" }}>
          <LabeledSlider
            type="value"
            value={rawMovingAverageWindow}
            onChange={setMovingAverageWindow}
            minInputBound={0}
            minSliderBound={0}
            maxInputBound={50}
            maxSliderBound={20}
            step={1}
            numberFormatter={(number) => number?.toFixed(0)}
          ></LabeledSlider>
        </div>
      </FlexRowAlignCenter>

      {/* Plot Container */}
      <LoadingSpinner loading={isLoading} style={{ width: "100%", height: "100%" }}>
        <div ref={plotContainerRef} style={{ width: "auto", height: "100%", zIndex: "0" }}></div>
      </LoadingSpinner>
    </FlexColumn>
  );
}
