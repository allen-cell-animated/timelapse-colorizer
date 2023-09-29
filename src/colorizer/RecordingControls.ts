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
  /** String file prefix added to recorded frames.
   * Filenames will be formatted as `{prefix}{frame #}.png` */
  prefix: string;
  /** Delay between each recorded frame, in milliseconds. 100 ms by default. */
  delayMs: number;
  /** Called when the recording has completed successfully. (Will not be called if the recording
   * operation is cancelled.) */
  onCompletedCallback: () => Promise<void>;
  /** Called when each frame has completed */
  onRecordedFrameCallback: (frame: number) => void;
};

const defaultRecordingOptions: RecordingOptions = {
  min: 0,
  max: 0,
  frameIncrement: 1,
  prefix: "image-",
  delayMs: 100,
  onCompletedCallback: async function (): Promise<void> {},
  onRecordedFrameCallback: function (_frame: number): void {},
};

export default class RecordingControls {
  private recording: boolean;
  private timerId: number;

  constructor() {
    this.recording = false;
    this.timerId = 0;
  }

  /**
   * Records and downloads an image sequence, if not already recording.
   *
   * @param setFrameAndRender Async callback to set and update the currently displayed frame.
   * @param recordingAction Async callback for the recording action. The recording will wait until
   * the callback resolves before continuing. The `recordingOptions` will be passed to the action,
   * with default values given for any undefined options.
   * @param recordingOptions Configurable options for the recording.
   *
   * Note that the recording will change the current frame and will not reset it once
   * recording completes. Any cleanup should be done using the `onCompletedCallback` parameter
   * in the `recordingOptions` object or where `abort()` is called.
   */
  public start(
    setFrameAndRender: (frame: number) => Promise<void>,
    recordingAction: (frame: number, recordingOptions: RecordingOptions) => Promise<void>,
    recordingOptions: Partial<RecordingOptions>
  ): void {
    if (this.recording) {
      return;
    }

    this.recording = true;
    const options = { ...defaultRecordingOptions, ...recordingOptions };

    // Reset any existing timers
    clearTimeout(this.timerId);

    // Formatting setup
    const loadAndRecordFrame = async (frame: number): Promise<void> => {
      if (frame > options.max || !this.recording) {
        this.recording = false;
        await options.onCompletedCallback();
        return;
      }

      // Trigger a render through the redrawfn parameter so other UI elements update
      // Must force render here or else empty image data is returned.
      await setFrameAndRender(frame);
      await recordingAction(frame, options);

      // Notify listeners about frame recording
      options.onRecordedFrameCallback(frame);

      const nextFrame = frame + options.frameIncrement;
      if (nextFrame > options.max) {
        // Stop recording
        this.recording = false;
        options.onCompletedCallback();
        return;
      }
      this.timerId = window.setTimeout(() => loadAndRecordFrame(nextFrame), options.delayMs);
    };

    // Start interval loop
    loadAndRecordFrame(options.min);
  }

  public abort(): void {
    clearTimeout(this.timerId);
    this.recording = false;
  }

  public isRecording(): boolean {
    return this.recording;
  }
}
