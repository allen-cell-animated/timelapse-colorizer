import * as d3 from "d3";

import { LineageData } from "../types.js";

type TrackInfo = LineageData["trackInfo"][number];

type ForceNode = d3.SimulationNodeDatum & TrackInfo;

type ForceLink = d3.SimulationLinkDatum<ForceNode> & {
  source: number | ForceNode;
  target: number | ForceNode;
};

let sim: d3.Simulation<ForceNode, ForceLink> | null = null;

function getNodeX(node: number | ForceNode): number {
  return typeof node === "number" ? 0 : node.x ?? 0;
}

function getNodeY(node: number | ForceNode): number {
  return typeof node === "number" ? 0 : node.y ?? 0;
}

export function render(container: HTMLDivElement, data: LineageData) {
  const { trackInfo, edges } = data;
  if (!trackInfo.length) {
    return;
  }

  const startMin = d3.min(trackInfo, (d) => d.startTime) ?? 0;
  const startMax = d3.max(trackInfo, (d) => d.startTime) ?? startMin;
  const lengthMin = d3.min(trackInfo, (d) => d.length) ?? 1;
  const lengthMax = d3.max(trackInfo, (d) => d.length) ?? lengthMin;

  const safeStartMax = startMin === startMax ? startMin + 1 : startMax;
  const safeLengthMax = lengthMin === lengthMax ? lengthMin + 1 : lengthMax;

  const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([startMin, safeStartMax]);
  const rScale = d3.scaleSqrt().domain([lengthMin, safeLengthMax]).range([8, 20]);

  const nodes: ForceNode[] = trackInfo.map((n) => ({ ...n }));
  const links: ForceLink[] = edges.map(([source, target]) => ({ source, target }));

  const W = container.clientWidth;
  const H = container.clientHeight;

  // Shallow copies so simulation mutations don't bleed into the shared data object.
  const simNodes: ForceNode[] = nodes.map((n) => ({ ...n }));
  const simLinks: ForceLink[] = links.map((l) => ({ ...l }));

  // ── Seed positions from radial layout so the simulation starts untangled ──
  {
    const nodeById2 = new Map<number, ForceNode>(nodes.map((n) => [n.id, n]));
    const childrenOf = new Map<number, number[]>(nodes.map((n) => [n.id, []]));
    const hasParent = new Set<number>();
    for (const [source, target] of edges) {
      if (!hasParent.has(target)) {
        childrenOf.get(source)?.push(target);
        hasParent.add(target);
      }
    }
    const rootData = nodes.find((n) => !hasParent.has(n.id));
    if (!rootData) {
      return;
    }
    const hierarchy = d3.hierarchy<ForceNode>(rootData, (d) =>
      (childrenOf.get(d.id) ?? []).flatMap((id) => {
        const child = nodeById2.get(id);
        return child ? [child] : [];
      })
    );
    const maxR = (Math.min(W, H) / 2) * 0.88;
    d3
      .tree<ForceNode>()
      .size([2 * Math.PI, maxR])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(a.depth, 1))(hierarchy);

    const radialPos = new Map<number, [number, number]>(
      hierarchy.descendants().map((d) => {
        const a = (d.x ?? 0) - Math.PI / 2;
        const radius = d.y ?? 0;
        return [d.data.id, [W / 2 + radius * Math.cos(a), H / 2 + radius * Math.sin(a)]];
      })
    );
    for (const n of simNodes) {
      const p = radialPos.get(n.id);
      if (p) [n.x, n.y] = p;
    }
  }

  // ── SVG ──────────────────────────────────────────────────────────────────
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

  const g = svg.append("g");
  const gLink = g.append("g");
  const gNode = g.append("g");

  // ── Links ─────────────────────────────────────────────────────────────────
  const link = gLink
    .selectAll<SVGLineElement, ForceLink>("line")
    .data(simLinks)
    .join("line")
    .attr("stroke", "#4a5568")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1.5);

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const node = gNode
    .selectAll<SVGGElement, ForceNode>("g")
    .data(simNodes, (d) => d.id)
    .join("g")
    .style("cursor", "grab")
    .call(makeDrag());

  node
    .append("circle")
    .attr("r", (d) => rScale(d.length))
    .attr("fill", (d) => colorScale(d.startTime))
    .attr("stroke", "#1a1f2e")
    .attr("stroke-width", 1.5);

  node
    .append("text")
    .text((d) => d.id)
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
      tip.html(tipHtml(d)).style("opacity", 1);
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

  d3.select(container).append("div").attr("class", "legend").html(`
    <strong>Color</strong> — startTime
    <div style="width:120px;height:10px;border-radius:4px;margin:4px 0 2px;
         background:linear-gradient(to right,${gradCss})"></div>
    <div style="display:flex;justify-content:space-between;width:120px;color:#888;font-size:10px">
      <span>${startMin}</span><span>${startMax}</span>
    </div>
    <div style="margin-top:8px"><strong>Size</strong> — length</div>
    <div style="color:#888;font-size:10px">${lengthMin} - ${lengthMax}</div>
  `);

  // ── Fit-to-view ───────────────────────────────────────────────────────────
  function fitToView() {
    const pad = 50;
    const [x0, x1] = d3.extent(simNodes, (n) => n.x);
    const [y0, y1] = d3.extent(simNodes, (n) => n.y);
    if (x0 == null || x1 == null || y0 == null || y1 == null) {
      return;
    }
    const bw = x1 - x0,
      bh = y1 - y0;
    const s = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
    const tx = W / 2 - (x0 + bw / 2) * s;
    const ty = H / 2 - (y0 + bh / 2) * s;
    zoom.transform(svg.transition().duration(600), d3.zoomIdentity.translate(tx, ty).scale(s));
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  let frozen = false;
  const ctrl = d3.select(container).append("div").attr("class", "controls");

  ctrl.append("button").text("Fit to view").on("click", fitToView);

  ctrl
    .append("button")
    .text("Freeze / Resume")
    .on("click", () => {
      frozen = !frozen;
      if (!sim) {
        return;
      }
      frozen ? sim.stop() : sim.alphaTarget(0.1).restart();
    });

  // ── Simulation ────────────────────────────────────────────────────────────
  // Run to convergence synchronously before rendering so the initial view is
  // already settled. For 155 nodes this takes well under 100 ms.
  sim = d3
    .forceSimulation(simNodes)
    .force(
      "link",
      d3
        .forceLink<ForceNode, ForceLink>(simLinks)
        .id((d) => d.id)
        .distance(40)
        .strength(0.7)
    )
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force(
      "collide",
      d3.forceCollide<ForceNode>((d) => rScale(d.length) + 6)
    )
    .stop();

  for (let i = 0; i < 600; i++) {
    sim.tick();
  }

  function tick() {
    link
      .attr("x1", (d) => getNodeX(d.source))
      .attr("y1", (d) => getNodeY(d.source))
      .attr("x2", (d) => getNodeX(d.target))
      .attr("y2", (d) => getNodeY(d.target));
    node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  }

  tick();
  fitToView();
  sim.on("tick", tick);

  function makeDrag() {
    return d3
      .drag<SVGGElement, ForceNode>()
      .on("start", (event, d) => {
        if (!sim) {
          return;
        }
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!sim) {
          return;
        }
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
}

export function teardown(container: HTMLDivElement) {
  d3.select(container).selectAll("svg, .tip, .legend, .controls").remove();
  sim?.stop();
  sim = null;
}

// ── Shared helpers ─────────────────────────────────────────────────────────

export function tipHtml(d: TrackInfo): string {
  return `<strong>track ${d.id}</strong><br>
    length: ${d.length}<br>
    startTime: ${d.startTime}`;
}

export function moveTip(event: MouseEvent, tipEl: HTMLElement | null, container: HTMLDivElement) {
  if (!tipEl) {
    return;
  }
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left + 14;
  const y = event.clientY - rect.top + 14;
  const overX = x + tipEl.offsetWidth > container.clientWidth;
  const overY = y + tipEl.offsetHeight > container.clientHeight;
  tipEl.style.left = (overX ? x - tipEl.offsetWidth - 28 : x) + "px";
  tipEl.style.top = (overY ? y - tipEl.offsetHeight - 28 : y) + "px";
}
