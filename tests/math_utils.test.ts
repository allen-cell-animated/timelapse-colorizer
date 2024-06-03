import { describe, expect, it } from "vitest";

import {
  convertCanvasOffsetPxToFrameCoords,
  getFrameSizeInScreenPx,
  numberToSciNotation,
  remap,
} from "../src/colorizer/utils/math_utils";

const DEFAULT_ZOOM = 1;
const DEFAULT_CANVAS_RESOLUTION: [number, number] = [100, 100];
const DEFAULT_FRAME_RESOLUTION: [number, number] = [1, 1];

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
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, DEFAULT_FRAME_RESOLUTION, DEFAULT_ZOOM);
    expect(frameSizePx).to.deep.equal(DEFAULT_CANVAS_RESOLUTION);
  });

  it("does not change returned size if frame resolution is higher", () => {
    const frameResolutions: [number, number][] = [
      [0.1, 0.1],
      [1, 1],
      [10, 10],
      [100, 100],
    ];
    for (const frameResolution of frameResolutions) {
      const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
      expect(frameSizePx).to.deep.equal(DEFAULT_CANVAS_RESOLUTION);
    }
  });

  it("sets frame height to canvas height when frame aspect ratio is taller than canvas", () => {
    const frameResolution: [number, number] = [0.5, 1];
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
    expect(frameSizePx).to.deep.equal([50, 100]);
  });

  it("sets frame width to canvas width when frame aspect ratio is wider than canvas", () => {
    const frameResolution: [number, number] = [1, 0.5];
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
    expect(frameSizePx).to.deep.equal([100, 50]);
  });

  it("scales frame dimensions with zoom", () => {
    const frameZoom = 2;
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, DEFAULT_FRAME_RESOLUTION, frameZoom);
    expect(frameSizePx).to.deep.equal([200, 200]);
  });

  it("scales frame dimensions with zoom while maintaining aspect ratio", () => {
    const frameResolution: [number, number] = [1, 0.5];
    const frameZoom = 2;
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, frameZoom);
    expect(frameSizePx).to.deep.equal([200, 100]);
  });
});

describe("convertCanvasOffsetPxToFrameCoords", () => {
  /**
   * NOTE: The canvas and frame use different coordinate systems;
   * this series of tests validates that the conversion function is working correctly.
   *
   * Canvas dimensions are in pixels, with the upper left corner being [0, 0] and the bottom right corner being
   * `[canvas width, canvas height]`. The center of the canvas is `[canvas width / 2, canvas height / 2]`.
   *
   * Frame coordinates are a relative offset from the center, normalized to a [-0.5, 0.5] range.
   * The center of the frame is [0, 0], the top right corner is [0.5, 0.5].
   *
   * Visually, a 100x100 canvas and normalized frame look like this:
   *
   *   +-canvas--+ y: 0
   *   |         |
   *   |    x    | <= [50, 50]
   *   |         |
   *   +---------+ y: 100
   *  x: 0       x: 100
   *
   *   +-frame---+ y: 0.5
   *   |         |
   *   |    x    |  <= [0, 0]
   *   |         |
   *   +---------+ y: -0.5
   *  x: -0.5   x: 0.5
   *
   */

  const DEFAULT_PAN: [number, number] = [0, 0];
  const DEFAULT_CANVAS_SIZE_PX: [number, number] = [100, 100];
  const DEFAULT_FRAME_SIZE_PX: [number, number] = [100, 100];

  /**
   * Convenience wrapper around `convertCanvasOffsetPxToFrameCoords`. Allows the repeated information
   * (frame size, canvas size, etc.) to be passed in as a single object to reduce boilerplate.
   */
  function getFrameOffset(
    frameInfo: {
      frameSizeScreenPx: [number, number];
      canvasSizePx: [number, number];
      canvasPanPx: [number, number];
    },
    canvasOffsetPx: [number, number]
  ): [number, number] {
    return convertCanvasOffsetPxToFrameCoords(
      frameInfo.canvasSizePx,
      frameInfo.frameSizeScreenPx,
      canvasOffsetPx,
      frameInfo.canvasPanPx
    );
  }

  it("maps canvas corners to frame coordinates on unscaled frames", () => {
    const frameInfo = {
      frameSizeScreenPx: DEFAULT_FRAME_SIZE_PX,
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: DEFAULT_PAN,
    };

    const canvCenter: [number, number] = [50, 50];
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter: [number, number] = [0, 0];
    const expFrameLeft = -0.5;
    const expFrameRight = 0.5;
    const expYBottom = -0.5;
    const expYTop = 0.5;

    expect(getFrameOffset(frameInfo, [0, 0])).to.deep.equal([-0.5, 0.5]);

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, [canvLeft, canvTop])).deep.equals([expFrameLeft, expYTop]);
    expect(getFrameOffset(frameInfo, [canvRight, canvTop])).deep.equals([expFrameRight, expYTop]);
    expect(getFrameOffset(frameInfo, [canvLeft, canvBottom])).deep.equals([expFrameLeft, expYBottom]);
    expect(getFrameOffset(frameInfo, [canvRight, canvBottom])).deep.equals([expFrameRight, expYBottom]);
  });

  it("maps canvas corners to frame coordinates when canvas has different aspect ratio than frame", () => {
    const frameInfo = {
      frameSizeScreenPx: [100, 50] as [number, number],
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: DEFAULT_PAN,
    };

    // The frame is half the canvas height, and will only occupy half the canvas.
    //  The frame is normally normalized to the [-0.5, 0.5] range, so the
    // corners of the canvas would map to [-1.0, 1.0] in the Y-axis.

    // +--canvas--+  // canvasY = 0  | frameY = 1.0
    // +--frame---+  // canvasY = 25 | frameY = 0.5   <= frame corner
    // |    o     |  // canvasY = 50 | frameY = 0     <= frame center
    // +----------+  // canvasY = 75 | frameY = -0.5  <= frame corner
    // +----------+  // canvasY = 100| frameY = -1.0

    const canvCenter: [number, number] = [50, 50];
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter: [number, number] = [0, 0];
    const expFrameLeft = -0.5;
    const expFrameRight = 0.5;
    const expYBottom = -1;
    const expYTop = 1;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, [canvLeft, canvTop])).deep.equals([expFrameLeft, expYTop]);
    expect(getFrameOffset(frameInfo, [canvRight, canvTop])).deep.equals([expFrameRight, expYTop]);
    expect(getFrameOffset(frameInfo, [canvLeft, canvBottom])).deep.equals([expFrameLeft, expYBottom]);
    expect(getFrameOffset(frameInfo, [canvRight, canvBottom])).deep.equals([expFrameRight, expYBottom]);
  });

  it("maps canvas corners to frame relative coordinates when frame is panned", () => {
    const frameInfo = {
      frameSizeScreenPx: DEFAULT_FRAME_SIZE_PX,
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: [-0.5, -0.5] as [number, number],
    };

    // The frame is panned by [-0.5, -0.5], which means the top right corner of the frame will be centered in the canvas.

    // +-----c-----+  < canvasY = 0  | frameY = 1.0
    // |           |
    // +--f--+     |  < canvasY = 50 | frameY = 0.5 <= frame corner
    // |     |     |
    // o-----+-----+  < canvasY = 100| frameY = 0   <= frame center

    const canvCenter: [number, number] = [50, 50];
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter: [number, number] = [0.5, 0.5];
    const expFrameLeft = 0;
    const expFrameRight = 1;
    const expYBottom = 0;
    const expYTop = 1;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, [canvLeft, canvTop])).deep.equals([expFrameLeft, expYTop]);
    expect(getFrameOffset(frameInfo, [canvRight, canvTop])).deep.equals([expFrameRight, expYTop]);
    expect(getFrameOffset(frameInfo, [canvLeft, canvBottom])).deep.equals([expFrameLeft, expYBottom]);
    expect(getFrameOffset(frameInfo, [canvRight, canvBottom])).deep.equals([expFrameRight, expYBottom]);
  });

  it("maps canvas corners to frame relative coordinates when frame is zoomed", () => {
    const frameInfo = {
      frameSizeScreenPx: [200, 200] as [number, number],
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: DEFAULT_PAN,
    };

    // Frame is twice as large as the canvas, so the corners of the canvas will only
    // be half the relative dimensions of the frame. (0.5 / 2 = 0.25)
    //
    // +-----f-----+
    // |  +--c--+  |  // canvasY = 0 | frameY = 0.25     <= frame corner
    // |  |  o  |  |  // canvasY = 50 | frameY = 0       <= frame center
    // |  +-----+  |  // canvasY = 100 | frameY = -0.25  <= frame corner
    // +-----------+

    const canvCenter: [number, number] = [50, 50];
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter: [number, number] = [0, 0];
    const expFrameLeft = -0.25;
    const expFrameRight = 0.25;
    const expYBottom = -0.25;
    const expYTop = 0.25;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, [canvLeft, canvTop])).deep.equals([expFrameLeft, expYTop]);
    expect(getFrameOffset(frameInfo, [canvRight, canvTop])).deep.equals([expFrameRight, expYTop]);
    expect(getFrameOffset(frameInfo, [canvLeft, canvBottom])).deep.equals([expFrameLeft, expYBottom]);
    expect(getFrameOffset(frameInfo, [canvRight, canvBottom])).deep.equals([expFrameRight, expYBottom]);
  });
});
