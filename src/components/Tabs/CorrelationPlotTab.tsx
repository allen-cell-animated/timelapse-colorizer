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
import { Select } from "antd";
import chroma from "chroma-js";
import * as d3 from "d3";
import React, { memo, ReactElement, useEffect, useState, useTransition } from "react";
import styled from "styled-components";

import { ColorRamp, Dataset } from "../../colorizer";
import { CorrelationPlotConfig, ViewerConfig } from "../../colorizer/types";
import { useDebounce } from "../../colorizer/utils/react_utils";
import { FlexColumnAlignCenter } from "../../styles/utils";
import { ShowAlertBannerCallback } from "../Banner/hooks";

import SharedWorkerPool from "../../colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "../LoadingSpinner";

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
  font-size: 0.8em;
  text-align: center;
  text-shadow: -1px -1px 1px #ffffff, -1px 0px 1px #ffffff, -1px 1px 1px #ffffff, 0px -1px 1px #ffffff,
    0px 1px 1px #ffffff, 1px -1px 1px #ffffff, 1px 0px 1px #ffffff, 1px 1px 1px #ffffff;
`;

/**
 * A tab that displays an interactive scatter plot between two features in the dataset.
 */
export default memo(function CorrelationPlotTab(props: CorrelationPlotTabProps): ReactElement {
  // ^ Memo prevents re-rendering if the props haven't changed.
  //const theme = useContext(AppThemeContext);

  const [_isPending, startTransition] = useTransition();
  // This might seem redundant with `isPending`, but `useTransition` only works within React's
  // update cycle. Plotly's rendering is synchronous and can freeze the state update render,
  // so we need to track completion with a separate flag.
  // TODO: `isRendering` sometimes doesn't trigger the loading spinner.
  const [isRendering, setIsRendering] = useState(false);

  const plotDivRef = React.useRef<HTMLDivElement>(null);
  const legendRef = React.useRef<HTMLDivElement>(null);
  const tooltipDivRef = React.useRef<HTMLDivElement>(null);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (props.dataset && selectedFeatures.length === 0) {
      setSelectedFeatures(props.dataset.featureKeys);
    }
  }, [props.dataset]);

  // Debounce changes to the dataset to prevent noticeably blocking the UI thread with a re-render.
  // Show the loading spinner right away, but don't initiate the state update + render until the debounce has settled.
  const { isPlaying, isVisible } = props;
  const dataset = useDebounce(props.dataset, 500);

  // const _isDebouncePending =
  //   props.scatterPlotConfig !== scatterConfig ||
  //   dataset !== props.dataset ||
  //   colorRampMin !== props.colorRampMin ||
  //   colorRampMax !== props.colorRampMax;

  //////////////////////////////////
  // Click Handlers
  //////////////////////////////////

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
    console.log("Re-render of correlation plot was triggered.");
    console.time("compute correlations");
    setIsRendering(true);
    const correlationData = await props.workerPool.getCorrelations(props.dataset!, selectedFeatures);
    console.timeEnd("compute correlations");
    console.time("render plot");
    // explode into d3 compatible data:
    const thedata: { x: number; y: number; value: number }[] = [];
    for (let i = 0; i < correlationData.length; i++) {
      for (let j = 0; j < correlationData[i].length; j++) {
        thedata.push({ x: i, y: j, value: correlationData[i][j] });
      }
    }

    /***************************/
    const extent = d3.extent(
      thedata
        .map(function (d) {
          return d.value;
        })
        .filter(function (d) {
          return d !== 1;
        })
    );

    const grid: { x: number; y: number; value: number }[] = thedata; //data2grid.grid(thedata);
    const rows =
      d3.max(grid, function (d) {
        return d.y;
      }) || 0;

    const margin = { top: 20, bottom: 1, left: 20, right: 1 };

    //const sizing = plotDivRef.current!.getBoundingClientRect();
    //const dim = d3.min([sizing.width * 0.9, sizing.height * 0.9]) || 0;
    //const dim = d3.min([plotDivRef.current!.clientWidth * 0.9, plotDivRef.current!.clientHeight * 0.9]) || 0;
    // const dim = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]) || 0;
    const dim = 450;
    const width = dim - margin.left - margin.right,
      height = dim - margin.top - margin.bottom;

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
      .domain(d3.range(1, rows + 1));

    const y = d3
      .scaleBand<number>()
      .range([0, height])
      .paddingInner(padding)
      .domain(d3.range(1, rows + 1));

    const c = chroma.scale(["tomato", "white", "steelblue"]).domain([extent[0]!, 0, extent[1]!]);

    const cols: string[] = props.dataset?.featureKeys!;

    const xAxis = d3.axisTop(y).tickFormat(function (_d, i) {
      return cols[i];
    });
    const yAxis = d3.axisLeft(x).tickFormat(function (_d, i) {
      return cols[i];
    });

    svg
      .append("g")
      .attr("class", "x axis")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.9em")
      .attr("dy", "1.2em")
      .attr("transform", "rotate(90)");
    // svg
    // .append("g")
    // .attr("class", "x axis")
    // .attr("transform", "translate(0," + height + ")")
    // .call(xAxis)
    // .selectAll("text")
    // .style("text-anchor", "end")
    // .attr("dx", "-.8em")
    // .attr("dy", ".15em")
    // .attr("transform", "rotate(-65)");

    svg.append("g").attr("class", "y axis").call(yAxis);

    svg
      .selectAll("rect")
      .data(grid, function (d: { x: number; y: number; value: number }) {
        return cols[d.x] + cols[d.y];
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
        return c(d.value).hex();
      })
      .style("opacity", 1e-6)
      .transition()
      .style("opacity", 1);

    svg.selectAll("rect");

    d3.selectAll("rect")
      .on("mouseover", function (event) {
        const d = event.target.__data__;
        if (!d) {
          return;
        }
        d3.select(this).classed("selected", true);

        d3.select(tooltipDivRef.current)
          .style("display", "block")
          .html(cols[d.x] + ", " + cols[d.y] + ": " + (d.value === undefined ? "undefined" : d.value.toFixed(2)));

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
        const d = event.target.__data__;
        if (!d) {
          return;
        }
        props.openScatterPlotTab(cols[d.x], cols[d.y]);
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
      { offset: 0, color: "tomato", value: extent[0] },
      { offset: 0.5, color: "white", value: 0 },
      { offset: 1, color: "steelblue", value: extent[1] },
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
        return d.value?.toFixed(2) + (i === 2 ? ">" : "");
      });
    /*************************/
    /******************** 
    // set the dimensions and margins of the graph
    var margin = { top: 80, right: 25, bottom: 30, left: 40 },
      width = 450 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3
      .select(plotDivRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'
    var myGroups = props.dataset?.featureKeys!;
    var myVars = props.dataset?.featureKeys!;

    // Build X scales and axis:
    var x = d3.scaleBand().range([0, width]).domain(myGroups).padding(0.05);
    svg
      .append("g")
      .style("font-size", 15)
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain")
      .remove();

    // Build Y scales and axis:
    var y = d3.scaleBand().range([height, 0]).domain(myVars).padding(0.05);
    svg.append("g").style("font-size", 15).call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

    // Build color scale
    var myColor = d3.scaleSequential().interpolator(d3.interpolateInferno).domain([-1, 1]);

    // create a tooltip
    var tooltip = d3
      .select(plotDivRef.current)
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px");

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (this: SVGRectElement, _event: any): void {
      tooltip.style("opacity", 1);
      d3.select(this).style("stroke", "black").style("opacity", 1);
    };
    var mousemove = function (this: SVGRectElement, _event: any): void {
      tooltip
        .html("The exact value of<br>this cell is: " + _event.target.__data__.value)
        .style("left", _event.pageX + 70 + "px")
        .style("top", _event.pageY + "px");
    };
    var mouseleave = function (this: SVGRectElement, _event: any): void {
      tooltip.style("opacity", 0);
      d3.select(this).style("stroke", "none").style("opacity", 0.8);
    };

    // add the squares
    svg
      .selectAll()
      .data(thedata, function (d) {
        return "" + myGroups[d!.x] + ":" + myVars[d!.y];
      })
      .enter()
      .append("rect")
      .attr("x", function (d) {
        return x(myGroups[d.x])!;
      })
      .attr("y", function (d) {
        return y(myVars[d.y])!;
      })
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) {
        return myColor(d.value);
      })
      .style("stroke-width", 4)
      .style("stroke", "none")
      .style("opacity", 0.8)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    // Add title to graph
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", -50)
      .attr("text-anchor", "left")
      .style("font-size", "22px")
      .text("Correlation Matrix");

    // Add subtitle to graph
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", -20)
      .attr("text-anchor", "left")
      .style("font-size", "14px")
      .style("fill", "grey")
      .style("max-width", 400)
      .text("Pearson correlation of all features.");

     */
    console.timeEnd("render plot");
    setIsRendering(false);
  };

  /**
   * Re-render the plot when the relevant props change.
   */
  useEffect(() => {
    if (shouldDelayRender() || isRendering) {
      return;
    }
    renderPlot();
  }, plotDependencies);

  //////////////////////////////////
  // Component Rendering
  //////////////////////////////////

  return (
    <FlexColumnAlignCenter $gap={10} style={{ height: "100%" }}>
      {/* <Select style={{ width: "100%" }} allowClear mode="multiple" placeholder="Add features"></Select> */}
      <LoadingSpinner loading={isRendering} style={{ height: "100%" }}>
        <FlexColumnAlignCenter $gap={5}>
          <div id="legend" style={{ position: "relative" }} ref={legendRef}></div>
          <div id="grid" style={{ position: "relative" }} ref={plotDivRef}></div>
          <TipDiv style={{ display: "none" }} id="tip" ref={tooltipDivRef}></TipDiv>
        </FlexColumnAlignCenter>
      </LoadingSpinner>
    </FlexColumnAlignCenter>
  );
});
