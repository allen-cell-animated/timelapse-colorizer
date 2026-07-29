import type * as d3 from "d3";
import type React from "react";
import type { Color } from "three";

export type TrackInfo = {
  id: number;
  length: number;
  startTime: number;
};

export type LineageData = {
  trackIdToTrackInfo: Map<number, TrackInfo>;
  edges: [number, number][];
};

export type LineageDataRelationships = {
  /** A map from a track ID to its children track IDs. */
  idToChildren: Map<number, number[]>;
  /**
   * A version of idToChildren where edges that would cause nodes to have
   * multiple parents are removed, as directly rendering this to a tree in d3
   * would cause duplicated leaf nodes. This typically occurs during merges
   * between two or more tracks. These edges are stored in `multiparentEdges`
   * instead.
   */
  idToChildrenRenderable: Map<number, number[]>;
  /** A list of edges that create a multi-parent relationship. */
  multiparentEdges: [number, number][];
  /** A map from a track ID to its parent track IDs. */
  idToParents: Map<number, number[]>;
};

export type SharedLineageViewProps = {
  container: React.RefObject<HTMLDivElement>;
  data: LineageData;
  relationships: LineageDataRelationships;
  selectedTracks: Set<number>;
  trackColors: Map<number, Color>;
  colorScale: d3.ScaleSequential<string>;
  radiusScale: d3.ScalePower<number, number>;
  onClick?: (trackId: number) => void;
  onHover?: (trackId: number | null) => void;
};
