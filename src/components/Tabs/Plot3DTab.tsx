import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import {
  Dataset,
  DEFAULT_CATEGORICAL_PALETTE_KEY,
  DEFAULT_COLOR_RAMP_KEY,
  DISPLAY_CATEGORICAL_PALETTE_KEYS,
  DISPLAY_LINEAR_RAMP_KEYS,
  KNOWN_COLOR_RAMPS,
  TabType,
  Track,
} from "../../colorizer";
import { useViewerStateStore } from "../../state";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "../../styles/utils";

import ColorRampSelection from "../Dropdowns/ColorRampDropdown";
import LabeledSlider from "../LabeledSlider";

const CONFIG: Partial<Plotly.Config> = {
  responsive: true,
  frameMargins: 0,
  // Fixes a bug where the plotly logo changes SVG logo colors in the header
  displaylogo: false,
};

const LAYOUT: Partial<Plotly.Layout> = {
  uirevision: "a",
  margin: {
    l: 0,
    r: 0,
    b: 0,
    t: 15,
  },
};

const SCROLL_PLAYBACK_TIMEOUT_MS = 100;
const RESUME_PLAYBACK_TIMEOUT_MS = 1000;

class Plot3d {
  public parentRef: HTMLElement;
  public dataset: Dataset | null;
  public track: Track | null;
  public xAxisFeatureKey: string | null = null;
  public yAxisFeatureKey: string | null = null;
  public zAxisFeatureKey: string | null = null;

  public coneTrace: Plotly.Data | null = null;

  constructor(parentRef: HTMLElement) {
    this.dataset = null;
    this.track = null;
    this.parentRef = parentRef;

    Plotly.newPlot(this.parentRef, [], {}, CONFIG);

    this.plot = this.plot.bind(this);
  }

  plot(currTime: number): void {
    const traces: Plotly.Data[] = [];

    // TRACE 2: Track path
    if (
      this.track &&
      this.track.ids.length > 0 &&
      this.dataset &&
      this.xAxisFeatureKey &&
      this.yAxisFeatureKey &&
      this.zAxisFeatureKey
    ) {
      const endTime = Math.min(currTime, this.track.endTime());
      // TODO: Show gaps/discontinuities in the track path?
      const ids: number[] = [];
      const times: number[] = [];
      let lastValidId = this.track.ids[0];
      let lastValidTime = this.track.startTime();
      for (let t = this.track.startTime(); t <= endTime; t++) {
        const id = this.track.getIdAtTime(t);
        if (id !== null) {
          ids.push(id);
          times.push(t);
          lastValidTime = t;
          lastValidId = id;
        } else {
          ids.push(lastValidId); // Use the last valid ID to fill gaps
          times.push(lastValidTime);
        }
      }

      const hoverTemplate =
        `${this.dataset?.getFeatureNameWithUnits(this.xAxisFeatureKey) ?? ""}: %{x}<br>` +
        `${this.dataset?.getFeatureNameWithUnits(this.yAxisFeatureKey) ?? ""}: %{y}<br>` +
        `${this.dataset?.getFeatureNameWithUnits(this.zAxisFeatureKey) ?? ""}: %{z}<br>` +
        `Time: %{customdata}`;

      const xData = this.dataset.getFeatureData(this.xAxisFeatureKey)?.data ?? [];
      const yData = this.dataset.getFeatureData(this.yAxisFeatureKey)?.data ?? [];
      const zData = this.dataset.getFeatureData(this.zAxisFeatureKey)?.data ?? [];
      if (xData.length > 0 && yData.length > 0 && zData.length > 0) {
        const scatterPlotTrace: Plotly.Data = {
          x: ids.map((id) => xData[id]),
          y: ids.map((id) => yData[id]),
          z: ids.map((id) => zData[id]),
          // TODO: use customdata to store time?,
          customdata: times,
          mode: "lines",
          type: "scatter3d",
          opacity: 1,
          line: {
            width: 4,
            color: "rgb(80, 80, 80)",
          },
          showlegend: false,
          hovertemplate: hoverTemplate,
        };
        traces.push(scatterPlotTrace);

        // Add a point for the current time
        const currId = this.track.getIdAtTime(currTime);
        if (currId !== -1) {
          const currentPointTrace: Plotly.Data = {
            x: [xData[lastValidId]],
            y: [yData[lastValidId]],
            z: [zData[lastValidId]],
            customdata: [currTime],
            mode: "markers",
            type: "scatter3d",
            marker: {
              size: 3,
              color: "rgb(255, 0, 0)",
            },
            showlegend: false,
            hovertemplate: hoverTemplate,
          };
          traces.push(currentPointTrace);
        }
      }

      // TRACE 1: Arrow plot
      if (this.coneTrace) {
        traces.push(this.coneTrace);
      }
    }

    const makeAxisLayout = (featureKey: string | null): Partial<Plotly.Axis> => {
      if (!featureKey || !this.dataset) {
        return { zeroline: false };
      }
      const featureData = this.dataset.getFeatureData(featureKey);
      if (!featureData) {
        return { title: "" };
      }
      let range: [number, number] = [featureData.min, featureData.max];
      const flowData = this.dataset.getFlowFieldFeatureData(featureKey);
      if (flowData) {
        // For flow field features, use the min and max of the data
        range = [flowData.min, flowData.max];
      }
      return {
        title: this.dataset.getFeatureNameWithUnits(featureKey) ?? "",
        range,
        zeroline: false,
      };
    };

    const layout: Partial<Plotly.Layout> = {
      ...LAYOUT,
      scene: {
        xaxis: makeAxisLayout(this.xAxisFeatureKey),
        yaxis: makeAxisLayout(this.yAxisFeatureKey),
        zaxis: makeAxisLayout(this.zAxisFeatureKey),
      },
    };

    Plotly.react(this.parentRef, traces, layout, CONFIG);
  }
}

function makeSteps(min: number, max: number, steps: number): number[] {
  const stepSize = (max - min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => min + i * stepSize);
}

export default function Plot3dTab(): ReactElement {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plot3dRef = useRef<Plot3d | null>(null);

  const [xAxisFeatureKey, setXAxisFeatureKey] = useState<string | null>(null);
  const [yAxisFeatureKey, setYAxisFeatureKey] = useState<string | null>(null);
  const [zAxisFeatureKey, setZAxisFeatureKey] = useState<string | null>(null);
  const [coneTrace, setConeTrace] = useState<Plotly.Data | null>(null);

  const [isPlaybackTempPaused, setIsPlaybackTempPaused] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumePlaybackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The number of user interactions (left, middle, or right mouse down) that
  // are currently occurring. When 0, no user interaction is occurring.
  const [numActiveUserInteractions, setNumActiveUserInteractions] = useState(0);

  const [coneSize, setConeSize] = useState(1);
  const [coneColorRampKey, setConeColorRampKey] = useState<string>("matplotlib-turbo");
  const [coneColorRampReversed, setConeColorRampReversed] = useState(false);
  const [flowFieldSubsampleRate, setFlowFieldSubsampleRate] = useState(6);

  const dataset = useViewerStateStore((state) => state.dataset);
  const track = useViewerStateStore((state) => state.track);
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

  useEffect(() => {
    if (dataset && dataset?.flowFieldFeatures.size >= 3) {
      const flowFieldKeys = Array.from(dataset.flowFieldFeatures.keys());
      setXAxisFeatureKey(flowFieldKeys[0] ?? null);
      setYAxisFeatureKey(flowFieldKeys[1] ?? null);
      setZAxisFeatureKey(flowFieldKeys[2] ?? null);
    }
  }, [dataset]);

  // Build cone trace when dataset or axis keys change
  useEffect(() => {
    const makeConeTrace = (): Plotly.Data | null => {
      if (!dataset || !xAxisFeatureKey || !yAxisFeatureKey || !zAxisFeatureKey) {
        return null;
      }
      const xFlowFieldData = dataset.getFlowFieldFeatureData(xAxisFeatureKey);
      const yFlowFieldData = dataset.getFlowFieldFeatureData(yAxisFeatureKey);
      const zFlowFieldData = dataset.getFlowFieldFeatureData(zAxisFeatureKey);

      const dims = dataset.flowFieldDims;
      if (!xFlowFieldData || !yFlowFieldData || !zFlowFieldData || !dims) {
        return null;
      }
      // Get XYZ coordinates as a flattened array
      const xSteps = makeSteps(xFlowFieldData.min, xFlowFieldData.max, dims.x);
      const ySteps = makeSteps(yFlowFieldData.min, yFlowFieldData.max, dims.y);
      const zSteps = makeSteps(zFlowFieldData.min, zFlowFieldData.max, dims.z);
      const xCoords: number[] = [];
      const yCoords: number[] = [];
      const zCoords: number[] = [];
      const xData: number[] = [];
      const yData: number[] = [];
      const zData: number[] = [];

      for (let i = 0; i < dims.x; i += flowFieldSubsampleRate) {
        for (let j = 0; j < dims.y; j += flowFieldSubsampleRate) {
          for (let k = 0; k < dims.z; k += flowFieldSubsampleRate) {
            xCoords.push(xSteps[i]);
            yCoords.push(ySteps[j]);
            zCoords.push(zSteps[k]);
            const dataIndex = i * dims.y * dims.z + j * dims.z + k;
            xData.push(xFlowFieldData.data[dataIndex]);
            yData.push(yFlowFieldData.data[dataIndex]);
            zData.push(zFlowFieldData.data[dataIndex]);
          }
        }
      }

      return {
        type: "cone",
        x: xCoords,
        y: yCoords,
        z: zCoords,
        u: xData,
        v: yData,
        w: zData,
        showscale: false,
        sizemode: "scaled",
        sizeref: coneSize,
        colorscale: coneColorRamp.colorRamp.getPlotlyColorScale(coneColorRampReversed),
        hoverinfo: "none",
      } as Plotly.Data;
    };
    const newConeTrace = makeConeTrace();
    setConeTrace(newConeTrace);
  }, [
    dataset,
    xAxisFeatureKey,
    yAxisFeatureKey,
    zAxisFeatureKey,
    flowFieldSubsampleRate,
    coneSize,
    coneColorRampKey,
    coneColorRampReversed,
  ]);

  useEffect(() => {
    plot3dRef.current = new Plot3d(plotContainerRef.current!);
  }, []);

  useEffect(() => {
    if (plot3dRef.current && isPlotTabVisible) {
      plot3dRef.current.dataset = dataset;
      plot3dRef.current.track = track;
      plot3dRef.current.xAxisFeatureKey = xAxisFeatureKey;
      plot3dRef.current.yAxisFeatureKey = yAxisFeatureKey;
      plot3dRef.current.zAxisFeatureKey = zAxisFeatureKey;
      plot3dRef.current.coneTrace = coneTrace as Plotly.Data | null;
      plot3dRef.current.plot(currentFrame);
    }
  }, [dataset, track, currentFrame, coneTrace, isPlotTabVisible]);

  useEffect(() => {
    const onMouseDown = (): void => {
      setNumActiveUserInteractions((prev) => prev + 1);
    };
    const onMouseUp = (): void => {
      setNumActiveUserInteractions((prev) => Math.max(prev - 1, 0));
    };
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
            colorRampsToDisplay={DISPLAY_LINEAR_RAMP_KEYS}
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
