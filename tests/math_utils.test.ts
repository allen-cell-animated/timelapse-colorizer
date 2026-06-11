import { Vector2 } from "three";
import { describe, expect, it } from "vitest";

import type { Track } from "src/colorizer";
import {
  binAndSumFeatureVectors,
  convertCanvasOffsetPxToFrameCoords,
  convolve1dFilter,
  formatNumber,
  getBinIndex,
  getBinValue,
  getFrameSizeInScreenPx,
  numberToSciNotation,
  remap,
  subsampleFlat3dArray,
} from "src/colorizer/utils/math_utils";

const DEFAULT_ZOOM = 1;
const DEFAULT_CANVAS_RESOLUTION = new Vector2(100, 100);
const DEFAULT_FRAME_RESOLUTION = new Vector2(1, 1);

describe("formatNumber", () => {
  it("handles undefined and null values", () => {
    expect(formatNumber(undefined, 3)).to.equal("NaN");
    expect(formatNumber(null, 3)).to.equal("NaN");
  });

  it("handles integers", () => {
    expect(formatNumber(0, 3)).to.equal("0");
    expect(formatNumber(1, 3)).to.equal("1");
    expect(formatNumber(-1, 3)).to.equal("-1");
    expect(formatNumber(123, 3)).to.equal("123");
  });

  it("truncates/rounds decimals to the specified max decimals", () => {
    expect(formatNumber(10.123456, 3)).to.equal("10.123");
    expect(formatNumber(10.123456, 2)).to.equal("10.12");
    expect(formatNumber(10.123456, 1)).to.equal("10.1");
    expect(formatNumber(10.123456, 0)).to.equal("10");

    expect(formatNumber(-10.123456, 3)).to.equal("-10.123");

    // Applies rounding
    expect(formatNumber(12345.6789, 3)).to.equal("12345.679");
  });

  it("does not use precision for values over 1", () => {
    expect(formatNumber(100.0000001234, 3)).to.equal("100.000");
  });

  it("uses precision for values less than 1", () => {
    const value = 0.0000001234;
    expect(formatNumber(value, 3)).to.equal("1.23e-7");
  });
});

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
    const frameResolutions: Vector2[] = [
      new Vector2(0.1, 0.1),
      new Vector2(1, 1),
      new Vector2(10, 10),
      new Vector2(100, 100),
    ];
    for (const frameResolution of frameResolutions) {
      const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
      expect(frameSizePx).to.deep.equal(DEFAULT_CANVAS_RESOLUTION);
    }
  });

  it("sets frame height to canvas height when frame aspect ratio is taller than canvas", () => {
    const frameResolution = new Vector2(0.5, 1);
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
    expect(frameSizePx).to.deep.equal(new Vector2(50, 100));
  });

  it("sets frame width to canvas width when frame aspect ratio is wider than canvas", () => {
    const frameResolution = new Vector2(1, 0.5);
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, DEFAULT_ZOOM);
    expect(frameSizePx).to.deep.equal(new Vector2(100, 50));
  });

  it("scales frame dimensions with zoom", () => {
    const frameZoom = 2;
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, DEFAULT_FRAME_RESOLUTION, frameZoom);
    expect(frameSizePx).to.deep.equal(new Vector2(200, 200));
  });

  it("scales frame dimensions with zoom while maintaining aspect ratio", () => {
    const frameResolution = new Vector2(1, 0.5);
    const frameZoom = 2;
    const frameSizePx = getFrameSizeInScreenPx(DEFAULT_CANVAS_RESOLUTION, frameResolution, frameZoom);
    expect(frameSizePx).to.deep.equal(new Vector2(200, 100));
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

  const DEFAULT_PAN = new Vector2(0, 0);
  const DEFAULT_CANVAS_SIZE_PX = new Vector2(100, 100);
  const DEFAULT_FRAME_SIZE_PX = new Vector2(100, 100);

  /**
   * Convenience wrapper around `convertCanvasOffsetPxToFrameCoords`. Allows the repeated information
   * (frame size, canvas size, etc.) to be passed in as a single object to reduce boilerplate.
   */
  function getFrameOffset(
    frameInfo: {
      frameSizeScreenPx: Vector2;
      canvasSizePx: Vector2;
      canvasPanPx: Vector2;
    },
    canvasOffsetPx: Vector2
  ): Vector2 {
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

    const canvCenter = new Vector2(50, 50);
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter = new Vector2(0, 0);
    const expFrameLeft = -0.5;
    const expFrameRight = 0.5;
    const expYBottom = -0.5;
    const expYTop = 0.5;

    expect(getFrameOffset(frameInfo, new Vector2(0, 0))).to.deep.equal(new Vector2(-0.5, 0.5));

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvTop))).deep.equals(new Vector2(expFrameLeft, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvTop))).deep.equals(new Vector2(expFrameRight, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvBottom))).deep.equals(
      new Vector2(expFrameLeft, expYBottom)
    );
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvBottom))).deep.equals(
      new Vector2(expFrameRight, expYBottom)
    );
  });

  it("maps canvas corners to frame coordinates when canvas has different aspect ratio than frame", () => {
    const frameInfo = {
      frameSizeScreenPx: new Vector2(100, 50),
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: DEFAULT_PAN,
    };

    // The frame is half the canvas height, and will only occupy half the canvas.
    //  The frame is normally normalized to the [-0.5, 0.5] range, so the
    // corners of the canvas would map to [-1.0, 1.0] in the Y-axis.

    // +--canvas--+  // canvasY = 0  | frameY = 1.0
    // +--frame---+  // canvasY = 25 | frameY = 0.5   <= frame corner
    // |    x     |  // canvasY = 50 | frameY = 0     <= frame center
    // +----------+  // canvasY = 75 | frameY = -0.5  <= frame corner
    // +----------+  // canvasY = 100| frameY = -1.0

    const canvCenter = new Vector2(50, 50);
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter = new Vector2(0, 0);
    const expFrameLeft = -0.5;
    const expFrameRight = 0.5;
    const expYBottom = -1;
    const expYTop = 1;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvTop))).deep.equals(new Vector2(expFrameLeft, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvTop))).deep.equals(new Vector2(expFrameRight, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvBottom))).deep.equals(
      new Vector2(expFrameLeft, expYBottom)
    );
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvBottom))).deep.equals(
      new Vector2(expFrameRight, expYBottom)
    );
  });

  it("maps canvas corners to frame relative coordinates when frame is panned", () => {
    const frameInfo = {
      frameSizeScreenPx: DEFAULT_FRAME_SIZE_PX,
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: new Vector2(-0.5, -0.5),
    };

    // The frame is panned by [-0.5, -0.5], which means the top right corner of the frame will be centered in the canvas.

    // +-----c-----+  < canvasY = 0  | frameY = 1.0
    // |           |
    // +--f--+     |  < canvasY = 50 | frameY = 0.5 <= frame corner
    // |     |     |
    // x-----+-----+  < canvasY = 100| frameY = 0   <= frame center

    const canvCenter = new Vector2(50, 50);
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter = new Vector2(0.5, 0.5);
    const expFrameLeft = 0;
    const expFrameRight = 1;
    const expYBottom = 0;
    const expYTop = 1;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvTop))).deep.equals(new Vector2(expFrameLeft, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvTop))).deep.equals(new Vector2(expFrameRight, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvBottom))).deep.equals(
      new Vector2(expFrameLeft, expYBottom)
    );
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvBottom))).deep.equals(
      new Vector2(expFrameRight, expYBottom)
    );
  });

  it("maps canvas corners to frame relative coordinates when frame is zoomed", () => {
    const frameInfo = {
      frameSizeScreenPx: new Vector2(200, 200) as Vector2,
      canvasSizePx: DEFAULT_CANVAS_SIZE_PX,
      canvasPanPx: DEFAULT_PAN,
    };

    // Frame is twice as large as the canvas, so the corners of the canvas will only
    // be half the relative dimensions of the frame. (0.5 / 2 = 0.25)
    //
    // +-----f-----+
    // |  +--c--+  |  // canvasY = 0   | frameY = 0.25
    // |  |  x  |  |  // canvasY = 50  | frameY = 0      <= frame center
    // |  +-----+  |  // canvasY = 100 | frameY = -0.25
    // +-----------+

    const canvCenter = new Vector2(50, 50);
    const canvLeft = 0;
    const canvRight = 100;
    const canvTop = 0;
    const canvBottom = 100;

    const expFrameCenter = new Vector2(0, 0);
    const expFrameLeft = -0.25;
    const expFrameRight = 0.25;
    const expYBottom = -0.25;
    const expYTop = 0.25;

    // Test centerpoint
    expect(getFrameOffset(frameInfo, canvCenter)).deep.equals(expFrameCenter);
    // Test corners
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvTop))).deep.equals(new Vector2(expFrameLeft, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvTop))).deep.equals(new Vector2(expFrameRight, expYTop));
    expect(getFrameOffset(frameInfo, new Vector2(canvLeft, canvBottom))).deep.equals(
      new Vector2(expFrameLeft, expYBottom)
    );
    expect(getFrameOffset(frameInfo, new Vector2(canvRight, canvBottom))).deep.equals(
      new Vector2(expFrameRight, expYBottom)
    );
  });
});

describe("getBinIndex", () => {
  it("handles single bins", () => {
    const range: [number, number] = [0, 5];
    const steps = 1;
    expect(getBinIndex(-1, range, steps)).to.equal(0);
    expect(getBinIndex(0, range, steps)).to.equal(0);
    expect(getBinIndex(1, range, steps)).to.equal(0);
    expect(getBinIndex(2, range, steps)).to.equal(0);
  });

  it("bins values correctly", () => {
    const range: [number, number] = [0, 5];
    const steps = 5;

    expect(getBinIndex(0, range, steps)).to.equal(0);
    expect(getBinIndex(0.99, range, steps)).to.equal(0);
    expect(getBinIndex(1, range, steps)).to.equal(1);
    expect(getBinIndex(1.99, range, steps)).to.equal(1);
    expect(getBinIndex(2, range, steps)).to.equal(2);
    expect(getBinIndex(2.99, range, steps)).to.equal(2);
    expect(getBinIndex(3, range, steps)).to.equal(3);
    expect(getBinIndex(3.99, range, steps)).to.equal(3);
    expect(getBinIndex(4, range, steps)).to.equal(4);
    expect(getBinIndex(4.99, range, steps)).to.equal(4);
    expect(getBinIndex(5, range, steps)).to.equal(4);
  });

  it("handles values outside of range", () => {
    const range: [number, number] = [0, 5];
    const steps = 5;

    expect(getBinIndex(-100, range, steps)).to.equal(0);
    expect(getBinIndex(-10, range, steps)).to.equal(0);
    expect(getBinIndex(-1, range, steps)).to.equal(0);
    expect(getBinIndex(5, range, steps)).to.equal(4);
    expect(getBinIndex(10, range, steps)).to.equal(4);
    expect(getBinIndex(100, range, steps)).to.equal(4);
  });
});

describe("getBinValue", () => {
  it("calculates bin values in the center of each bin", () => {
    const range: [number, number] = [0, 5];
    const steps = 5;
    expect(getBinValue(0, range, steps)).to.equal(0.5);
    expect(getBinValue(1, range, steps)).to.equal(1.5);
    expect(getBinValue(2, range, steps)).to.equal(2.5);
    expect(getBinValue(3, range, steps)).to.equal(3.5);
    expect(getBinValue(4, range, steps)).to.equal(4.5);
  });
});

describe("binAndSumFeatureVectors", () => {
  it("sizes arrays by equal bin counts", () => {
    const binsPerAxis: [number, number, number] = [2, 2, 2];
    const xRange = [0, 2] as [number, number];
    const yRange = [0, 2] as [number, number];
    const zRange = [0, 2] as [number, number];
    const vectorFieldData = binAndSumFeatureVectors(
      [],
      new Float32Array(),
      new Float32Array(),
      new Float32Array(),
      xRange,
      yRange,
      zRange,
      binsPerAxis
    );
    expect(vectorFieldData.xPos.length).to.equal(8);
    expect(vectorFieldData.yPos.length).to.equal(8);
    expect(vectorFieldData.zPos.length).to.equal(8);
    expect(vectorFieldData.xSum.length).to.equal(8);
    expect(vectorFieldData.ySum.length).to.equal(8);
    expect(vectorFieldData.zSum.length).to.equal(8);
    expect(vectorFieldData.count.length).to.equal(8);

    expect(vectorFieldData.xPos).toEqual(new Float32Array([0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5]));
    expect(vectorFieldData.yPos).toEqual(new Float32Array([0.5, 0.5, 1.5, 1.5, 0.5, 0.5, 1.5, 1.5]));
    expect(vectorFieldData.zPos).toEqual(new Float32Array([0.5, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5]));
  });

  it("sizes arrays by uneven bin counts", () => {
    const binsPerAxis: [number, number, number] = [1, 2, 3];
    const xRange = [0, 1] as [number, number];
    const yRange = [0, 2] as [number, number];
    const zRange = [0, 3] as [number, number];
    const vectorFieldData = binAndSumFeatureVectors(
      [],
      new Float32Array(),
      new Float32Array(),
      new Float32Array(),
      xRange,
      yRange,
      zRange,
      binsPerAxis
    );
    expect(vectorFieldData.xPos.length).to.equal(6);
    expect(vectorFieldData.yPos.length).to.equal(6);
    expect(vectorFieldData.zPos.length).to.equal(6);
    expect(vectorFieldData.xSum.length).to.equal(6);
    expect(vectorFieldData.ySum.length).to.equal(6);
    expect(vectorFieldData.zSum.length).to.equal(6);
    expect(vectorFieldData.count.length).to.equal(6);

    expect(vectorFieldData.xPos).toEqual(new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
    expect(vectorFieldData.yPos).toEqual(new Float32Array([0.5, 1.5, 0.5, 1.5, 0.5, 1.5]));
    expect(vectorFieldData.zPos).toEqual(new Float32Array([0.5, 0.5, 1.5, 1.5, 2.5, 2.5]));
  });

  describe("example vector flow field calculations", () => {
    const binsPerAxis: [number, number, number] = [2, 2, 2];
    const xRange = [0, 2] as [number, number];
    const yRange = [0, 2] as [number, number];
    const zRange = [0, 2] as [number, number];

    const tracks = [
      {
        ids: new Uint32Array([0, 1, 2]),
        times: new Uint32Array([0, 1, 2]),
      },
      {
        ids: new Uint32Array([0, 1, 2]),
        times: new Uint32Array([0, 1, 2]),
      },
      {
        ids: new Uint32Array([3, 4, 5]),
        times: new Uint32Array([0, 1, 2]),
      },
    ] as unknown[] as Track[];
    const xFeatureData = new Float32Array([0, 1, 2, 0, 1, 2]);
    const yFeatureData = new Float32Array([0, 0, 0, 1, 1, 1]);
    const zFeatureData = new Float32Array([0, 1, 1, 0, 1, 1]);
    const inRange = new Uint8Array([1, 1, 1, 1, 1, 1]);
    const outliers = new Uint8Array([0, 0, 0, 0, 0, 0]);

    it("calculates vector flow fields", () => {
      const vectorFieldData = binAndSumFeatureVectors(
        tracks,
        xFeatureData,
        yFeatureData,
        zFeatureData,
        xRange,
        yRange,
        zRange,
        binsPerAxis,
        inRange,
        outliers
      );
      expect(vectorFieldData.xPos).toEqual(new Float32Array([0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5]));
      expect(vectorFieldData.yPos).toEqual(new Float32Array([0.5, 0.5, 1.5, 1.5, 0.5, 0.5, 1.5, 1.5]));
      expect(vectorFieldData.zPos).toEqual(new Float32Array([0.5, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5]));
      expect(vectorFieldData.xSum).toEqual(new Float32Array([2, 0, 1, 0, 0, 2, 0, 1]));
      expect(vectorFieldData.ySum).toEqual(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.zSum).toEqual(new Float32Array([2, 0, 1, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.count).toEqual(new Uint32Array([2, 0, 1, 0, 0, 2, 0, 1]));
    });

    it("excludes outliers", () => {
      const customOutliers = new Uint8Array([0, 1, 1, 0, 0, 1]);
      const vectorFieldData = binAndSumFeatureVectors(
        tracks,
        xFeatureData,
        yFeatureData,
        zFeatureData,
        xRange,
        yRange,
        zRange,
        binsPerAxis,
        inRange,
        customOutliers
      );
      expect(vectorFieldData.xPos).toEqual(new Float32Array([0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5]));
      expect(vectorFieldData.yPos).toEqual(new Float32Array([0.5, 0.5, 1.5, 1.5, 0.5, 0.5, 1.5, 1.5]));
      expect(vectorFieldData.zPos).toEqual(new Float32Array([0.5, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5]));
      expect(vectorFieldData.xSum).toEqual(new Float32Array([0, 0, 1, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.ySum).toEqual(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.zSum).toEqual(new Float32Array([0, 0, 1, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.count).toEqual(new Uint32Array([0, 0, 1, 0, 0, 0, 0, 0]));
    });

    it("excludes filtered values", () => {
      const customInRangeLut = new Uint8Array([0, 0, 0, 0, 1, 1]);
      const vectorFieldData = binAndSumFeatureVectors(
        tracks,
        xFeatureData,
        yFeatureData,
        zFeatureData,
        xRange,
        yRange,
        zRange,
        binsPerAxis,
        customInRangeLut,
        outliers
      );
      expect(vectorFieldData.xPos).toEqual(new Float32Array([0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5]));
      expect(vectorFieldData.yPos).toEqual(new Float32Array([0.5, 0.5, 1.5, 1.5, 0.5, 0.5, 1.5, 1.5]));
      expect(vectorFieldData.zPos).toEqual(new Float32Array([0.5, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5]));
      expect(vectorFieldData.xSum).toEqual(new Float32Array([0, 0, 0, 0, 0, 0, 0, 1]));
      expect(vectorFieldData.ySum).toEqual(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.zSum).toEqual(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]));
      expect(vectorFieldData.count).toEqual(new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1]));
    });
  });
});

describe("convolutions", () => {
  describe("convolve1dFilter", () => {
    it("returns copy of array when given empty kernel", () => {
      const kernel: number[] = [];
      const data = new Float32Array([1, 2, 3, 4, 5]);
      const dims = [5, 1, 1];

      const result = convolve1dFilter(data, dims as [number, number, number], kernel, "x");
      expect(result).toEqual(data);
      // Should be a new object reference
      expect(result).not.toBe(data);
    });

    it("returns an empty array when given an empty array", () => {
      const kernel: number[] = [1, 1, 1];
      const data = new Float32Array([]);
      const dims: [number, number, number] = [0, 1, 1];
      const result = convolve1dFilter(data, dims, kernel, "x");
      expect(result).toEqual(data);
    });

    it("handles identity kernel", () => {
      const kernel = [0, 1, 0];
      const data = new Float32Array([1, 2, 3, 4, 5]);
      const dims: [number, number, number] = [5, 1, 1];

      let result = convolve1dFilter(data, dims, kernel, "x");
      expect(result).toEqual(data);
      result = convolve1dFilter(data, dims, kernel, "y");
      expect(result).toEqual(data);
      result = convolve1dFilter(data, dims, kernel, "z");
      expect(result).toEqual(data);
    });

    it("handles even-length kernel", () => {
      const kernel = [0.5, 0.5];
      const data = new Float32Array([10, 20, 30, 40, 50]);
      const dims: [number, number, number] = [5, 1, 1];

      const result = convolve1dFilter(data, dims, kernel, "x");
      expect(result).toEqual(new Float32Array([5, 15, 25, 35, 45]));
    });

    it("pads with 0s", () => {
      const kernel = [1, 1, 1];
      const data = new Float32Array([10, 20, 30, 40, 50]);
      const dims = [5, 1, 1];

      const result = convolve1dFilter(data, dims as [number, number, number], kernel, "x");
      expect(result).toEqual(new Float32Array([30, 60, 90, 120, 90]));
    });

    it("convolves over multiple dimensions", () => {
      const kernel = [1, 1, 1];
      const data = new Float32Array([
        // y = 0
        1, 2, 3,
        // y = 1
        4, 5, 6,
        // y = 2
        7, 8, 9,
      ]);
      const dims = [3, 3, 1];

      const result = convolve1dFilter(data, dims as [number, number, number], kernel, "x");
      expect(result).toEqual(
        new Float32Array([
          // y = 0
          3, 6, 5,
          // y = 1
          9, 15, 11,
          // y = 2
          15, 24, 17,
        ])
      );
    });
  });
});

describe("subsampleFlat3dArray", () => {
  const DATA_3X3X3 = [
    // z = 0
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    // z = 1
    10, 11, 12, 13, 14, 15, 16, 17, 18,
    // z = 2
    19, 20, 21, 22, 23, 24, 25, 26, 27,
  ];

  it("handles empty array", () => {
    const result = subsampleFlat3dArray(new Float32Array(), [0, 0, 0], 1);
    expect(result).toEqual(new Float32Array());
  });

  it("returns array when subsampling = 1", () => {
    const data = [1, 2, 3, 4, 5];
    const result = subsampleFlat3dArray(new Float32Array(data), [5, 1, 1], 1);
    expect(result).toEqual(new Float32Array(data));
  });

  it("subsamples 1D array", () => {
    const data = [1, 2, 3, 4, 5];
    const result = subsampleFlat3dArray(new Float32Array(data), [5, 1, 1], 2);
    expect(result).toEqual(new Float32Array([1, 3, 5]));
  });

  it("subsamples 3D array", () => {
    const data = DATA_3X3X3;
    const result = subsampleFlat3dArray(new Float32Array(data), [3, 3, 3], 2);
    expect(result).toEqual(new Float32Array([1, 3, 7, 9, 19, 21, 25, 27]));
  });

  it("returns one value when subsampling is >= array dims", () => {
    const data = DATA_3X3X3;
    const result = subsampleFlat3dArray(new Float32Array(data), [3, 3, 3], 3);
    expect(result).toEqual(new Float32Array([1]));
  });
});
