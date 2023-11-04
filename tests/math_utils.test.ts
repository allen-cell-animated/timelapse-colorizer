import { describe, expect, it } from "vitest";
import { numberToSciNotation } from "../src/colorizer/utils/math_utils";

describe("numberToSciNotation", () => {
  it("Handles zero", () => {
    expect(numberToSciNotation(0, 1)).to.equal("0×10⁰");
  });

  it("Handles negative values", () => {
    expect(numberToSciNotation(-1, 1)).to.equal("-1×10⁰");
    expect(numberToSciNotation(-20_000, 2)).to.equal("-2.0×10⁴");
    expect(numberToSciNotation(-0.5, 1)).to.equal("-5×10⁻¹");
  });

  it("Handles rounding", () => {
    expect(numberToSciNotation(0.99, 1)).to.equal("1×10⁰");
    expect(numberToSciNotation(0.99, 2)).to.equal("9.9×10⁻¹");
    expect(numberToSciNotation(0.999, 2)).to.equal("1.0×10⁰");

    expect(numberToSciNotation(74, 1)).to.equal("7×10¹");
    expect(numberToSciNotation(78, 1)).to.equal("8×10¹");
  });

  it("Handle significant figures input", () => {
    expect(numberToSciNotation(-12.34, 1)).to.equal("-1×10¹");
    expect(numberToSciNotation(-12.34, 2)).to.equal("-1.2×10¹");
    expect(numberToSciNotation(-12.34, 3)).to.equal("-1.23×10¹");
    expect(numberToSciNotation(-12.34, 4)).to.equal("-1.234×10¹");
    expect(numberToSciNotation(-12.34, 5)).to.equal("-1.2340×10¹");
    expect(numberToSciNotation(-12.34, 6)).to.equal("-1.23400×10¹");
  });

  it("Handles bad significant figures input", () => {
    expect(numberToSciNotation(123.4, 0)).to.equal("1×10²");
    expect(numberToSciNotation(123.4, -5)).to.equal("1×10²");
  });

  it("Matches the documentation example", () => {
    expect(numberToSciNotation(1, 3)).to.equal("1.00×10⁰");
    expect(numberToSciNotation(0.99, 2)).to.equal("9.9×10⁻¹");
    expect(numberToSciNotation(0.999, 2)).to.equal("1.0×10⁰");
    expect(numberToSciNotation(-0.05, 1)).to.equal("-5×10⁻²");
    expect(numberToSciNotation(1400, 3)).to.equal("1.40×10³");
  });
});
