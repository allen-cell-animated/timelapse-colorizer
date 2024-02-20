import { Color } from "three";
import { describe, expect, it } from "vitest";

import { ColorRamp } from "../src/colorizer";
import {
  getBucketIndex,
  splitTraceData,
  subsampleColorRamp,
  TraceData,
} from "../src/components/Tabs/scatter_plot_data_utils";

describe("subsampleColorRamp", () => {
  it("Returns endpoints of a color ramp", () => {
    const ramp = new ColorRamp(["#ff0000", "#0000ff"]);
    const colors = subsampleColorRamp(ramp, 2);
    expect(colors).to.deep.equal([new Color("#ff0000"), new Color("#0000ff")]);
  });

  it("Returns evenly spaced colors", () => {
    const ramp = new ColorRamp(["#a0a0a0", "#000000"]);
    const expectedColors = [
      new Color("#a0a0a0"),
      new Color("#808080"),
      new Color("#606060"),
      new Color("#404040"),
      new Color("#202020"),
      new Color("#000000"),
    ];
    const colors = subsampleColorRamp(ramp, 6);
    expect(colors).to.deep.equal(expectedColors);
  });
});

describe("getBucketIndex", () => {
  const bucketSorterFactory = (minValue: number, maxValue: number, numBuckets: number) => {
    return (value: number) => getBucketIndex(value, minValue, maxValue, numBuckets);
  };

  it("Sorts values into buckets correctly", () => {
    // Each integer value maps to its same bucket
    const sorter = bucketSorterFactory(0, 9, 10);
    for (let i = 0; i < 10; i++) {
      expect(sorter(i)).to.equal(i);
      // Check that values between integers are also sorted correctly
      expect(sorter(i - 0.1)).to.equal(i);
      expect(sorter(i + 0.1)).to.equal(i);
    }
  });

  it("Clamps values outside of range", () => {
    const sorter = bucketSorterFactory(0, 9, 10);
    expect(sorter(-1)).to.equal(0);
    expect(sorter(-100)).to.equal(0);
    expect(sorter(Number.NEGATIVE_INFINITY)).to.equal(0);
    expect(sorter(10)).to.equal(9);
    expect(sorter(100)).to.equal(9);
    expect(sorter(Number.POSITIVE_INFINITY)).to.equal(9);
  });

  it("Uses evenly-spaced buckets to determine bucket index", () => {
    // See note on getBucketIndex for expected behavior.
    // Buckets at the endpoints of the value range are half-sized.
    let sorter = bucketSorterFactory(0, 1, 2);
    expect(sorter(0.499999)).to.equal(0);
    expect(sorter(0.5)).to.equal(1);

    sorter = bucketSorterFactory(0, 1, 3);
    expect(sorter(0.249999)).to.equal(0);
    expect(sorter(0.25)).to.equal(1);
    expect(sorter(0.749999)).to.equal(1);
    expect(sorter(0.75)).to.equal(2);
    expect(sorter(1)).to.equal(2);

    sorter = bucketSorterFactory(0, 1, 6);
    expect(sorter(0)).to.equal(0);
    expect(sorter(0.099999)).to.equal(0);
    expect(sorter(0.1)).to.equal(1);
    expect(sorter(0.2999)).to.equal(1);
    expect(sorter(0.3)).to.equal(2);
    expect(sorter(0.4999)).to.equal(2);
    expect(sorter(0.5)).to.equal(3);
    expect(sorter(0.6999)).to.equal(3);
    expect(sorter(0.7)).to.equal(4);
    expect(sorter(0.8999)).to.equal(4);
    expect(sorter(0.9)).to.equal(5);
    expect(sorter(1.0)).to.equal(5);
  });

  it("Handles a single bucket", () => {
    const sorter = bucketSorterFactory(0, 0, 1);
    expect(sorter(0)).to.equal(0);
    expect(sorter(-10000)).to.equal(0);
    expect(sorter(10000)).to.equal(0);
  });
});

describe("splitTraceData", () => {
  const makeTraceData = (numPoints: number): TraceData => {
    const traceData: TraceData = {
      x: [],
      y: [],
      objectIds: [],
      trackIds: [],
      color: "#ff00ff",
      marker: {},
    };
    for (let i = 0; i < numPoints; i++) {
      traceData.x.push(i);
      traceData.y.push(i);
      traceData.objectIds.push(i);
      traceData.trackIds.push(i);
    }
    return traceData;
  };

  it("Handles zero data", () => {
    const traceData = makeTraceData(0);
    expect(splitTraceData(traceData, 10)).to.deep.equal([traceData]);
  });

  it("Does not split data at or under maxPoints", () => {
    const traceData1 = makeTraceData(100);
    const traceData2 = makeTraceData(50);
    expect(splitTraceData(traceData1, 100)).to.deep.equal([traceData1]);
    expect(splitTraceData(traceData2, 100)).to.deep.equal([traceData2]);
  });

  it("Can split large trace data into multiple traces", () => {
    const traceData = makeTraceData(1000);
    const traces = splitTraceData(traceData, 100);

    expect(traces.length).to.equal(10);

    for (let i = 0; i < 10; i++) {
      const trace = traces[i];
      for (let j = 0; j < 100; j++) {
        const originalIndex = i * 100 + j;
        expect(trace.x[j]).to.equal(traceData.x[originalIndex]);
        expect(trace.y[j]).to.equal(traceData.y[originalIndex]);
        expect(trace.objectIds[j]).to.equal(traceData.objectIds[originalIndex]);
        expect(trace.trackIds[j]).to.equal(traceData.trackIds[originalIndex]);
      }
    }
  });
});
