import ColorizeCanvas from "./ColorizeCanvas";
import Dataset from "./Dataset";

export default class RecordingControls {
  private startBtn: HTMLButtonElement;
  private abortBtn: HTMLButtonElement;
  private recording: boolean;
  private startAtCurrentFrameChkbx: HTMLInputElement;

  // TODO: Add internal flag for overriding
  private filePrefixInput: HTMLInputElement;
  private hiddenAnchorEl: HTMLAnchorElement;

  private timerId: number;
  private startingFrame: number;
  private redrawfn: () => void;

  private dataset: Dataset | null;
  private canvas: ColorizeCanvas;

  constructor(canvas: ColorizeCanvas, redrawfn: () => void) {
    this.startBtn = document.querySelector("#sequence_start_btn")!;
    this.abortBtn = document.querySelector("#sequence_abort_btn")!;
    this.startAtCurrentFrameChkbx = document.querySelector("#sequence_start_frame_checkbox")!;
    this.filePrefixInput = document.querySelector("#sequence_prefix")!;
    
    this.hiddenAnchorEl = document.createElement("a");
    document.body.appendChild(this.hiddenAnchorEl);
    
    this.recording = false;
    this.dataset = null;
    this.canvas = canvas;

    this.timerId = 0;
    this.startingFrame = 0;
    this.redrawfn = redrawfn;

    this.startBtn.addEventListener("click", () => this.handleStartButtonClick());
    this.abortBtn.addEventListener("click", () => this.handleAbortButtonClick());
  }

  public setCanvas(canvas: ColorizeCanvas) {
    this.canvas = canvas;
    console.log(this.canvas.domElement);
  }

  private async handleStartButtonClick(): Promise<void> {
    if (!this.recording) {
      this.startingFrame = this.canvas.getCurrentFrame();
      this.recording = true;

      if (!this.startAtCurrentFrameChkbx.checked) {
        await this.canvas.setFrame(0);  // start at beginning
      }
      this.startingFrame = this.canvas.getCurrentFrame();

      this.startRecording();  // Start recording loop
    }
  }

  private async handleAbortButtonClick(): Promise<void> {
    if (this.recording) {
      clearInterval(this.timerId);
      this.recording = false;
      await this.canvas.setFrame(this.startingFrame);  // Reset to starting frame
      this.redrawfn();
    }
  }

  private async startRecording(): Promise<void> {
    // Reset any existing timers
    clearInterval(this.timerId);

    // Formatting setup
    const maxDigits = this.canvas.getTotalFrames().toString().length
    
    const loadAndRecordFrame = async (): Promise<void> => {
      const currentFrame = this.canvas.getCurrentFrame();
      
      // Trigger a render through the redrawfn parameter so other UI elements update
      this.redrawfn();
      
      // Get canvas as an image URL that can be downloaded
      const dataURL = this.canvas.domElement.toDataURL("image/png");
      let imageURL = dataURL.replace(/^data:image\/png/, "data:application/octet-stream");
      
      // Update our anchor (link) element with the image data, then force
      // a click to initiate the download.
      this.hiddenAnchorEl.href = imageURL;
      const frameNumber: string = currentFrame.toString().padStart(maxDigits, "0");
      this.hiddenAnchorEl.download = `${this.filePrefixInput.value}${frameNumber}.png`;
      this.hiddenAnchorEl.click();
      
      // Advance to the next frame, checking if we've exceeded bounds.
      if (!await this.canvas.setFrame(currentFrame + 1, false)) {
        // Reached end, so stop and reset UI
        clearInterval(this.timerId);
        this.recording = false;
        await this.canvas.setFrame(this.startingFrame);  // Reset to starting frame
        this.redrawfn();
      }
    }
  
    // Start interval loop
    this.timerId = window.setInterval(loadAndRecordFrame, 0);
  }

  public updateUI(): void {
    this.startBtn.disabled = this.recording;
    this.abortBtn.disabled = !this.recording;
  }

  public isRecording(): boolean {
    return this.recording;
  }
}
