export type TrackInfo = {
  id: number;
  length: number;
  startTime: number;
};

export type LineageObjectInfo = {
  id: number;
  trackId: number;
  time: number;
};

export type LineageData<T extends TrackInfo | LineageObjectInfo> = {
  idToInfo: Map<number, T>;
  edges: [number, number][];
};

export type LineageObjectData = {
  idToInfo: Map<number, LineageObjectInfo>;
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
