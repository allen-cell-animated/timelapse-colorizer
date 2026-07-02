import type * as d3 from "d3";
import type React from "react";
import type { Color } from "three";

export type TrackInfo = {
  id: number;
  length: number;
  startTime: number;
};

export type LineageData = {
  trackInfo: TrackInfo[];
  edges: [number, number][];
};

export type SharedLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  data: LineageData;
  selectedTracks: Set<number>;
  trackColors: Map<number, Color>;
  colorScale: d3.ScaleSequential<string>;
  radiusScale: d3.ScalePower<number, number>;
  onClick?: (trackId: number) => void;
  onHover?: (trackId: number | null) => void;
};
