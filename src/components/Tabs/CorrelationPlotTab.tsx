// TODOs:
// color choice
// optimize calculation
// optimize when recalculation needs to occur
// selections of features
// how to obey filtering
// interaction with track selections?
// click to go to scatterplot
// other useful mouse interactions
//
////////////
import { Button, Select } from "antd";
import chroma from "chroma-js";
import * as d3 from "d3";
import React, { memo, ReactElement, useEffect, useMemo, useState, useTransition } from "react";
import styled from "styled-components";

import { ColorRamp, Dataset } from "../../colorizer";
import { CorrelationPlotConfig, ViewerConfig } from "../../colorizer/types";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../styles/utils";
import { ShowAlertBannerCallback } from "../Banner/hooks";

import SharedWorkerPool from "../../colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "../LoadingSpinner";

const NAN_COLOR = "#aaaaaa";

type CorrelationPlotTabProps = {
  dataset: Dataset | null;
  isVisible: boolean;
  isPlaying: boolean;

  colorRampMin: number;
  colorRampMax: number;
  colorRamp: ColorRamp;
  inRangeIds: Uint8Array;

  workerPool: SharedWorkerPool;
  viewerConfig: ViewerConfig;
  correlationPlotConfig: CorrelationPlotConfig;
  updateCorrelationPlotConfig: (config: Partial<CorrelationPlotConfig>) => void;
  showAlert: ShowAlertBannerCallback;
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

  /* text-shadow: -1px -1px 1px #ffffff, -1px 0px 1px #ffffff, -1px 1px 1px #ffffff, 0px -1px 1px #ffffff,
    0px 1px 1px #ffffff, 1px -1px 1px #ffffff, 1px 0px 1px #ffffff, 1px 1px 1px #ffffff; */
`;

/**
 * A tab that displays an interactive scatter plot between two features in the dataset.
 */
export default memo(function CorrelationPlotTab(props: CorrelationPlotTabProps): ReactElement {
  // ^ Memo prevents re-rendering if the props haven't changed.
  //const theme = useContext(AppThemeContext);

  const [_isPending, _startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is synchronous and can freeze the state update render,
  // so we need to track completion with a separate flag.
  // TODO: `isRendering` sometimes doesn't trigger the loading spinner.
  const [isRendering, setIsRendering] = useState(false);

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  const legendRef = React.useRef<HTMLDivElement>(null);
  const tooltipDivRef = React.useRef<HTMLDivElement>(null);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const sortedSelectedFeatures = useMemo(() => {
    // Keep in sorted order of the dataset
    const featureSet = new Set(selectedFeatures);
    return props.dataset?.featureKeys.filter((f) => featureSet.has(f)) || [];
  }, [props.dataset, selectedFeatures]);

  useEffect(() => {
    if (props.dataset && selectedFeatures.length === 0) {
      setSelectedFeatures(props.dataset.featureKeys);
    }
  }, [props.dataset]);

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  const { isPlaying } = props;
  const dataset = useDebounce(props.dataset, 500);

  // const _isDebouncePending =
  //   props.scatterPlotConfig !== scatterConfig ||
  //   dataset !== props.dataset ||
  //   colorRampMin !== props.colorRampMin ||
  //   colorRampMax !== props.colorRampMax;

  //////////////////////////////////
  // Helper Methods
  //////////////////////////////////

  /** Whether to ignore the render request until later (but continue to show as pending.) */
  const shouldDelayRender = (): boolean => {
    // Don't render when tab is not visible.
    // Also, don't render updates during playback, to prevent blocking the UI.
    return !props.isVisible || isPlaying;
  };

  //////////////////////////////////
  // Plot Rendering
  //////////////////////////////////

  const plotDependencies = [dataset, selectedFeatures];

  const renderPlot = async (_forceRelayout: boolean = false): Promise<void> => {
    if (!props.dataset) {
      return;
    }
    setIsRendering(true);
    const correlationData = await props.workerPool.getCorrelations(props.dataset!, sortedSelectedFeatures);
    // explode into d3 compatible data:
    const thedata: { x: number; y: number; value: number }[] = [];
    for (let i = 0; i < correlationData.length; i++) {
      for (let j = 0; j < correlationData[i].length; j++) {
        thedata.push({ x: i, y: j, value: correlationData[i][j] });
      }
    }

    const extent = d3.extent(
      thedata
        .map(function (d) {
          return d.value;
        })
        .filter(function (d) {
          return d !== 1;
        })
    );

    const grid: { x: number; y: number; value: number }[] = thedata;
    const rows =
      d3.max(grid, function (d) {
        return d.y;
      }) || 0;

    const margin = { top: 50, bottom: 1, left: 170, right: 1 };

    //const sizing = plotDivRef.current!.getBoundingClientRect();
    //const dim = d3.min([sizing.width * 0.9, sizing.height * 0.9]) || 0;
    //const dim = d3.min([plotDivRef.current!.clientWidth * 0.9, plotDivRef.current!.clientHeight * 0.9]) || 0;
    // const dim = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]) || 0;
    const dims = [600, 450];
    const width = dims[0] - margin.left - margin.right,
      height = dims[1] - margin.top - margin.bottom;

    // clear everything out!
    d3.select(plotDivRef.current).selectAll("*").remove();
    d3.select(legendRef.current).selectAll("*").remove();
    d3.select(tooltipDivRef.current).selectAll("*").remove();

    const svg = d3
      .select(plotDivRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    const padding = 0.1;

    const x = d3
      .scaleBand<number>()
      .range([0, width])
      .paddingInner(padding)
      .domain(d3.range(0, rows + 1));

    const y = d3
      .scaleBand<number>()
      .range([0, height])
      .paddingInner(padding)
      .domain(d3.range(0, rows + 1));

    const c = chroma.scale(["steelblue", "white", "tomato"]).domain([extent[0]!, 0, extent[1]!]);

    const featureKeys: string[] = sortedSelectedFeatures;
    const featureNames: string[] = sortedSelectedFeatures.map((key) => dataset?.getFeatureName(key) || key);

    const excludedWords = ["the", "and", "of", "in", "a", "an", "to", "for", "with", "on", "by", "as", "at", "from"];
    const xAxis = d3.axisTop(y).tickFormat(function (_d, i) {
      return featureNames[i]
        ? featureNames[i]
            .trim()
            .split(" ")
            .map((s) => (excludedWords.includes(s) ? "" : s[0].toUpperCase()))
            .join("")
        : "";
    });
    const yAxis = d3.axisLeft(x).tickFormat(function (_d, i) {
      return featureNames[i];
    });

    // Add X and Y axis labels.
    svg
      .append("g")
      .attr("class", "x axis")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.9em")
      .attr("dy", "1.2em")
      .attr("transform", "rotate(90)");

    svg.append("g").attr("class", "y axis").call(yAxis);

    svg
      .selectAll("rect")
      .data(grid, function (d: { x: number; y: number; value: number }) {
        return featureKeys[d.x] + featureKeys[d.y];
      } as any)
      .enter()
      .append("rect")
      .attr("x", function (d) {
        return x(d.x)!;
      })
      .attr("y", function (d) {
        return y(d.y)!;
      })
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) {
        if (Number.isNaN(d.value) || d.x === d.y) {
          return NAN_COLOR;
        }
        return c(d.value).hex();
      })
      .style("opacity", 1e-6)
      .transition()
      .style("opacity", 1);

    svg.selectAll("rect");

    // Mouse interactions
    d3.selectAll("rect")
      .on("mouseover", function (event) {
        // Show tooltip on hover
        const d = event.target.__data__;
        if (!d) {
          return;
        }
        d3.select(this).classed("selected", true);

        const xAxisName = dataset?.getFeatureNameWithUnits(featureKeys[d.x]);
        const yAxisName = dataset?.getFeatureNameWithUnits(featureKeys[d.y]);

        d3.select(tooltipDivRef.current)
          .style("display", "flex")
          .html(
            xAxisName + " ×<br/>" + yAxisName + "<br/>" + (d.value === undefined ? "undefined" : d.value.toFixed(2))
          );

        var rowPos = y(d.y)!;
        var colPos = x(d.x)!;
        var tipPos = (d3.select(tooltipDivRef.current).node() as HTMLElement).getBoundingClientRect();
        var tipWidth = tipPos.width;
        var tipHeight = tipPos.height;
        //var gridPos = (d3.select(plotDivRef.current).node() as HTMLElement).getBoundingClientRect();
        var gridLeft = 0; //gridPos.left;
        var gridTop = 0; //gridPos.top;

        var left = gridLeft + colPos + margin.left + x.bandwidth() / 2 - tipWidth / 2;
        var top = gridTop + rowPos + margin.top - tipHeight - 5;

        d3.select(tooltipDivRef.current)
          .style("left", left + "px")
          .style("top", top + "px");

        d3.select(".x.axis .tick:nth-of-type(" + d.x + ") text").classed("selected", true);
        d3.select(".y.axis .tick:nth-of-type(" + d.y + ") text").classed("selected", true);
        d3.select(".x.axis .tick:nth-of-type(" + d.x + ") line").classed("selected", true);
        d3.select(".y.axis .tick:nth-of-type(" + d.y + ") line").classed("selected", true);
      })
      .on("mouseout", function () {
        d3.selectAll("rect").classed("selected", false);
        d3.select(tooltipDivRef.current).style("display", "none");
        d3.selectAll(".axis .tick text").classed("selected", false);
        d3.selectAll(".axis .tick line").classed("selected", false);
      })
      .on("click", function (event) {
        // Open scatter plot tab on click with the specified features as X/Y axes.
        const d = event.target.__data__;
        if (!d) {
          return;
        }
        props.openScatterPlotTab(featureKeys[d.x], featureKeys[d.y]);
      });

    // legend scale
    var legendTop = 15;
    var legendHeight = 15;

    var legendSvg = d3
      .select(legendRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", legendHeight + legendTop)
      .append("g")
      .attr("transform", "translate(" + margin.left + ", " + legendTop + ")");

    var defs = legendSvg.append("defs");

    var gradient = defs.append("linearGradient").attr("id", "linear-gradient");

    var stops = [
      { offset: 0, color: "steelblue", value: extent[0] },
      { offset: 0.5, color: "white", value: 0 },
      { offset: 1, color: "tomato", value: extent[1] },
    ];

    gradient
      .selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", function (d) {
        return 100 * d.offset + "%";
      })
      .attr("stop-color", function (d) {
        return d.color;
      });

    legendSvg.append("rect").attr("width", width).attr("height", legendHeight).style("fill", "url(#linear-gradient)");

    legendSvg
      .selectAll("text")
      .data(stops)
      .enter()
      .append("text")
      .attr("x", function (d) {
        return width * d.offset;
      })
      .attr("dy", -3)
      .style("text-anchor", function (_d, i) {
        return i === 0 ? "start" : i === 1 ? "middle" : "end";
      })
      .text(function (d, i) {
        if (d.value === undefined) {
          return "--";
        }
        return d.value?.toFixed(2) + (i === 2 ? ">" : "");
      });

    setIsRendering(false);
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
          value={selectedFeatures}
          maxTagCount={"responsive"}
          onClear={() => setSelectedFeatures([])}
          disabled={!props.dataset}
          // TODO: Maintain dataset order
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
            <div id="grid" style={{ position: "relative" }} ref={plotDivRef}></div>
            <TipDiv style={{ display: "none" }} id="tip" ref={tooltipDivRef}></TipDiv>
          </div>
        </FlexColumnAlignCenter>
      </LoadingSpinner>
    </FlexColumnAlignCenter>
  );
});
