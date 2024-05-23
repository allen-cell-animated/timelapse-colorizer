import { describe, expect, it } from "vitest";

import {
  convertCanvasOffsetPxToFrameCoords,
  getFrameSizeInScreenPx,
  numberToSciNotation,
  remap,
} from "../src/colorizer/utils/math_utils";

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

describe("remap", () => {
  it("Remaps values from one range to another", () => {
    expect(remap(5, 0, 10, 0, 1)).to.equal(0.5);
    expect(remap(0.5, 0, 1, 0, 10)).to.equal(5);
  });

  it("Handles flipped input/output ranges", () => {
    expect(remap(7, 0, 10, 10, 0)).to.equal(3);
    expect(remap(3, 10, 0, 0, 10)).to.equal(7);

    expect(remap(-15, -30, 0, 0, 30)).to.equal(15);
    expect(remap(15, 0, 30, -30, 0)).to.equal(-15);
  });

  it("Does nothing if the input and output ranges are the same", () => {
    expect(remap(0, 0, 1, 0, 1)).to.equal(0);
    expect(remap(0.125, -5, 5, -5, 5)).to.equal(0.125);
  });

  it("Handles input bounds with a range of zero", () => {
    expect(remap(0, 0.5, 0.5, 0, 1)).to.equal(0);
    expect(remap(0.5, 0.5, 0.5, 0, 1)).to.equal(0);
    expect(remap(1, 0.5, 0.5, 0, 1)).to.equal(0);
  });

  it("Handles output bounds with a range of zero", () => {
    expect(remap(0, 0, 1, 10, 10)).to.equal(10);
    expect(remap(-1, 0, 1, 10, 10)).to.equal(10);
  });

  it("Enforces range clamping", () => {
    expect(remap(-1000, 0, 1, -1, 1)).to.equal(-1);
    expect(remap(1000, 0, 1, -1, 1)).to.equal(1);
  });

  it("Handles values outside of input min/max when clamping is disabled", () => {
    expect(remap(-1, 0, 1, 0, 10, false)).to.equal(-10);
    expect(remap(2, 0, 1, 0, 10, false)).to.equal(20);
  });
});

describe("getFrameSizeInScreenPx", () => {
  it("returns canvas size when frame is the same aspect ratio", () => {
    const frameSizePx = getFrameSizeInScreenPx([100, 100], [1, 1], 1);
    expect(frameSizePx).to.deep.equal([100, 100]);
  });

  it("does not change returned size if frame resolution is higher", () => {
    const frameResolutions: [number, number][] = [
      [0.1, 0.1],
      [1, 1],
      [10, 10],
      [100, 100],
    ];
    for (const frameResolution of frameResolutions) {
      const frameSizePx = getFrameSizeInScreenPx([100, 100], frameResolution, 1);
      expect(frameSizePx).to.deep.equal([100, 100]);
    }
  });

  it("constrains by height when frame aspect ratio is taller than canvas", () => {
    const canvasSizePx: [number, number] = [100, 100];
    const frameResolution: [number, number] = [0.5, 1];
    const frameZoom = 1;
    const frameSizePx = getFrameSizeInScreenPx(canvasSizePx, frameResolution, frameZoom);
    expect(frameSizePx).to.deep.equal([50, 100]);
  });

  it("constrains by width when frame aspect ratio is wider than canvas", () => {
    const canvasSizePx: [number, number] = [100, 100];
    const frameResolution: [number, number] = [1, 0.5];
    const frameZoom = 1;
    const frameSizePx = getFrameSizeInScreenPx(canvasSizePx, frameResolution, frameZoom);
    expect(frameSizePx).to.deep.equal([100, 50]);
  });

  it("scales frame dimensions with zoom", () => {
    const canvasSizePx: [number, number] = [100, 100];
    const frameResolution: [number, number] = [1, 0.5];
    const frameZoom = 2;
    const frameSizePx = getFrameSizeInScreenPx(canvasSizePx, frameResolution, frameZoom);
    expect(frameSizePx).to.deep.equal([200, 100]);
  });
});

describe("convertCanvasOffsetPxToFrameCoords", () => {
  const makeConversionTester = (props: {
    frameSizeScreenPx: [number, number];
    canvasSizePx: [number, number];
    canvasPanPx: [number, number];
  }) => {
    return (canvasOffsetPx: [number, number], expected: [number, number]) => {
      const frameCoords = convertCanvasOffsetPxToFrameCoords(
        props.canvasSizePx,
        props.frameSizeScreenPx,
        canvasOffsetPx,
        props.canvasPanPx
      );
      expect(frameCoords[0]).equals(expected[0]);
      expect(frameCoords[1]).equals(expected[1]);
    };
  };

  it("maps corners correctly on unscaled frames", () => {
    const checkCanvasOffsetMatches = makeConversionTester({
      frameSizeScreenPx: [100, 100],
      canvasSizePx: [100, 100],
      canvasPanPx: [0, 0],
    });

    // Test centerpoint
    checkCanvasOffsetMatches([50, 50], [0, 0]);
    // Test corners
    checkCanvasOffsetMatches([0, 0], [-0.5, 0.5]);
    checkCanvasOffsetMatches([100, 0], [0.5, 0.5]);
    checkCanvasOffsetMatches([0, 100], [-0.5, -0.5]);
    checkCanvasOffsetMatches([100, 100], [0.5, -0.5]);
  });

  it("maps corners when canvas has different aspect ratio than frame", () => {
    const checkCanvasOffsetMatches = makeConversionTester({
      frameSizeScreenPx: [100, 50],
      canvasSizePx: [100, 100],
      canvasPanPx: [0, 0],
    });

    checkCanvasOffsetMatches([50, 50], [0, 0]);

    checkCanvasOffsetMatches([0, 0], [-0.5, 1]);
    checkCanvasOffsetMatches([100, 0], [0.5, 1]);
    checkCanvasOffsetMatches([0, 100], [-0.5, -1]);
    checkCanvasOffsetMatches([100, 100], [0.5, -1]);
  });

  it("maps corners correctly when frame is panned", () => {
    const checkCanvasOffsetMatches = makeConversionTester({
      frameSizeScreenPx: [100, 100],
      canvasSizePx: [100, 100],
      canvasPanPx: [-0.5, -0.5],
    });

    checkCanvasOffsetMatches([50, 50], [0.5, 0.5]);

    checkCanvasOffsetMatches([0, 0], [0, 1]);
    checkCanvasOffsetMatches([100, 0], [1, 1]);
    checkCanvasOffsetMatches([0, 100], [0, 0]);
    checkCanvasOffsetMatches([100, 100], [1, 0]);
  });

  it("maps corners correctly when frame is zoomed", () => {
    const checkCanvasOffsetMatches = makeConversionTester({
      frameSizeScreenPx: [200, 200],
      canvasSizePx: [100, 100],
      canvasPanPx: [0, 0],
    });

    checkCanvasOffsetMatches([50, 50], [0, 0]);

    // Test corners
    checkCanvasOffsetMatches([0, 0], [-0.25, 0.25]);
    checkCanvasOffsetMatches([100, 0], [0.25, 0.25]);
    checkCanvasOffsetMatches([0, 100], [-0.25, -0.25]);
    checkCanvasOffsetMatches([100, 100], [0.25, -0.25]);
  });
});
