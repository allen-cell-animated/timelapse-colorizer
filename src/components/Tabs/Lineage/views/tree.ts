import * as d3 from "d3";

import { LineageData } from "../types.js";
import { moveTip } from "./force.js";

type TrackInfo = LineageData["trackInfo"][number];
type CrossLink = { source: number; target: number };

function tipHtml(track: TrackInfo) {
  return `<strong>track ${track.id}</strong><br>
    length: ${track.length}<br>
    startTime: ${track.startTime}`;
}

export function render(container: HTMLDivElement, data: LineageData) {
  const { trackInfo, edges } = data;
  const nodeById = new Map<number, TrackInfo>(trackInfo.map((track) => [track.id, track]));

  const startMin = d3.min(trackInfo, (d) => d.startTime) ?? 0;
  const startMax = d3.max(trackInfo, (d) => d.startTime) ?? startMin;
  const lengthMin = d3.min(trackInfo, (d) => d.length) ?? 1;
  const lengthMax = d3.max(trackInfo, (d) => d.length) ?? lengthMin;

  const safeStartMax = startMin === startMax ? startMin + 1 : startMax;
  const safeLengthMax = lengthMin === lengthMax ? lengthMin + 1 : lengthMax;

  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([startMin, safeStartMax]);
  const rScale = d3.scaleSqrt().domain([lengthMin, safeLengthMax]).range([10, 40]);

  // ── Find merge nodes (in-degree > 1) ─────────────────────────────────────
  const inDegree = new Map(trackInfo.map((n) => [n.id, 0]));
  for (const [, target] of edges) inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  const mergeNodes = new Set([...inDegree.entries()].filter(([, d]) => d > 1).map(([id]) => id));

  // ── Build spanning tree; collect cross-edges (extra parents of merge nodes) ─
  const childrenOf: Map<number, number[]> = new Map(trackInfo.map((n) => [n.id, []]));
  const hasParent = new Set<number>();
  const crossLinks: CrossLink[] = [];

  for (const [source, target] of edges) {
    if (!hasParent.has(target)) {
      childrenOf.get(source)?.push(target);
      hasParent.add(target);
    } else {
      crossLinks.push({ source, target });
    }
  }

  const rootNode = trackInfo.find((n) => !hasParent.has(n.id));
  if (!rootNode) {
    return;
  }
  const root = d3.hierarchy<TrackInfo>(rootNode, (d) =>
    (childrenOf.get(d.id) ?? []).flatMap((id) => {
      const track = nodeById.get(id);
      return track ? [track] : [];
    })
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  const leafCount = root.leaves().length;
  const depth = root.height;
  const NODE_SEP = 20; // px between leaves (vertical)
  const DEPTH_SEP = 110; // px per depth level (horizontal)

  const treeRoot = d3.tree<TrackInfo>().size([leafCount * NODE_SEP, depth * DEPTH_SEP])(root);

  // ── SVG ───────────────────────────────────────────────────────────────────
  const svg = d3
    .select(container)
    .append("svg")
    .style("width", "100%")
    .style("height", "100%")
    .style("display", "block");

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.05, 8])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);

  const MARGIN = { top: 10, left: 20 };
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // ── Tree edges (merge-node targets rendered orange to match cross-edges) ───
  g.append("g")
    .selectAll("line")
    .data(treeRoot.links())
    .join("line")
    .attr("stroke", (d) => (mergeNodes.has(d.target.data.id) ? "#f6ad55" : "#4a5568"))
    .attr("stroke-opacity", (d) => (mergeNodes.has(d.target.data.id) ? 0.7 : 0.6))
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", (d) => (mergeNodes.has(d.target.data.id) ? "4 3" : null))
    .attr("x1", (d) => d.source.y)
    .attr("y1", (d) => d.source.x)
    .attr("x2", (d) => d.target.y)
    .attr("y2", (d) => d.target.x);

  // ── Cross-edges (DAG edges not in spanning tree) ──────────────────────────
  if (crossLinks.length) {
    const posOf = new Map(treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.y }]));
    g.append("g")
      .selectAll("line")
      .data(crossLinks)
      .join("line")
      .attr("stroke", "#f6ad55")
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3")
      .attr("x1", (d) => posOf.get(d.source)?.y ?? 0)
      .attr("y1", (d) => posOf.get(d.source)?.x ?? 0)
      .attr("x2", (d) => posOf.get(d.target)?.y ?? 0)
      .attr("y2", (d) => posOf.get(d.target)?.x ?? 0);
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const node = g
    .append("g")
    .selectAll("g")
    .data(treeRoot.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  node
    .append("circle")
    .attr("r", (d) => rScale(d.data.length))
    .attr("fill", (d) => colorScale(d.data.startTime))
    .attr("stroke", "#1a1f2e")
    .attr("stroke-width", 1.5)
    .style("cursor", "default");

  node
    .append("text")
    .text((d) => d.data.id)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#b0b8cc")
    .attr("font-size", 9)
    .attr("pointer-events", "none");

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tip = d3.select(container).append("div").attr("class", "tip");

  node
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget).select("circle").attr("stroke", "#fff").attr("stroke-width", 2.5);
      tip.html(tipHtml(d.data)).style("opacity", 1);
      moveTip(event, tip.node(), container);
    })
    .on("mousemove", (event) => moveTip(event, tip.node(), container))
    .on("mouseout", (event) => {
      d3.select(event.currentTarget).select("circle").attr("stroke", "#1a1f2e").attr("stroke-width", 1.5);
      tip.style("opacity", 0);
    });

  // ── Legend ────────────────────────────────────────────────────────────────
  const gradCss = d3
    .range(0, 1.01, 0.1)
    .map((t) => colorScale(startMin + t * (safeStartMax - startMin)))
    .join(",");

  d3.select(container).append("div").style("position", "absolute").style("top", "46px").attr("class", "legend").html(`
    <strong>Color</strong> — startTime
    <div style="width:120px;height:10px;border-radius:4px;margin:4px 0 2px;
         background:linear-gradient(to right,${gradCss})"></div>
    <div style="display:flex;justify-content:space-between;width:120px;color:#888;font-size:10px">
      <span>${startMin}</span><span>${startMax}</span>
    </div>
    <div style="margin-top:8px"><strong>Size</strong> — length</div>
    <div style="color:#888;font-size:10px">${lengthMin} - ${lengthMax}</div>
    ${
      crossLinks.length
        ? `<div style="margin-top:8px;display:flex;align-items:center;gap:6px">
      <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3"
        stroke="#f6ad55" stroke-width="1.5" stroke-dasharray="4 3"/></svg>
      <span>merge edge</span></div>`
        : ""
    }
  `);

  // ── Fit tree to viewport on first render ─────────────────────────────────
  const gNode = g.node();
  if (!gNode) {
    return;
  }
  const bbox = gNode.getBBox();
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scale = Math.min(cw / (bbox.width + 80), ch / (bbox.height + 40)) * 0.92;
  const tx = (cw - bbox.width * scale) / 2 - bbox.x * scale;
  const ty = (ch - bbox.height * scale) / 2 - bbox.y * scale;
  const initT = d3.zoomIdentity.translate(tx, ty).scale(scale);
  zoom.transform(svg, initT);

  // ── Controls ──────────────────────────────────────────────────────────────
  const ctrl = d3
    .select(container)
    .append("div")
    .style("position", "absolute")
    .style("top", "20px")
    .attr("class", "controls");
  ctrl
    .append("button")
    .text("Fit to view")
    .on("click", () => {
      zoom.transform(svg.transition().duration(600), initT);
    });
}

export function teardown(container: HTMLDivElement) {
  d3.select(container).selectAll("svg, .tip, .legend, .controls").remove();
}
