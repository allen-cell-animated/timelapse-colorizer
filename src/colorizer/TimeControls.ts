// time / playback controls
export default class TimeControls {
  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private forwardBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private timeSlider: HTMLInputElement;
  private timeInput: HTMLInputElement;

  private totalFrames: number;
  private currentFrame: number;
  private timerId: number;
  private redrawfn: () => void;

  constructor(redrawfn: () => void) {
    this.redrawfn = redrawfn;
    this.totalFrames = 0;
    this.currentFrame = 0;
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
      let nextFrame = this.currentFrame + 1;
      if (nextFrame >= this.totalFrames) {
        nextFrame = 0;
      }

      // do the necessary update
      this.redrawfn();
      this.currentFrame = nextFrame;
      onNewFrameCallback();
    };
    this.timerId = window.setInterval(loadNextFrame, 40);
  }

  private goToFrame(targetFrame: number): boolean {
    const wrap = true;
    // wrap around is ok
    if (wrap) {
      this.currentFrame = (targetFrame + this.totalFrames) % this.totalFrames;
      return true;
    }

    console.log("going to Frame " + targetFrame);
    const outOfBounds = targetFrame > this.totalFrames - 1 || targetFrame < 0;
    if (outOfBounds) {
      console.log(`frame ${targetFrame} out of bounds`);
      return false;
    }

    // check to see if we have pre-cached the frame, else load it...
    //     f(targetFrame);
    this.currentFrame = targetFrame;
    return true;
  }

  private handlePlayButtonClick(): void {
    if (this.currentFrame >= this.totalFrames - 1) {
      this.currentFrame = -1;
    }
    this.playTimeSeries(() => {
      if (this.timeInput) {
        this.timeInput.value = "" + this.currentFrame;
      }
      if (this.timeSlider) {
        this.timeSlider.value = "" + this.currentFrame;
      }
    });
  }
  private handlePauseButtonClick(): void {
    clearInterval(this.timerId);
  }
  public handleFrameAdvance(delta: number = 1): void {
    this.setCurrentFrame(this.currentFrame + delta);
  }
  private handleTimeSliderChange(): void {
    // trigger loading new time
    if (this.goToFrame(this.timeSlider.valueAsNumber)) {
      this.timeInput.value = this.timeSlider.value;
      this.redrawfn();
    }
  }
  private handleTimeInputChange(): void {
    // trigger loading new time
    if (this.goToFrame(this.timeInput.valueAsNumber)) {
      // update slider
      this.timeSlider.value = this.timeInput.value;
      this.redrawfn();
    }
  }

  public updateTotalFrames(totalFrames: number): void {
    this.totalFrames = totalFrames;
    this.timeSlider.max = `${totalFrames - 1}`;
    this.timeInput.max = `${totalFrames - 1}`;

    if (totalFrames < 2) {
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = true;
    } else {
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = false;
    }
  }

  /**
   * Attempts to set the current frame. If frame is updated, updates the time control UI and
   * triggers a redraw.
   * @returns true if the frame was set correctly (false if the frame is out of range).
   */
  public setCurrentFrame(frame: number): boolean {
    if (this.goToFrame(frame)) {
      this.redrawfn();
      // Update time slider fields
      this.timeSlider.value = "" + this.currentFrame;
      this.timeInput.value = "" + this.currentFrame;
      return true;
    }
    return false;
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }
}
