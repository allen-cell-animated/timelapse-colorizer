import * as d3 from "d3";
import { assert, describe, expect, it } from "vitest";

import { getLineageRelationships, getTreeHierarchy } from "src/components/Tabs/Plots/LineageGraph/lineage_utils";
import {
  alignMergeNodes,
  collapseTrack,
  expandTrack,
  getAncestors,
  getDescendants,
  getInitialExpandedState,
  matchesAllAncestors,
  matchesAllDescendants,
  type TreeExpandedState,
} from "src/components/Tabs/Plots/LineageGraph/tree_utils";
import type { LineageData, TrackInfo } from "src/components/Tabs/Plots/LineageGraph/types";

function makeTrackIdToData(numTracks: number): Map<number, TrackInfo> {
  const trackIds = Array.from({ length: numTracks }, (_, i) => i + 1);
  return new Map(trackIds.map((id) => [id, { id, length: 1, startTime: 0 }]));
}

describe("tree_utils", () => {
  // EXAMPLE TREE:
  // 1 -> 2 -> 3
  //  \    \
  //   \    -> 4
  //    \
  //      -> 5 -> 6 -> 8
  //          \    /
  //           -> 7 -> 9

  const trackIdToData = makeTrackIdToData(9);

  const lineageData = {
    trackIdToTrackInfo: trackIdToData,
    edges: [
      [1, 2],
      [2, 3],
      [2, 4],
      [1, 5],
      [5, 6],
      [5, 7],
      [6, 8],
      [7, 8],
      [7, 9],
    ],
  } satisfies LineageData;
  const relationships = getLineageRelationships(lineageData);

  function getFullyCollapsedState(): TreeExpandedState {
    return {
      expandedTracks: new Set<number>(),
      previouslyExpandedTracks: new Set<number>(),
    };
  }

  function getFullyExpandedState(): TreeExpandedState {
    const trackIds = Array.from(trackIdToData.keys());
    return {
      expandedTracks: new Set<number>(trackIds),
      previouslyExpandedTracks: new Set<number>(trackIds),
    };
  }

  describe("Tree expand/collapse", () => {
    describe("expandTrack", () => {
      it("handles track ID not in dataset", () => {
        const startingState = getFullyCollapsedState();
        const result = expandTrack(999, startingState, lineageData, relationships);
        expect(result).toEqual(startingState);
      });

      it("expands all state back to the root", () => {
        const startingState = getFullyCollapsedState();
        const result = expandTrack(4, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 2, 4]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 4]));
      });

      it("expands multiple parents for merge nodes", () => {
        const startingState = getFullyCollapsedState();
        const result = expandTrack(8, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 5, 6, 7, 8]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 5, 6, 7, 8]));
      });

      it("expands coparents simultaneously", () => {
        const startingState = getFullyCollapsedState();
        // Node 6 and 7 are coparents, so expanding one should expand the other.
        const result = expandTrack(6, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 5, 6, 7]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 5, 6, 7]));
      });

      // TODO: Fix this and check for coparents when expanding/collapsing. This
      // will require some work to avoid repeated traversals of the tree.
      it("KNOWN BUG: does not check coparents when expanding ancestors", () => {
        const startingState = getFullyCollapsedState();
        const result = expandTrack(9, startingState, lineageData, relationships);
        // Node 6 and 7 are coparents, so a totally correct implementation would
        // expand both. However, the current implementation only expands the
        // ancestor path of the selected node, so only 6 is expanded.
        expect(result.expandedTracks).toEqual(new Set([1, 5, 7, 9]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 5, 7, 9]));
      });
    });

    describe("collapseTrack", () => {
      it("handles track ID not in dataset", () => {
        const startingState = getFullyExpandedState();
        const result = collapseTrack(999, startingState, lineageData, relationships);
        expect(result).toEqual(startingState);
      });

      it("collapses leaf nodes", () => {
        const startingState = getFullyExpandedState();
        const result = collapseTrack(4, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 5, 6, 7, 8, 9]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 5, 6, 7, 8, 9]));
      });

      it("collapses all children of a parent node", () => {
        const startingState = getFullyExpandedState();
        const result = collapseTrack(2, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 5, 6, 7, 8, 9]));
        // Collapsed children are still marked as previously expanded, so that
        // they can be restored if the parent is expanded again.
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 3, 4, 5, 6, 7, 8, 9]));
      });

      it("collapses coparents simultaneously", () => {
        const startingState = getFullyExpandedState();
        // Node 6 and 7 are coparents, so collapsing one should collapse the other.
        const result = collapseTrack(6, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 4, 5]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 8, 9]));
      });
    });

    it("toggling track expansion state will re-expand previously expanded children", () => {
      const startingState = getFullyExpandedState();
      const result = collapseTrack(5, startingState, lineageData, relationships);
      expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 4]));
      expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 6, 7, 8, 9]));

      const result2 = expandTrack(5, result, lineageData, relationships);
      expect(result2.expandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      expect(result2.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });
  });

  describe("getInitialExpandedState", () => {
    it("returns empty expanded state if no tracks provided", () => {
      const result = getInitialExpandedState(new Set(), lineageData, relationships);
      expect(result).toEqual({
        expandedTracks: new Set(),
        previouslyExpandedTracks: new Set(),
      });
    });

    it("expands from a single child node", () => {
      const selectedTrackIds = new Set([4]);
      const result = getInitialExpandedState(selectedTrackIds, lineageData, relationships);
      expect(result.expandedTracks).toEqual(new Set([1, 2, 4]));
      expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 4]));
    });

    it("expands multiple nodes", () => {
      const selectedTrackIds = new Set([4, 5]);
      const result = getInitialExpandedState(selectedTrackIds, lineageData, relationships);
      expect(result.expandedTracks).toEqual(new Set([1, 2, 4, 5]));
      expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 4, 5]));
    });

    it("handles expanding coparents of nodes", () => {
      const selectedTrackIds = new Set([6]);
      const result = getInitialExpandedState(selectedTrackIds, lineageData, relationships);
      expect(result.expandedTracks).toEqual(new Set([1, 5, 6, 7]));
      expect(result.previouslyExpandedTracks).toEqual(new Set([1, 5, 6, 7]));
    });
  });

  describe("getAncestors", () => {
    const tests = [
      ["handles nonexistent nodes", 1200, []],
      ["handles bad input nodes", NaN, []],
      ["handles bad input nodes", Infinity, []],
      ["returns set of ancestors", 4, [1, 2]],
      ["returns empty set for nodes with no parents", 1, []],
      ["returns coparents", 8, [1, 5, 6, 7]],
    ] as const;

    for (const [description, trackId, expectedAncestors] of tests) {
      it(description, () => {
        const ancestors = getAncestors(trackId, lineageData, relationships);
        expect(ancestors).toEqual(new Set(expectedAncestors));
      });
    }
  });

  describe("getDescendants", () => {
    const tests = [
      ["handles nonexistent nodes", 1200, []],
      ["handles bad input nodes", NaN, []],
      ["handles bad input nodes", Infinity, []],
      ["returns set of descendants", 2, [3, 4]],
      ["returns empty set for nodes with no children", 9, []],
      ["returns descendants of merge nodes", 5, [6, 7, 8, 9]],
    ] as const;

    for (const [description, trackId, expectedDescendants] of tests) {
      it(description, () => {
        const descendants = getDescendants(trackId, lineageData, relationships);
        expect(descendants).toEqual(new Set(expectedDescendants));
      });
    }
  });

  describe("matchesAllAncestors", () => {
    const tests = [
      ["returns true for nodes with all ancestors selected", 4, [1, 2], true],
      ["returns false if any ancestor fails validator", 4, [2], false],
      ["handles coparents", 9, [1, 5, 6, 7], true],
      ["handles coparent failing validator", 9, [1, 5, 6], false], // 7 failed
      ["returns true for nodes with no parents", 1, [], true],
    ] as [string, number, number[], boolean][];

    for (const [description, trackId, selectedAncestors, expectedResult] of tests) {
      it(description, () => {
        const selectedAncestorsSet = new Set(selectedAncestors);
        const validator = (id: number): boolean => selectedAncestorsSet.has(id);
        const result = matchesAllAncestors(trackId, validator, lineageData, relationships);
        expect(result).toBe(expectedResult);
      });
    }
  });

  describe("matchesAllDescendants", () => {
    const tests = [
      ["returns true for nodes with all descendants selected", 2, [3, 4], true],
      ["returns false if any descendant fails validator", 2, [3], false],
      ["handles merge nodes", 5, [6, 7, 8, 9], true],
      ["handles merge nodes failing validator", 5, [6, 7, 8], false], // 9 failed
      ["returns true for nodes with no children", 9, [], true],
    ] as [string, number, number[], boolean][];

    for (const [description, trackId, selectedDescendants, expectedResult] of tests) {
      it(description, () => {
        const selectedDescendantsSet = new Set(selectedDescendants);
        const validator = (id: number): boolean => selectedDescendantsSet.has(id);
        const result = matchesAllDescendants(trackId, validator, lineageData, relationships);
        expect(result).toBe(expectedResult);
      });
    }
  });
});

describe("alignMergeNodes", () => {
  // EXAMPLE TREE:
  //      3   6
  //     / \ /
  //    2   5
  //   / \ / \   8    11
  //  /   4   \ / \  /
  // 1         7   10
  //  \         \ /  \
  //   \         9    12
  //    13
  const trackIdToData = makeTrackIdToData(13);
  const lineageData = {
    trackIdToTrackInfo: trackIdToData,
    edges: [
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [3, 5],
      [5, 6],
      [5, 7],
      [7, 8],
      [7, 9],
      [8, 10],
      [9, 10],
      [10, 11],
      [10, 12],
      [1, 13],
    ],
  } satisfies LineageData;
  const relationships = getLineageRelationships(lineageData);
  const hierarchy = getTreeHierarchy(lineageData, relationships);

  it("aligns merge nodes", () => {
    assert(hierarchy !== undefined);
    const root = hierarchy;
    const leafCount = root.leaves().length;
    const depth = root.height;
    const treeRoot = d3.tree<TrackInfo>().size([leafCount, depth])(root);

    const idToOldPos = new Map(treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.y }]));
    const getOldPos = (id: number): { x: number; y: number } => idToOldPos.get(id) ?? { x: 0, y: 0 };

    // Merge node 5 and 10 not aligned with parents
    expect(getOldPos(5).x).not.toBeCloseTo((getOldPos(3).x + getOldPos(4).x) / 2);
    expect(getOldPos(10).x).not.toBeCloseTo((getOldPos(8).x + getOldPos(9).x) / 2);
    expect(relationships.idToParents.get(5)).toEqual([4, 3]);
    expect(relationships.idToParents.get(10)).toEqual([8, 9]);

    alignMergeNodes(treeRoot, lineageData, relationships);

    // Merge node is aligned with parents
    const idToNewPos = new Map(treeRoot.descendants().map((d) => [d.data.id, { x: d.x, y: d.y }]));
    const getNewPos = (id: number): { x: number; y: number } => idToNewPos.get(id) ?? { x: 0, y: 0 };

    expect(getNewPos(5).x).toBeCloseTo((getNewPos(3).x + getNewPos(4).x) / 2);
    expect(getNewPos(10).x).toBeCloseTo((getNewPos(8).x + getNewPos(9).x) / 2);

    // Check that descendants of the merge node are shifted by the same amount
    const offset = getNewPos(5).x - getOldPos(5).x;
    expect(getNewPos(6).x - getOldPos(6).x).toBeCloseTo(offset);
    expect(getNewPos(7).x - getOldPos(7).x).toBeCloseTo(offset);
  });
});
