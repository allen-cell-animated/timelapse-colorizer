import { describe, expect, it } from "vitest";

import { getLineageRelationships } from "src/components/Tabs/Lineage/lineage_utils";
import { collapseTrack, expandTrack, TreeExpandedState } from "src/components/Tabs/Lineage/tree_utils";
import { LineageData, TrackInfo } from "src/components/Tabs/Lineage/types";

describe("tree_utils", () => {
  // EXAMPLE TREE:
  // 1 -> 2 -> 3
  //  \    \
  //   \    -> 4
  //    \
  //      -> 5 -> 6 -> 8
  //          \     /
  //           -> 7

  const trackIdToData = new Map<number, TrackInfo>([
    [1, { id: 1, length: 1, startTime: 0 }],
    [2, { id: 2, length: 1, startTime: 0 }],
    [3, { id: 3, length: 1, startTime: 0 }],
    [4, { id: 4, length: 1, startTime: 0 }],
    [5, { id: 5, length: 1, startTime: 0 }],
    [6, { id: 6, length: 1, startTime: 0 }],
    [7, { id: 7, length: 1, startTime: 0 }],
    [8, { id: 8, length: 1, startTime: 0 }],
  ]);

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
        expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 5, 6, 7, 8]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 5, 6, 7, 8]));
      });

      it("collapses all children of a parent node", () => {
        const startingState = getFullyExpandedState();
        const result = collapseTrack(2, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 5, 6, 7, 8]));
        // Collapsed children are still marked as previously expanded, so that
        // they can be restored if the parent is expanded again.
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 3, 4, 5, 6, 7, 8]));
      });

      it("collapses coparents simultaneously", () => {
        const startingState = getFullyExpandedState();
        // Node 6 and 7 are coparents, so collapsing one should collapse the other.
        const result = collapseTrack(6, startingState, lineageData, relationships);
        expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 4, 5]));
        expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 8]));
      });
    });

    it("toggling track expansion state will re-expand previously expanded children", () => {
      const startingState = getFullyExpandedState();
      const result = collapseTrack(5, startingState, lineageData, relationships);
      expect(result.expandedTracks).toEqual(new Set([1, 2, 3, 4]));
      // Collapsed children are still marked as previously expanded, so that
      // they can be restored if the parent is expanded again.
      expect(result.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 6, 7, 8]));

      const result2 = expandTrack(5, result, lineageData, relationships);
      expect(result2.expandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
      expect(result2.previouslyExpandedTracks).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    });
  });
});
