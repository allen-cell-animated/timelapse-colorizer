import { assert, describe, expect, it } from "vitest";
import { numberToSciNotation } from "../src/colorizer/utils/math_utils";

describe("numberToSciNotation", () => {
  it("Handles zero", () => {
    expect(numberToSciNotation(0, 1)).to.equal("0×10⁰");
  });

  it("Handles negative values", () => {
    expect(numberToSciNotation(-1, 1)).to.equal("-1×10⁰");
    expect(numberToSciNotation(-20000, 2)).to.equal("-2.0×10⁴");
    expect(numberToSciNotation(-0.5, 1)).to.equal("-5×10⁻¹");
  });

  it("Handles rounding", () => {
    expect(numberToSciNotation(0.99, 1)).to.equal("1×10⁰");
    expect(numberToSciNotation(0.99, 2)).to.equal("9.9×10⁻¹");
    expect(numberToSciNotation(0.999, 2)).to.equal("1.0×10⁰");
    expect(numberToSciNotation(14837.94234, 2)).to.equal("1.5×10⁴");
    expect(numberToSciNotation(14357.94234, 2)).to.equal("1.4×10⁴");
    expect(numberToSciNotation(78, 1)).to.equal("8×10¹");
  });

  it("Handle precision", () => {
    throw new Error("Test not implemented");
  });
});
