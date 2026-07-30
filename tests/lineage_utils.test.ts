import { describe, expect, it } from "vitest";

import { getCoparents } from "src/components/Tabs/Lineage/lineage_utils";

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
