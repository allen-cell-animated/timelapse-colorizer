import { describe, expect, it } from "vitest";

import { ANY_ERROR } from "./test_utils";

import DataCache from "../src/colorizer/DataCache";

describe("DataCache", () => {
  class DisposableString {
    public value: string;
    public hasBeenDisposed: boolean = false;

    constructor(value: string) {
      this.value = value;
    }

    dispose() {
      this.hasBeenDisposed = true;
    }
  }

  it("can insert and retrieve values up to capacity", () => {
    const cache = new DataCache<DisposableString>(3);

    cache.insert("1", new DisposableString("A"));
    expect(cache.size).toBe(1);
    cache.insert("2", new DisposableString("B"));
    expect(cache.size).toBe(2);
    cache.insert("3", new DisposableString("C"));
    expect(cache.size).toBe(3);
  });

  it("returns undefined for values not in cache", () => {
    const cache = new DataCache<DisposableString>(3);

    cache.insert("1", new DisposableString("A"));

    expect(cache.get("2")?.value).toBe(undefined);
    expect(cache.get("3")?.value).toBe(undefined);
    expect(cache.get("A")?.value).toBe(undefined);
  });

  it("accepts both integers and strings as keys", () => {
    const cache = new DataCache<DisposableString>(3);

    cache.insert("1", new DisposableString("A"));
    cache.insert("2", new DisposableString("B"));
    cache.insert("3", new DisposableString("C"));

    expect(cache.get("1")?.value).toBe("A");
    expect(cache.get(1)?.value).toBe("A");
    expect(cache.get("2")?.value).toBe("B");
    expect(cache.get(2)?.value).toBe("B");
    expect(cache.get("3")?.value).toBe("C");
    expect(cache.get(3)?.value).toBe("C");
  });

  it("evicts entries when new items are inserted", () => {
    const cache = new DataCache<DisposableString>(3);
    cache.insert("1", new DisposableString("A"));
    cache.insert("2", new DisposableString("B"));
    cache.insert("3", new DisposableString("C"));

    expect(cache.size).toBe(3);

    cache.insert("4", new DisposableString("D"));

    expect(cache.size).toBe(3);
    expect(cache.get("1")?.value).toBe(undefined);
    expect(cache.get("2")?.value).toBe("B");
    expect(cache.get("3")?.value).toBe("C");
    expect(cache.get("4")?.value).toBe("D");
  });

  it("calls dispose() on entries when they are evicted", () => {
    const cache = new DataCache<DisposableString>(1);
    const a = new DisposableString("A");
    const b = new DisposableString("B");

    cache.insert("1", a);
    expect(a.hasBeenDisposed).toBe(false);

    cache.insert("2", b);
    expect(a.hasBeenDisposed).toBe(true);
    expect(b.hasBeenDisposed).toBe(false);
  });

  it("moves values to front of list when they are accessed (evicts LRU)", () => {
    const cache = new DataCache<DisposableString>(3);
    cache.insert("1", new DisposableString("A"));
    cache.insert("2", new DisposableString("B"));
    cache.insert("3", new DisposableString("C"));

    // 1 is oldest, but accessing it will make it the newest.
    // 2 is now the oldest and will be evicted.
    cache.get("1");

    cache.insert("4", new DisposableString("D"));
    expect(cache.size).toBe(3);
    expect(cache.get("1")?.value).toBe("A");
    expect(cache.get("2")?.value).toBe(undefined);
    expect(cache.get("3")?.value).toBe("C");
    expect(cache.get("4")?.value).toBe("D");
  });

  it("replaces values when reinserted", () => {
    const cache = new DataCache<DisposableString>(3);
    cache.insert("1", new DisposableString("A"));
    expect(cache.get("1")?.value).toBe("A");

    cache.insert("1", new DisposableString("AA"));
    expect(cache.get("1")?.value).toBe("AA");
  });

  it("evicts entries by size", () => {
    const cache = new DataCache<DisposableString>(3);
    cache.insert("1", new DisposableString("A"), 1);
    expect(cache.size).toBe(1);
    cache.insert("2", new DisposableString("B"), 2);
    expect(cache.size).toBe(3);

    // Size 2 means both previous entries should get evicted
    cache.insert("3", new DisposableString("C"), 2);
    expect(cache.size).toBe(2);
    expect(cache.get("1")?.value).toBe(undefined);
    expect(cache.get("2")?.value).toBe(undefined);
    expect(cache.get("3")?.value).toBe("C");
  });

  it("throws an error if entry size is larger than capacity", () => {
    const cache = new DataCache<DisposableString>(3);
    expect(() => cache.insert("1", new DisposableString("A"), 4)).toThrowError(ANY_ERROR);
  });
});
