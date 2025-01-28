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

import SharedWorkerPool from "../../../colorizer/workers/SharedWorkerPool";
import LoadingSpinner from "../../LoadingSpinner";

const NAN_COLOR = "#aaaaaa";
const SVG_TEXT_PADDING = 0.1;

type CorrelationPlotTabProps = {
  dataset: Dataset | null;
  workerPool: SharedWorkerPool;
  openScatterPlotTab(xAxisFeatureKey: string, yAxisFeatureKey: string): void;
};

type CellDatum = {
  x: number;
  y: number;
  value: number;
};

type GradientStop = {
  offset: number;
  color: string;
  value: number;
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

function areSetsEqual(a: Set<any>, b: Set<any>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

/** Truncates an SVG text element to a target pixel width. */
function truncateText(textEl: SVGTextElement, widthPx: number): void {
  const d3Node = d3.select(textEl);
  let text = d3Node.text();
  let textLength = textEl.getComputedTextLength();

  while (textLength > widthPx - 2 * SVG_TEXT_PADDING && text.length > 0) {
    text = text.slice(0, -1);
    d3Node.text(text + "...");
    textLength = d3Node.node()?.getComputedTextLength() ?? 0;
  }
}

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
    if (!props.dataset) {
      return;
    }
    setIsRendering(true);
    lastRenderedPlotFeatures.current = new Set(sortedSelectedFeatures);

    const correlationData = await props.workerPool.getCorrelations(props.dataset!, sortedSelectedFeatures);
    // Stop and discard correlation calculations that are not from our most
    // recent render request.
    if (!areSetsEqual(lastRenderedPlotFeatures.current, new Set(sortedSelectedFeatures))) {
      return;
    }

    // Explode into d3 compatible data
    const gridData: CellDatum[] = [];
    for (let i = 0; i < correlationData.length; i++) {
      for (let j = 0; j < correlationData[i].length; j++) {
        gridData.push({ x: i, y: j, value: correlationData[i][j] });
      }
    }
    // Get min/max values that aren't along the diagonal (which always has a
    // correlation score of 1)
    const extent = d3.extent(
      gridData
        .filter(function (d: CellDatum) {
          return d.x !== d.y;
        })
        .map(function (d: CellDatum) {
          return d.value;
        })
    ) as [number, number];
    const numRows =
      d3.max(gridData, function (d: CellDatum) {
        return d.y + 1;
      }) || 0;

    // TODO: Resize dynamically with container size
    const margin = { top: 50, bottom: 1, left: 150, right: 150 };
    const plotDim = 415;
    const plotWidth = plotDim,
      plotHeight = plotDim;
    const svgDims = [plotDim + margin.left + margin.right, plotDim + margin.top + margin.bottom];
    const padding = SVG_TEXT_PADDING;

    // clear everything out!
    d3.select(plotDivRef.current).selectAll("*").remove();
    d3.select(legendRef.current).selectAll("*").remove();
    d3.select(tooltipDivRef.current).selectAll("*").remove();

    // Create new SVG element
    const svg = d3
      .select(plotDivRef.current)
      .append("svg")
      .attr("width", svgDims[0])
      .attr("height", svgDims[1])
      .append("g")
      .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
    // Create scales
    const x = d3.scaleBand<number>().range([0, plotWidth]).paddingInner(padding).domain(d3.range(0, numRows));
    const y = d3.scaleBand<number>().range([0, plotHeight]).paddingInner(padding).domain(d3.range(0, numRows));
    // TODO: Make color ramp swappable
    const c = chroma.scale(["steelblue", "white", "tomato"]).domain([extent[0], 0, extent[1]]);

    const featureNames: string[] = sortedSelectedFeatures.map((key) => dataset?.getFeatureName(key) || key);

    // Space is limited for the X-axis, so turn feature names into an acronym
    // with the first letter of each word. Articles and other common words will
    // not be capitalized. (For example, "Volume at Start of Growth" -> "VaSoG")
    const lowercaseWords = ["the", "and", "of", "in", "a", "an", "to", "for", "with", "on", "by", "as", "at", "from"];
    const xAxis = d3.axisTop(y).tickFormat(function (_d, i) {
      return featureNames[i]
        ? featureNames[i]
            .trim()
            .split(" ")
            .map((s) => (lowercaseWords.includes(s) ? s[0].toLowerCase() : s[0].toUpperCase()))
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

    // Truncate axis labels to fit in margins
    svg
      .select(".x.axis")
      .selectAll("text")
      .each(function (): void {
        truncateText(this as SVGTextElement, margin.top - 10);
      });
    svg
      .select(".y.axis")
      .selectAll("text")
      .each(function (): void {
        truncateText(this as SVGTextElement, margin.left - 20);
      });

    // Draw grid
    svg
      .selectAll("rect")
      .data(gridData, function (d: CellDatum) {
        return sortedSelectedFeatures[d.x] + sortedSelectedFeatures[d.y];
      } as any)
      .enter()
      .append("rect")
      .attr("x", function (d: CellDatum) {
        return x(d.x)!;
      })
      .attr("y", function (d: CellDatum) {
        return y(d.y)!;
      })
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d: CellDatum) {
        if (Number.isNaN(d.value) || d.x === d.y) {
          return NAN_COLOR;
        }
        return c(d.value).hex();
      })
      // Add fade-in transition
      .style("opacity", 1e-6)
      .transition()
      .style("opacity", 1);

    // Mouse interactions
    d3.selectAll("rect")
      .on("mouseover", function (event) {
        // Show tooltip on hover
        const d = event.target.__data__ as CellDatum | undefined;
        if (!d) {
          return;
        }
        // Highlight the selected cell
        d3.select(this).classed("selected", true);

        // Update tooltip text with feature names and values
        const xAxisName = dataset?.getFeatureNameWithUnits(sortedSelectedFeatures[d.x]);
        const yAxisName = dataset?.getFeatureNameWithUnits(sortedSelectedFeatures[d.y]);
        d3.select(tooltipDivRef.current)
          .style("display", "flex")
          .html(
            xAxisName + " ×<br/>" + yAxisName + "<br/>" + (d.value === undefined ? "undefined" : d.value.toFixed(2))
          );

        // Position tooltip based on the selected cell
        const rowPos = y(d.y)!;
        const colPos = x(d.x)!;
        const tipPos = (d3.select(tooltipDivRef.current).node() as HTMLElement).getBoundingClientRect();
        const tipWidth = tipPos.width;
        const tipHeight = tipPos.height;
        const gridLeft = 0;
        const gridTop = 0;

        const left = gridLeft + colPos + margin.left + x.bandwidth() / 2 - tipWidth / 2;
        const top = gridTop + rowPos + margin.top - tipHeight - 5;

        d3.select(tooltipDivRef.current)
          .style("left", left + "px")
          .style("top", top + "px");

        d3.select(".x.axis .tick:nth-of-type(" + (d.x + 1) + ") text").classed("selected", true);
        d3.select(".y.axis .tick:nth-of-type(" + (d.y + 1) + ") text").classed("selected", true);
        d3.select(".x.axis .tick:nth-of-type(" + (d.x + 1) + ") line").classed("selected", true);
        d3.select(".y.axis .tick:nth-of-type(" + (d.y + 1) + ") line").classed("selected", true);
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
        props.openScatterPlotTab(sortedSelectedFeatures[d.x], sortedSelectedFeatures[d.y]);
      });

    // Draw legend (color gradient + min/max extent)
    const legendTop = 15;
    const legendHeight = 15;
    const legendSvg = d3
      .select(legendRef.current)
      .append("svg")
      .attr("width", plotWidth + margin.left + margin.right)
      .attr("height", legendHeight + legendTop)
      .append("g")
      .attr("transform", "translate(" + margin.left + ", " + legendTop + ")");

    const defs = legendSvg.append("defs");

    const gradient = defs.append("linearGradient").attr("id", "linear-gradient");
    const stops: GradientStop[] = [
      { offset: 0, color: "steelblue", value: extent[0] },
      { offset: 0.5, color: "white", value: 0 },
      { offset: 1, color: "tomato", value: extent[1] },
    ];
    gradient
      .selectAll("stop")
      .data(stops)
      .enter()
      .append("stop")
      .attr("offset", function (d: GradientStop) {
        return 100 * d.offset + "%";
      })
      .attr("stop-color", function (d: GradientStop) {
        return d.color;
      });

    legendSvg
      .append("rect")
      .attr("width", plotWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)");
    legendSvg
      .selectAll("text")
      .data(stops)
      .enter()
      .append("text")
      .attr("x", function (d: GradientStop) {
        return plotWidth * d.offset;
      })
      .attr("dy", -3)
      .style("text-anchor", function (_d, i) {
        return i === 0 ? "start" : i === 1 ? "middle" : "end";
      })
      .text(function (d: GradientStop, i) {
        if (d.value === undefined) {
          return "--";
        }
        return d.value?.toFixed(2) + (i === 2 ? ">" : "");
      });

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
