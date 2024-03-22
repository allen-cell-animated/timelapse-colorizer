import { describe, expect, it } from "vitest";

import { getKeyFromName } from "../src/colorizer/utils/data_utils";

describe("data_utils", () => {
  describe("getKeyFromName", () => {
    it("handles empty strings", () => {
      expect(getKeyFromName("")).toBe("");
    });

    it("allows alphanumeric and underscore characters", () => {
      expect(getKeyFromName("a")).toBe("a");
      expect(getKeyFromName("_")).toBe("_");
      expect(getKeyFromName("az09")).toBe("az09");
      expect(getKeyFromName("a_b_c")).toBe("a_b_c");
      expect(getKeyFromName("abc_123")).toBe("abc_123");
    });

    it("sets alphabetic characters to lowercase", () => {
      expect(getKeyFromName("A")).toBe("a");
      expect(getKeyFromName("Z")).toBe("z");
      expect(getKeyFromName("ABCDEFG")).toBe("abcdefg");
    });

    it("replaces non-alphanumeric characters with underscores", () => {
      expect(getKeyFromName("+")).toBe("_");
      expect(getKeyFromName("...")).toBe("___");
      expect(getKeyFromName("Some Name (a)")).toBe("some_name__a_");
      expect(getKeyFromName("&Another Name%")).toBe("_another_name_");
    });
  });
});
