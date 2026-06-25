import { describe, expect, it } from "vitest";

import { getUniqueKeyName } from "src/colorizer/dataset_loaders/dataset_loader_utils";

describe("getUniqueKeyName", () => {
  it("should return the original key if it is unique", () => {
    const existingKeys = new Set(["key1", "key2"]);
    const result = getUniqueKeyName("key3", "name", existingKeys);
    expect(result).toBe("key3");
  });

  it("gets a key from the name if none is provided", () => {
    const existingKeys = new Set(["key1", "key2"]);
    const result = getUniqueKeyName(undefined, "Some Name", existingKeys);
    expect(result).toBe("some_name");
  });

  it("prevents duplicate keys by appending a number", () => {
    const existingKeys = new Set(["key1", "key2", "key3"]);
    const result = getUniqueKeyName("key3", "name", existingKeys);
    expect(result).toBe("key3_1");
  });

  it("prevents duplicate keys by appending a number", () => {
    const existingKeys = new Set(["key", "key_1", "key_2"]);
    const result = getUniqueKeyName("key", "name", existingKeys);
    expect(result).toBe("key_3");
  });
});
