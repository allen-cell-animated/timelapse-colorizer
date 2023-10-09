export type RecordingOptions = {
  /** Frame to start recording from, inclusive. 0 by default. */
  min: number;
  /** Highest frame number to record, inclusive. 0 by default. */
  max: number;
  /** Minimum digits for exported file numbers. If a frame number's string length
   * is smaller than this, pads the filename with 0 to reach the minimum.
   *
   * If no `minDigits` is provided, uses the number of digits in max.
   *
   * ex: if `minDigits=3`, then frame 12 will be saved as `012`.
   */
  minDigits?: number;
  /** Number of frames to increment by after each saved frame.
   * 1 (default) means no frames will be skipped.
   *
   * If `frameIncrement=2`, increments the recorded frame number by 2 each time
   * (e.g. 0, 2, 4, ...)
   */
  frameIncrement: number;
  /** String file prefix added to recorded frames or videos.
   * Filenames will be formatted as `{prefix}{frame #}.{ext}` for images,
   * and `{prefix}.{ext}` for videos. */
  prefix: string;
  /** Delay between each recorded frame, in milliseconds. 100 ms by default. */
  delayMs: number;
  /** Frames per second for video output. Default is 30 fps.*/
  fps: number;
  /** Average video bitrate in bits/second. */
  bitrate: number;
  /** Width, height of output video or image. */
  outputSize: [number, number];
  /** Called when the recording has completed successfully. (Will not be called if the recording
   * operation is cancelled.) */
  onCompleted: () => Promise<void>;
  /** Called when each frame has completed */
  onRecordedFrame: (frame: number) => void;
  /** Called when the recording process encounters an error. If recording, will attempt to continue
   * without stopping the recording process. If this is not desired, call `abort()` in the callback.
   */
  onError: (error: Error) => void;
};

export const defaultRecordingOptions: RecordingOptions = {
  min: 0,
  max: 0,
  frameIncrement: 1,
  prefix: "image-",
  delayMs: 100,
  fps: 30,
  bitrate: 10e6,
  outputSize: [730, 500],
  onCompleted: async function (): Promise<void> {},
  onRecordedFrame: function (_frame: number): void {},
  onError: function (_error: Error): void {},
};

// TODO: Add support for OffscreenCanvas?
// Video frames may get dropped if the user navigates away from the tab.
// See https://evilmartians.com/chronicles/faster-webgl-three-js-3d-graphics-with-offscreencanvas-and-web-workers
// and https://threejs.org/examples/webgl_worker_offscreencanvas.html for examples.
// Also https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas.

/**
 * Abstract class for recording images or videos from a HTMLCanvas.
 * Provides lifecycle methods for recording each frame, recording completion,
 * and cleanup.
 */
export default class CanvasRecorder {
  private recording: boolean;
  private finishedRecording: boolean;
  private timerId: number;

  protected setFrameAndRender: (frame: number) => Promise<void>;
  protected getCanvas: () => HTMLCanvasElement;
  protected options: RecordingOptions;

  /**
   * @param setFrameAndRender Async callback to set and update the currently displayed frame.
   * @param getCanvas A callback to fetch the current canvas.
   * @param options Configurable options for the recording.
   */
  constructor(
    setFrameAndRender: (frame: number) => Promise<void>,
    getCanvas: () => HTMLCanvasElement,
    options?: Partial<RecordingOptions>
  ) {
    if (new.target === CanvasRecorder) {
      throw new TypeError("Recorder is an abstract class. Do not construct instances of it directly!");
    }

    this.recording = false;
    this.finishedRecording = false;
    this.timerId = 0;

    this.setFrameAndRender = setFrameAndRender;
    this.getCanvas = getCanvas;

    this.options = { ...defaultRecordingOptions, ...options };
  }

  /**
   * Starts the recording process.
   *
   * Note that the recording will change the current frame and will not reset it once
   * recording completes. Any cleanup should be done using the `onCompleted` callback parameter
   * in the `recordingOptions` object or wherever `abort()` is called.
   */
  public async start(): Promise<void> {
    if (this.recording || this.finishedRecording) {
      return;
    }
    this.recording = true;

    await this.setup();
    this.startRecordingLoop();
  }

  private startRecordingLoop(): void {
    // Reset any existing timers
    clearTimeout(this.timerId);

    const loadAndRecordFrame = async (frame: number): Promise<void> => {
      if (!this.recording) {
        return;
      }
      if (frame > this.options.max) {
        this.recording = false;
        await this.options.onCompleted();
        return;
      }

      try {
        await this.recordFrame(frame);
      } catch (e) {
        // Report errors but don't stop the recording.
        if (e instanceof Error) {
          this.options.onError(e);
        } else if (e instanceof Event) {
          // May throw Event type if the error is from an event listener.
          // This happens most often when a resource fails to load
          // (e.g., network issues or user not on VPN)
          // TODO: Update error message if this tool becomes public!
          if ((e as ErrorEvent).error instanceof Error) {
            this.options.onError((e as ErrorEvent).error);
          } else {
            this.options.onError(
              new Error(
                "Encountered an unknown error while exporting. See the console for more details. For Institute users, please check VPN status."
              )
            );
          }
        }
      }

      if (!this.recording) {
        return;
      }

      // Notify listeners about frame recording
      this.options.onRecordedFrame(frame);

      const nextFrame = frame + this.options.frameIncrement;
      if (nextFrame > this.options.max) {
        // Stop recording
        this.finishedRecording = true;
        this.recording = false;
        await this.onCompletedRecording();
        this.cleanup();
        this.options.onCompleted();
        return;
      }
      this.timerId = window.setTimeout(() => loadAndRecordFrame(nextFrame), this.options.delayMs);
    };

    // Start interval loop
    loadAndRecordFrame(this.options.min);
  }

  /**
   * Setup step for any async processes. Runs before the recording loop is started
   * (before the first call to `recordFrame`).
   */
  protected async setup(): Promise<void> {}

  /**
   * Called on each frame that will be recorded, but before the
   * optional `onRecordFrame` callback. Any work needed
   * to set up the canvas (e.g., calling `setFrameAndRender()`) should be done here.
   */
  protected async recordFrame(_frame: number): Promise<void> {}

  /**
   * Called once all frames have been recorded, but before the
   * optional `onCompleted` callback.
   */
  protected async onCompletedRecording(): Promise<void> {}

  /**
   * Called after the recording has completed, when abort is called, or when an error is encountered.
   */
  protected cleanup(): void {
    clearTimeout(this.timerId);
    this.recording = false;
  }

  /**
   * Stops the recording; for image sequences, no more images will be downloaded,
   * and in-progress videos will be discarded.
   */
  public abort(): void {
    this.recording = false;
    this.finishedRecording = true;
    this.cleanup();
  }

  public isRecording(): boolean {
    return this.recording;
  }

  public isFinishedRecording(): boolean {
    return this.finishedRecording;
  }

  /**
   * Whether this recorder is supported by the current client.
   */
  public isSupported(): boolean {
    return true;
  }

  /**
   * Download a resource using a fake anchor element.
   * @param filename
   * @param url
   */
  protected download(filename: string, url: string): void {
    // TODO: Add flag for showing save file picker? https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    document.body.removeChild(anchor);
  }
}
