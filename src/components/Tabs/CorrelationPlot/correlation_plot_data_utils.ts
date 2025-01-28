import * as d3 from "d3";

export const SVG_TEXT_PADDING = 0.1;
export const NAN_COLOR = "#aaaaaa";

export type CellDatum = {
  x: number;
  y: number;
  value: number;
};

type GradientStop = {
  offset: number;
  color: string;
  value: number;
};

export type CorrelationPlotConfig = {
  margin: { top: number; bottom: number; left: number; right: number };
  plotWidth: number;
  plotHeight: number;
  legendHeight: number;
  legendTop: number;
  padding: number;
  colorMap: chroma.Scale<chroma.Color>;
};
type SelectedSvg<T extends SVGElement> = d3.Selection<T, unknown, null, undefined>;

/**
 * Formats correlation data as a CellDatum array which can be drawn using d3 and
 * returns the extent and number of rows.
 * @param correlationData A NxN number array representing correlations between
 * features.
 * @returns an object with the following properties:
 *  - `gridData`: A CellDatum array with one entry per cell in the original
 *    `correlationData` array.
 *  - `extent`: A 2-element array representing the min and max values that are
 *    not on the diagonal (1).
 *  - `numRows`: The number of rows
 */
export function correlationDataToCellDatum(correlationData: number[][]): {
  gridData: CellDatum[];
  extent: [number, number];
  numRows: number;
} {
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
  const numRows = correlationData.length;

  return {
    gridData,
    numRows,
    extent,
  };
}

export function areSetsEqual(a: Set<any>, b: Set<any>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

/** Truncates an SVG text element to a target pixel width. */
export function truncateText(textEl: SVGTextElement, widthPx: number): void {
  const d3Node = d3.select(textEl);
  let text = d3Node.text();
  let textLength = textEl.getComputedTextLength();

  while (textLength > widthPx - 2 * SVG_TEXT_PADDING && text.length > 0) {
    text = text.slice(0, -1);
    d3Node.text(text + "...");
    textLength = d3Node.node()?.getComputedTextLength() ?? 0;
  }
}

/////// Drawing SVG elements ////////////////////////////////

export function drawBaseSvg(plotDiv: HTMLDivElement, config: CorrelationPlotConfig): SelectedSvg<SVGGElement> {
  // clear everything out!
  d3.select(plotDiv).selectAll("*").remove();

  // Create new SVG element
  return d3
    .select(plotDiv)
    .append("svg")
    .attr("width", config.plotWidth + config.margin.left + config.margin.right)
    .attr("height", config.plotHeight + config.margin.top + config.margin.bottom)
    .append("g")
    .attr("transform", "translate(" + config.margin.left + ", " + config.margin.top + ")");
}

export function createScales(
  numRows: number,
  config: CorrelationPlotConfig
): { x: d3.ScaleBand<number>; y: d3.ScaleBand<number> } {
  return {
    x: d3.scaleBand<number>().range([0, config.plotWidth]).paddingInner(config.padding).domain(d3.range(0, numRows)),
    y: d3.scaleBand<number>().range([0, config.plotHeight]).paddingInner(config.padding).domain(d3.range(0, numRows)),
  };
}

/**
 * Draws the X and Y axis labels, which are the (optionally truncated) feature
 * names.
 */
export function drawAxesLabels(
  svg: SelectedSvg<SVGGElement>,
  featureNames: string[],
  x: d3.ScaleBand<number>,
  y: d3.ScaleBand<number>,
  config: CorrelationPlotConfig
): void {
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
      truncateText(this as SVGTextElement, config.margin.top - 10);
    });
  svg
    .select(".y.axis")
    .selectAll("text")
    .each(function (): void {
      truncateText(this as SVGTextElement, config.margin.left - 20);
    });
}

export function drawGrid(
  svg: SelectedSvg<SVGGElement>,
  gridData: CellDatum[],
  x: d3.ScaleBand<number>,
  y: d3.ScaleBand<number>,
  config: CorrelationPlotConfig
) {
  svg
    .selectAll("rect")
    .data(gridData)
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
      return config.colorMap(d.value).hex();
    })
    // Add fade-in transition
    .style("opacity", 1e-6)
    .transition()
    .style("opacity", 1);
}

export function drawLegend(legendDiv: HTMLDivElement, extent: [number, number], config: CorrelationPlotConfig) {
  d3.select(legendDiv).selectAll("*").remove();

  const legendSvg = d3
    .select(legendDiv)
    .append("svg")
    .attr("width", config.plotWidth + config.margin.left + config.margin.right)
    .attr("height", config.legendHeight + config.legendTop)
    .append("g")
    .attr("transform", "translate(" + config.margin.left + ", " + config.legendTop + ")");

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
    .attr("width", config.plotWidth)
    .attr("height", config.legendHeight)
    .style("fill", "url(#linear-gradient)");
  legendSvg
    .selectAll("text")
    .data(stops)
    .enter()
    .append("text")
    .attr("x", function (d: GradientStop) {
      return config.plotWidth * d.offset;
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
}
