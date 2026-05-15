import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { useDebounce } from "usehooks-ts";

import {
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DEFAULT_COLOR_RAMP_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_COLOR_RAMP_LINEAR_KEYS,
  KNOWN_COLOR_RAMPS,
  TabType,
} from "src/colorizer";
import ColorRampSelection from "src/components/Dropdowns/ColorRampDropdown";
import LabeledSlider from "src/components/Inputs/LabeledSlider";
import { useViewerStateStore } from "src/state";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

import Plot3d from "./Plot3d";

const SCROLL_PLAYBACK_TIMEOUT_MS = 100;
const RESUME_PLAYBACK_TIMEOUT_MS = 1000;

function makeSteps(min: number, max: number, steps: number): number[] {
  const stepSize = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => min + i * stepSize);
}

type VectorFieldData = {
  xPos: Float32Array;
  yPos: Float32Array;
  zPos: Float32Array;
  xData: Float32Array;
  yData: Float32Array;
  zData: Float32Array;
};

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  const [xAxisFeatureKey, setXAxisFeatureKey] = useState<string | null>(null);
  const [yAxisFeatureKey, setYAxisFeatureKey] = useState<string | null>(null);
  const [zAxisFeatureKey, setZAxisFeatureKey] = useState<string | null>(null);

  const [bins, setBins] = useState(10);

  const [vectorFieldData, setVectorFieldData] = useState<VectorFieldData | null>(null);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const [isPlaybackTempPaused, setIsPlaybackTempPaused] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumePlaybackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The number of user interactions (left, middle, or right mouse down) that
  // are currently occurring. When 0, no user interaction is occurring.
  const [numActiveUserInteractions, setNumActiveUserInteractions] = useState(0);

  const [rawConeSize, setConeSize] = useState(1);
  const coneSize = useDebounce(rawConeSize, 100);
  const [coneColorRampKey, setConeColorRampKey] = useState<string>("matplotlib-turbo");
  const [coneColorRampReversed, setConeColorRampReversed] = useState(false);
  const [flowFieldSubsampleRate, setFlowFieldSubsampleRate] = useState(6);

  const dataset = useViewerStateStore((state) => state.dataset);
  const tracks = useViewerStateStore((state) => state.tracks);
  const currentFrame = useViewerStateStore((state) => state.currentFrame);
  const timeControls = useViewerStateStore((state) => state.timeControls);

  const coneColorRamp = KNOWN_COLOR_RAMPS.get(coneColorRampKey) ?? KNOWN_COLOR_RAMPS.get(DEFAULT_COLOR_RAMP_KEY)!;

  const isPlotTabVisible = useViewerStateStore((state) => state.openTab === TabType.PLOT_3D);

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

  // Reset on dataset change
  useEffect(() => {
    // if (dataset && dataset?.flowFieldFeatures.size >= 3) {
    //   const flowFieldKeys = Array.from(dataset.flowFieldFeatures.keys());
    //   setXAxisFeatureKey(flowFieldKeys[0] ?? null);
    //   setYAxisFeatureKey(flowFieldKeys[1] ?? null);
    //   setZAxisFeatureKey(flowFieldKeys[2] ?? null);
    // }
  }, [dataset]);

  // Build cone trace when dataset or axis keys change
  useEffect(() => {
    const makeConeTrace = (): Plotly.Data | null => {
      if (!dataset || !vectorFieldData) {
        return null;
      }

      return {
        type: "cone",
        x: vectorFieldData.xPos,
        y: vectorFieldData.yPos,
        z: vectorFieldData.zPos,
        u: vectorFieldData.xData,
        v: vectorFieldData.yData,
        w: vectorFieldData.zData,
        showscale: false,
        sizemode: "scaled",
        sizeref: coneSize,
        colorscale: coneColorRamp.colorRamp.getPlotlyColorScale(coneColorRampReversed),
        hoverinfo: "none",
      } as Plotly.Data;
    };
    const newConeTrace = makeConeTrace();
    setConeTrace(newConeTrace);
  }, [dataset, vectorFieldData, coneSize, coneColorRampKey, coneColorRampReversed]);

  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
  }, []);

  useEffect(() => {
    if (plot3dRef.current && isPlotTabVisible) {
      plot3dRef.current.dataset = dataset;
      plot3dRef.current.tracks = tracks;
      plot3dRef.current.xAxisFeatureKey = xAxisFeatureKey;
      plot3dRef.current.yAxisFeatureKey = yAxisFeatureKey;
      plot3dRef.current.zAxisFeatureKey = zAxisFeatureKey;
      plot3dRef.current.coneTrace = coneTrace as Plotly.Data | null;
      plot3dRef.current.plot(currentFrame);
    }
  }, [dataset, tracks, currentFrame, coneTrace, isPlotTabVisible]);

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

  return (
    <FlexColumn style={{ height: "100%" }}>
      <FlexRow>
        <FlexRow>
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
        </FlexRow>
      </FlexRow>
      <FlexRowAlignCenter $gap={5}>
        <p>Cone size</p>
        <LabeledSlider
          type="value"
          value={coneSize}
          onChange={setConeSize}
          minInputBound={0}
          minSliderBound={0}
          maxInputBound={10}
          maxSliderBound={2.5}
          marks={[1]}
        ></LabeledSlider>
      </FlexRowAlignCenter>
      <FlexRowAlignCenter $gap={5}>
        <p>Flow field subsampling</p>
        <LabeledSlider
          type="value"
          value={flowFieldSubsampleRate}
          onChange={setFlowFieldSubsampleRate}
          minInputBound={1}
          minSliderBound={1}
          maxInputBound={20}
          maxSliderBound={10}
          step={1}
        ></LabeledSlider>
      </FlexRowAlignCenter>
      <div ref={plotContainerRef} style={{ width: "auto", height: "100%", zIndex: "0" }}></div>
    </FlexColumn>
  );
}
