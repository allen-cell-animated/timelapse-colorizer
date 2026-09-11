import { describe, expect, it } from "vitest";

import {
  EMPTY_LINEAGE_DATA,
  getCoparents,
  getLineageRelationships,
  groupSelectedTracks,
} from "src/colorizer/utils/lineage_utils";
import { EXAMPLE_TREE } from "tests/constants";

describe("getCoparents", () => {
  it("returns empty array for empty inputs", () => {
    const idToChildren = new Map<number, number[]>();
    const idToParents = new Map<number, number[]>();
    const result = getCoparents(idToChildren, idToParents);
    expect(result.size).toBe(0);
  });

  it("does not return coparents when there are no merge nodes", () => {
    // 1 -> 2 -> 4
    //  \
    //   -> 3 -> 5
    const idToChildren = new Map<number, number[]>([
      [1, [2, 3]],
      [2, [4]],
      [3, [5]],
      [4, []],
      [5, []],
    ]);
    const idToParents = new Map<number, number[]>([
      [1, []],
      [2, [1]],
      [3, [1]],
      [4, [2]],
      [5, [3]],
    ]);
    const result = getCoparents(idToChildren, idToParents);
    expect(result.size).toBe(0);
  });

  it("returns coparents when a child has multiple parents", () => {
    /** 1 -> 2 -> 3
     *         /
     *       4
     */
    const idToChildren = new Map<number, number[]>([
      [1, [2]],
      [2, [3]],
      [3, []],
      [4, [3]],
    ]);
    const idToParents = new Map<number, number[]>([
      [1, []],
      [2, [1]],
      [3, [2, 4]],
      [4, []],
    ]);
    const result = getCoparents(idToChildren, idToParents);
    expect(result.size).toBe(2);
    expect(result.get(2)).toEqual(new Set([2, 4]));
    expect(result.get(4)).toEqual(new Set([2, 4]));
  });

  it("separates adjacent groups of coparents", () => {
    /**
     * 1 -> 4
     *   /
     * 2
     *   \
     * 3 -> 5
     */
    // 1 and 2 are coparents, 2 and 3 are coparents, but 1 and 3 are not
    const idToChildren = new Map<number, number[]>([
      [1, [4]],
      [2, [4, 5]],
      [3, [5]],
      [4, []],
      [5, []],
    ]);
    const idToParents = new Map<number, number[]>([
      [1, []],
      [2, []],
      [3, []],
      [4, [1, 2]],
      [5, [2, 3]],
    ]);
    const result = getCoparents(idToChildren, idToParents);
    expect(result.size).toBe(3);
    expect(result.get(1)).toEqual(new Set([1, 2]));
    expect(result.get(2)).toEqual(new Set([1, 2, 3]));
    expect(result.get(3)).toEqual(new Set([2, 3]));
  });
});

describe("groupSelectedTracks", () => {
  // Default tree:
  // 1 -> 2 -> 3
  //  \    \
  //   \    -> 4
  //    \
  //      -> 5 -> 6 -> 8
  //          \    /
  //           -> 7 -> 9

  const { relationships } = EXAMPLE_TREE;

  it("handles empty lineage data", () => {
    const emptyRelationships = getLineageRelationships(EMPTY_LINEAGE_DATA);
    const result = groupSelectedTracks([], emptyRelationships);
    expect(result).toEqual([]);
  });

  it("handles track IDs not in the tree", () => {
    const result = groupSelectedTracks([10, 45, 60], relationships);
    expect(result).toEqual([new Set([10]), new Set([45]), new Set([60])]);
  });

  it("separates isolated nodes", () => {
    const result = groupSelectedTracks([1, 3, 4, 6, 9], relationships);
    expect(result).toEqual([new Set([1]), new Set([3]), new Set([4]), new Set([6]), new Set([9])]);
  });

  it("groups separate sub-branches", () => {
    const result = groupSelectedTracks([1, 2, 3, 4, 6, 7, 8, 9], relationships);
    expect(result).toEqual([new Set([1, 2, 3, 4]), new Set([6, 7, 8, 9])]);
  });

  it("makes one group when whole tree is selected", () => {
    const result = groupSelectedTracks([1, 2, 3, 4, 5, 6, 7, 8, 9], relationships);
    expect(result).toEqual([new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])]);
  });

  it("handles varying selection order", () => {
    const result = groupSelectedTracks([3, 6, 4, 5, 9, 1, 2, 7, 8], relationships);
    expect(result).toEqual([new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])]);
  });
});
