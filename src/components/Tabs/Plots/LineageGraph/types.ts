import type * as d3 from "d3";

import type { TrackInfo } from "src/colorizer/types";

export type LineageNodeSelection = d3.Selection<
  SVGGElement | d3.BaseType,
  d3.HierarchyPointNode<TrackInfo>,
  SVGGElement,
  TrackInfo
>;
