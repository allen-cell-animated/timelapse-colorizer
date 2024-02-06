import { describe, expect, it } from "vitest";
import { MAX_FEATURE_CATEGORIES } from "../src/constants";
import { Color } from "three";
import { DEFAULT_CATEGORICAL_PALETTES, DEFAULT_CATEGORICAL_PALETTE_ID } from "../src/colorizer";

describe("Categorical Palettes", () => {
  it("has expected length", () => {
    DEFAULT_CATEGORICAL_PALETTES.forEach((palette) => {
      expect(palette.colorStops.length).to.equal(MAX_FEATURE_CATEGORIES);
    });
  });

  it("has well-formatted hex strings", () => {
    DEFAULT_CATEGORICAL_PALETTES.forEach((palette) => {
      expect(palette.colorStops.every((color) => color.startsWith("#"))).to.be.true;
      expect(palette.colorStops.every((color) => color.length === 7)).to.be.true;
    });
  });

  it("can be interepreted as Color", () => {
    DEFAULT_CATEGORICAL_PALETTES.forEach((palette) => {
      palette.colorStops.every((color) => new Color(color));
    });
  });

  it("has the default ID as a key for categorical palettes", () => {
    expect(DEFAULT_CATEGORICAL_PALETTES.has(DEFAULT_CATEGORICAL_PALETTE_ID)).to.be.true;
  });

  it("does not have duplicated color stops", () => {
    for (const palette of DEFAULT_CATEGORICAL_PALETTES.values()) {
      const uniqueStops = new Set(palette.colorStops);
      if (palette.colorStops.length !== uniqueStops.size) {
        console.error(palette.key + " has duplicated color stops!");
      }
      expect(palette.colorStops.length).to.equal(uniqueStops.size);
    }
  });

  it("has sanitized keys", () => {
    for (const palette of DEFAULT_CATEGORICAL_PALETTES.values()) {
      expect(/^[a-z0-9_]+$/g.test(palette.key)).to.be.true;
    }
  });
});
