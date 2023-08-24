import ColorizeCanvas from "./ColorizeCanvas";

export default class RecordingControls {
  private recording: boolean;

  private hiddenAnchorEl: HTMLAnchorElement;

  private timerId: number;
  private startingFrame: number;
  private setFrameFn: (frame: number) => void;

  private canvas: ColorizeCanvas;

  constructor(canvas: ColorizeCanvas, setFrameFn: (frame: number) => void) {
    this.recording = false;
    this.canvas = canvas;
    this.timerId = 0;
    this.startingFrame = 0;
    this.setFrameFn = setFrameFn;

    this.hiddenAnchorEl = document.createElement("a"); // Hidden element for initiating download later
  }

  public setFrameCallback(fn: (frame: number) => void): void {
    this.setFrameFn = fn;
  }

  /**
   * Starts a recording loop with the given file prefix.
   * @param prefix The file prefix to save each image capture with.
   * @param startAtFirstFrame If true, starts the sequence at the first frame in the dataset.
   * By default, this is false and recording starts at the current frame.
   *
   * When the recording is completed, returns the canvas to the original frame.
   */
  public async start(prefix: string, startAtFirstFrame: boolean = false): Promise<void> {
    if (!this.recording) {
      this.startingFrame = this.canvas.getCurrentFrame();
      this.recording = true;

      if (startAtFirstFrame) {
        await this.canvas.setFrame(0); // start at beginning
      }
      this.startingFrame = this.canvas.getCurrentFrame();

      this.startRecording(prefix); // Start recording loop
    }
  }

  public async abort(): Promise<void> {
    if (this.recording) {
      clearTimeout(this.timerId);
      this.recording = false;
      this.setFrameFn(this.startingFrame);
    }
  }

  private async startRecording(prefix: string): Promise<void> {
    // Reset any existing timers
    clearTimeout(this.timerId);

    // Formatting setup
    const maxDigits = this.canvas.getTotalFrames().toString().length;

    const loadAndRecordFrame = async (): Promise<void> => {
      const currentFrame = this.canvas.getCurrentFrame();

      // Trigger a render through the redrawfn parameter so other UI elements update
      // TODO: Make async, await.
      // Must force render here or else empty image data is returned.
      this.setFrameFn(currentFrame);
      this.canvas.render();

      // Get canvas as an image URL that can be downloaded
      const dataURL = this.canvas.domElement.toDataURL("image/png");
      const imageURL = dataURL.replace(/^data:image\/png/, "data:application/octet-stream");

      // Update our anchor (link) element with the image data, then force
      // a click to initiate the download.
      this.hiddenAnchorEl.href = imageURL;
      const frameNumber: string = currentFrame.toString().padStart(maxDigits, "0");
      this.hiddenAnchorEl.download = `${prefix}${frameNumber}.png`;
      this.hiddenAnchorEl.click();

      // Advance to the next frame, checking if we've exceeded bounds.
      if (this.canvas.isValidFrame(currentFrame + 1) && this.recording) {
        await this.canvas.setFrame(currentFrame + 1);
        // Trigger the next run.
        // Timeout is required to prevent skipped/dropped frames. 100 ms is a magic
        // number that prevented frame drop on a developer machine, but is not very robust.
        // TODO: Replace magic number for frame delay with a check for download completion?
        this.timerId = window.setTimeout(loadAndRecordFrame, 100);
      } else {
        // Reached end, so stop and reset UI
        this.recording = false;
        this.setFrameFn(this.startingFrame);
      }
    };

    // Start interval loop
    loadAndRecordFrame();
  }

  public isRecording(): boolean {
    return this.recording;
  }
}
