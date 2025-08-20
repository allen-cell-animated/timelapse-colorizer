// TODOs:
// how to obey filtering
// interaction with track selections?
// highlight current row/column on hover
import { Button, Select } from "antd";
import chroma from "chroma-js";
import * as d3 from "d3";
import React, { memo, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { Dataset } from "../../../colorizer";
import { useDebounce } from "../../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../styles/utils";
import {
  areSetsEqual,
  correlationDataToCellDatum,
  CorrelationPlotConfig,
  createScales,
  drawAxesLabels,
  drawBaseSvg,
  drawGrid,
  drawLegend,
  setupMouseInteraction,
  SVG_TEXT_PADDING,
} from "./correlation_plot_data_utils";

import SharedWorkerPool from "../../../colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "../../LoadingSpinner";

type CorrelationPlotTabProps = {
  dataset: Dataset | null;
  workerPool: SharedWorkerPool;
  openScatterPlotTab(xAxisFeatureKey: string, yAxisFeatureKey: string): void;
};

const TipDiv = styled.div`
  position: absolute;
  text-align: center;
  background-color: #ffffff;
  border: 1px solid var(--color-borders);
  border-radius: 6px;
  padding: 8px 12px;
  width: max-content;
  z-index: 1000;
`;

const PlotDiv = styled.div`
  /* Add hover styling to grid tile and axis labels */
  & line.selected {
    stroke-width: 2px;
  }

  & text.selected {
    font-weight: bold;
  }

  & rect.selected {
    outline: 1px solid black;
  }
`;

/**
 * A tab that displays an interactive correlation plot between selected features in the dataset.
 */
export default memo(function CorrelationPlotTab(props: CorrelationPlotTabProps): ReactElement {
  const [isRendering, setIsRendering] = useState(false);

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  const legendRef = React.useRef<HTMLDivElement>(null);
  const tooltipDivRef = React.useRef<HTMLDivElement>(null);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const lastRenderedPlotFeatures = useRef<Set<string>>(new Set());

  const sortedSelectedFeatures = useMemo(() => {
    // Keep in sorted order of the dataset
    const featureSet = new Set(selectedFeatures);
    return props.dataset?.featureKeys.filter((f) => featureSet.has(f)) || [];
  }, [props.dataset, selectedFeatures]);

  useEffect(() => {
    // Selects all features from the dataset on initial load.
    if (props.dataset && selectedFeatures.length === 0) {
      setSelectedFeatures(props.dataset.featureKeys);
    }
  }, [props.dataset]);

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  const dataset = useDebounce(props.dataset, 500);

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  const plotDependencies = [dataset, selectedFeatures];

  const renderPlot = async (_forceRelayout: boolean = false): Promise<void> => {
    if (!props.dataset || !legendRef.current || !plotDivRef.current || !tooltipDivRef.current) {
      return;
    }
    setIsRendering(true);

    // Calculating correlations is async-- it's possible that another render request will
    // come in before a previous one finishes. Discard any results that are not from the most
    // recent render request.
    lastRenderedPlotFeatures.current = new Set(sortedSelectedFeatures);
    const correlationData = await props.workerPool.getCorrelations(props.dataset!, sortedSelectedFeatures);
    if (!areSetsEqual(lastRenderedPlotFeatures.current, new Set(sortedSelectedFeatures))) {
      // Another request happened in the meantime, discard this result.
      return;
    }

    const { gridData, extent, numRows } = correlationDataToCellDatum(correlationData);
    const featureNames: string[] = sortedSelectedFeatures.map((key) => dataset?.getFeatureName(key) || key);
    // TODO: Resize dynamically with container size
    const plotDim = 415;
    const config: CorrelationPlotConfig = {
      margin: { top: 50, bottom: 1, left: 150, right: 150 },
      plotWidth: plotDim,
      plotHeight: plotDim,
      legendTop: 15,
      legendHeight: 15,
      padding: SVG_TEXT_PADDING,
      // TODO: Make color ramp swappable
      colorMap: chroma.scale(["steelblue", "white", "tomato"]).domain([extent[0], 0, extent[1]]),
    };

    d3.select(tooltipDivRef.current).selectAll("*").remove();

    // Draw SVG elements
    const svg = drawBaseSvg(plotDivRef.current, config);
    const { x, y } = createScales(numRows, config);
    drawAxesLabels(svg, featureNames, x, y, config);
    drawGrid(svg, gridData, x, y, config);
    drawLegend(legendRef.current, extent, config);

    setupMouseInteraction(
      plotDivRef.current,
      tooltipDivRef.current,
      x,
      y,
      sortedSelectedFeatures,
      dataset,
      props.openScatterPlotTab,
      config
    );

    setIsRendering(false);
  };

  // Re-render plot when the dataset or selected features change.
  useEffect(() => {
    renderPlot();
  }, [...plotDependencies]);

  //////////////////////////////////
  // Component Rendering
  //////////////////////////////////

  const featureOptions =
    props.dataset?.featureKeys.map((key) => ({
      label: props.dataset?.getFeatureNameWithUnits(key),
      value: key,
    })) || [];

  return (
    <FlexColumnAlignCenter $gap={10} style={{ height: "100%" }}>
      <FlexRowAlignCenter style={{ width: "100%" }} $gap={8}>
        <Select
          style={{ width: "100%" }}
          allowClear
          mode="multiple"
          placeholder="Add features"
          options={featureOptions}
          value={sortedSelectedFeatures}
          maxTagCount={"responsive"}
          onClear={() => setSelectedFeatures([])}
          disabled={!props.dataset}
          onSelect={(value) => {
            setSelectedFeatures([...selectedFeatures, value as string]);
          }}
          onDeselect={(value) => setSelectedFeatures(selectedFeatures.filter((f) => f !== value))}
        ></Select>
        <Button onClick={() => setSelectedFeatures(props.dataset?.featureKeys || [])} type="primary">
          Select all
        </Button>
      </FlexRowAlignCenter>
      <LoadingSpinner loading={isRendering} style={{ height: "100%" }}>
        <FlexColumnAlignCenter $gap={5}>
          <div id="legend" style={{ position: "relative" }} ref={legendRef}></div>
          <div style={{ position: "relative" }}>
            <PlotDiv id="grid" style={{ position: "relative" }} ref={plotDivRef}></PlotDiv>
            <TipDiv style={{ display: "none" }} id="tip" ref={tooltipDivRef}></TipDiv>
          </div>
        </FlexColumnAlignCenter>
      </LoadingSpinner>
    </FlexColumnAlignCenter>
  );
});
