export type RecordingOptions = {
  /** Frame to start recording from, inclusive. 0 by default. */
  min: number;
  /** Highest frame number to record, inclusive. */
  max: number;
  /** Number of frames to skip over. 0 means no frames will be skipped,
   * 1 means every other frame will be skipped, and so on. 0 by default. */
  frameSkip: number;
  /** String file prefix added to recorded frames.
   * Filenames will be formatted as `{prefix}{frame #}.png` */
  prefix: string;
  /** Delay between each recorded frame, in milliseconds. 100 ms by default. */
  delayMs: number;
  /** Called when the recording has completed successfully. (Will not be called if the recording
   * operation is cancelled.) */
  onCompletedCallback: () => void;
  /** Called when each frame has completed */
  onRecordedFrameCallback: (frame: number) => void;
};

const defaultRecordingOptions: RecordingOptions = {
  min: 0,
  max: 0,
  frameSkip: 0,
  prefix: "image-",
  delayMs: 100,
  onCompletedCallback: function (): void {},
  onRecordedFrameCallback: function (_frame: number): void {},
};

export default class RecordingControls {
  private recording: boolean;
  private hiddenAnchorEl: HTMLAnchorElement;
  private timerId: number;

  constructor() {
    this.recording = false;
    this.timerId = 0;

    this.hiddenAnchorEl = document.createElement("a"); // Hidden element for initiating download later
  }

  /**
   * Records and downloads an image sequence, if not already recording.
   *
   * @param setFrameAndRender Async callback to set and update the currently displayed frame.
   * @param canvasElement The canvas element to record updated frames from.
   * @param recordingOptions Configurable options for the recording.
   *
   * Note that the recording will change the current frame and will not reset it once
   * recording completes. Any cleanup should be done using the `onCompletedCallback` parameter
   * in the `recordingOptions` object.
   */
  public start(
    setFrameAndRender: (frame: number) => Promise<void>,
    canvasElement: HTMLCanvasElement,
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
    const maxDigits = options.max.toString().length;

    const loadAndRecordFrame = async (frame: number): Promise<void> => {
      if (frame > options.max || !this.recording) {
        this.recording = false;
        options.onCompletedCallback();
        return;
      }

      // Trigger a render through the redrawfn parameter so other UI elements update
      // Must force render here or else empty image data is returned.
      await setFrameAndRender(frame);

      // Get canvas as an image URL that can be downloaded
      const dataURL = canvasElement.toDataURL("image/png");
      const imageURL = dataURL.replace(/^data:image\/png/, "data:application/octet-stream");

      // Update our anchor (link) element with the image data, then force
      // a click to initiate the download.
      this.hiddenAnchorEl.href = imageURL;
      const frameSuffix: string = frame.toString().padStart(maxDigits, "0");
      this.hiddenAnchorEl.download = `${options.prefix}${frameSuffix}.png`;
      this.hiddenAnchorEl.click();

      options.onRecordedFrameCallback(frame);

      const nextFrame = frame + options.frameSkip + 1;
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
