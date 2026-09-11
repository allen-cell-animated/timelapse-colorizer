import { describe, expect, it } from "vitest";

import {
  getAncestors,
  getDescendants,
  matchesAllAncestors,
  matchesAllDescendants,
} from "src/colorizer/utils/lineage_utils";
import { EXAMPLE_TREE } from "tests/constants";

describe("tree_utils", () => {
  const { lineageData, relationships } = EXAMPLE_TREE;

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
