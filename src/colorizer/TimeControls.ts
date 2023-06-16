import ColorizeCanvas from "./ColorizeCanvas";

// time / playback controls
export default class TimeControls {
  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private timeSlider: HTMLInputElement;
  private timeInput: HTMLInputElement;

  private timerId: number;
  private redrawfn: () => void;

  private canvas: ColorizeCanvas;

  constructor(canvas: ColorizeCanvas, redrawfn: () => void) {
    this.redrawfn = redrawfn;
    this.canvas = canvas;
    this.timerId = 0;
    this.playBtn = document.querySelector("#playBtn")!;
    this.pauseBtn = document.querySelector("#pauseBtn")!;
    this.forwardBtn = document.querySelector("#forwardBtn")!;
    this.backBtn = document.querySelector("#backBtn")!;
    this.timeSlider = document.querySelector("#timeSlider")!;
    this.timeInput = document.querySelector("#timeValue")!;
    this.playBtn.addEventListener("click", () => this.handlePlayButtonClick());
    this.pauseBtn.addEventListener("click", () => this.handlePauseButtonClick());
    this.forwardBtn.addEventListener("click", () => this.handleFrameAdvance(1));
    this.backBtn.addEventListener("click", () => this.handleFrameAdvance(-1));
    // only update when DONE sliding: change event
    this.timeSlider.addEventListener("change", () => this.handleTimeSliderChange());
    this.timeInput.addEventListener("change", () => this.handleTimeInputChange());
  }

  private playTimeSeries(onNewFrameCallback: () => void): void {
    clearInterval(this.timerId);

    const loadNextFrame = (): void => {
      let nextFrame = this.canvas.getCurrentFrame() + 1;
      if (nextFrame >= this.canvas.getTotalFrames()) {
        nextFrame = 0;
      }

      // do the necessary update
      this.redrawfn();
      this.canvas.setFrame(nextFrame);
      onNewFrameCallback();
    };
    this.timerId = window.setInterval(loadNextFrame, 40);
  }

  private handlePlayButtonClick(): void {
    if (this.canvas.getCurrentFrame() >= this.canvas.getTotalFrames() - 1) {
      this.canvas.setFrame(0);
    }
    this.playTimeSeries(() => {
      if (this.timeInput) {
        this.timeInput.value = "" + this.canvas.getCurrentFrame();
      }
      if (this.timeSlider) {
        this.timeSlider.value = "" + this.canvas.getCurrentFrame();
      }
    });
  }
  private handlePauseButtonClick(): void {
    clearInterval(this.timerId);
  }
  public handleFrameAdvance(delta: number = 1): void {
    this.canvas.setFrame(this.canvas.getCurrentFrame() + delta);
    this.redrawfn();
  }
  private async handleTimeSliderChange(): Promise<void> {
    // trigger loading new time
    if (await this.canvas.setFrame(this.timeSlider.valueAsNumber)) {
      this.timeInput.value = this.timeSlider.value;
      this.redrawfn();
    }
  }
  private async handleTimeInputChange(): Promise<void> {
    // trigger loading new time
    if (await this.canvas.setFrame(this.timeInput.valueAsNumber)) {
      // update slider
      this.timeSlider.value = this.timeInput.value;
      this.redrawfn();
    }
  }

  public updateUI(): void {
    this.timeSlider.max = `${this.canvas.getTotalFrames() - 1}`;
    this.timeInput.max = `${this.canvas.getTotalFrames() - 1}`;

    this.timeSlider.value = "" + this.canvas.getCurrentFrame();
    this.timeInput.value = "" + this.canvas.getCurrentFrame();

    if (this.canvas.getTotalFrames() < 2) {
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = true;
    } else {
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = false;
    }
  }
}
