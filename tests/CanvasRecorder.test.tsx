import { describe, expect, it, Mock, vi } from "vitest";

import { sleep } from "./test_utils";

import CanvasRecorder, { RecordingOptions } from "../src/colorizer/recorders/CanvasRecorder";

type MockOrReal = Mock<any, any> | (() => Promise<void>);
type MockOrRealRecording = Mock<any, any> | ((frame: number) => Promise<void>);

// Extend CanvasRecorder to make it testable
class TestCanvasRecorder extends CanvasRecorder {
  public onSetup;
  public onCompleted;
  public onRecordFrame;
  constructor(
    setFrameAndRender: (frame: number) => Promise<void>,
    getCanvas: () => HTMLCanvasElement,
    options?: Partial<RecordingOptions>,
    lifecycle?: Partial<{ onSetup: MockOrReal; onCompleted: MockOrReal; onRecordFrame: MockOrRealRecording }>
  ) {
    super(setFrameAndRender, getCanvas, options);
    this.onSetup = lifecycle?.onSetup || vi.fn();
    this.onCompleted = lifecycle?.onCompleted || vi.fn();
    this.onRecordFrame = lifecycle?.onRecordFrame || vi.fn();
  }

  public async setup(): Promise<void> {
    this.onSetup();
  }
  public async onCompletedRecording(): Promise<void> {
    this.onCompleted();
  }
  public async recordFrame(frame: number): Promise<void> {
    this.onRecordFrame(frame);
  }
}

describe("CanvasRecorder", () => {
  it("Runs once for single frames", async () => {
    const options: Partial<RecordingOptions> = {
      min: 9,
      max: 9,
      delayMs: 0,
    };
    const lifecycle = { onRecordFrame: vi.fn() };
    const recorder = new TestCanvasRecorder(vi.fn(), vi.fn(), options, lifecycle);
    await recorder.start();
    await sleep(10);

    // Check that the expected lifecycle functions ran once
    expect(lifecycle.onRecordFrame.mock.calls.length).to.equal(1);
    expect(lifecycle.onRecordFrame.mock.calls[0][0]).to.equal(9);
  });

  it("Records inclusive bounds", async () => {
    const options: Partial<RecordingOptions> = {
      min: 9,
      max: 12,
      delayMs: 0,
    };
    const lifecycle = { onRecordFrame: vi.fn() };
    const recorder = new TestCanvasRecorder(vi.fn(), vi.fn(), options, lifecycle);
    await recorder.start();
    while (recorder.isRecording()) {
      await sleep(10);
    }

    // Check that the expected lifecycle functions ran once
    expect(lifecycle.onRecordFrame.mock.calls.length).to.equal(4);
    expect(lifecycle.onRecordFrame.mock.calls[0][0]).to.equal(9);
    expect(lifecycle.onRecordFrame.mock.calls[1][0]).to.equal(10);
    expect(lifecycle.onRecordFrame.mock.calls[2][0]).to.equal(11);
    expect(lifecycle.onRecordFrame.mock.calls[3][0]).to.equal(12);
  });

  it("Reports errors", async () => {
    const onError = vi.fn();
    const options: Partial<RecordingOptions> = {
      min: 0,
      max: 2,
      onError,
    };
    const lifecycle = {
      onRecordFrame: () => {
        throw new Error("Some error");
      },
    };
    const recorder = new TestCanvasRecorder(vi.fn(), vi.fn(), options, lifecycle);
    await recorder.start();
    while (recorder.isRecording()) {
      await sleep(10);
    }
    expect(onError.mock.calls.length).to.equal(3);
  });

  it("Does frame skipping", async () => {
    const options: Partial<RecordingOptions> = {
      min: 0,
      max: 10,
      frameIncrement: 3,
      delayMs: 0,
    };
    const lifecycle = { onRecordFrame: vi.fn() };
    const recorder = new TestCanvasRecorder(vi.fn(), vi.fn(), options, lifecycle);
    await recorder.start();
    while (recorder.isRecording()) {
      await sleep(10);
    }
    // Check that the expected lifecycle functions ran once
    expect(lifecycle.onRecordFrame.mock.calls.length).to.equal(4);
    expect(lifecycle.onRecordFrame.mock.calls[0][0]).to.equal(0);
    expect(lifecycle.onRecordFrame.mock.calls[1][0]).to.equal(3);
    expect(lifecycle.onRecordFrame.mock.calls[2][0]).to.equal(6);
    expect(lifecycle.onRecordFrame.mock.calls[3][0]).to.equal(9);
  });
});
