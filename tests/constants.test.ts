import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORICAL_PALETTES, DEFAULT_CATEGORICAL_PALETTE_ID, MAX_FEATURE_CATEGORIES } from "../src/constants";
import { Color } from "three";

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
});
