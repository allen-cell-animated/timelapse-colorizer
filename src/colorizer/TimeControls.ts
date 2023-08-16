import ColorizeCanvas from "./ColorizeCanvas";

// time / playback controls
const DEFAULT_TIMER_ID = -1;
export default class TimeControls {
  private timerId: number;
  private setFrameFn: (frame: number) => void;

  private canvas: ColorizeCanvas;
  private isDisabled: boolean;

  private pauseCallbacks: (() => void)[];

  constructor(canvas: ColorizeCanvas, setFrameFn: (frame: number) => void) {
    this.setFrameFn = setFrameFn;
    this.canvas = canvas;
    this.timerId = DEFAULT_TIMER_ID;
    this.isDisabled = false;
    this.pauseCallbacks = [];
  }

  public setFrameCallback(fn: (frame: number) => void): void {
    this.setFrameFn = fn;
  }

  private wrapFrame(index: number): number {
    const totalFrames = this.canvas.getTotalFrames();
    return (index + totalFrames) % totalFrames;
  }

  private clampFrame(index: number): number {
    return Math.min(Math.max(index, 0), this.canvas.getTotalFrames() - 1);
  }

  private playTimeSeries(onNewFrameCallback: () => void): void {
    clearInterval(this.timerId);

    // TODO: Fix this function so that it doesn't stop the
    // slider from also operating
    const loadNextFrame = async (): Promise<void> => {
      if (this.isDisabled) {
        // stop render loop if time controls have been disabled.
        return;
      }
      const nextFrame = this.wrapFrame(this.canvas.getCurrentFrame() + 1);

      // do the necessary update
      this.setFrameFn(nextFrame);
      onNewFrameCallback();
    };
    this.timerId = window.setInterval(loadNextFrame, 40);
  }

  public async handlePlayButtonClick(): Promise<void> {
    if (this.canvas.getCurrentFrame() >= this.canvas.getTotalFrames() - 1) {
      await this.canvas.setFrame(0);
    }
    this.playTimeSeries(() => {});
  }

  public handlePauseButtonClick(): void {
    clearInterval(this.timerId);
    this.timerId = DEFAULT_TIMER_ID;
    this.pauseCallbacks.every((callback) => callback());
  }

  public async handleFrameAdvance(delta: number = 1): Promise<void> {
    this.setFrameFn(this.wrapFrame(this.canvas.getCurrentFrame() + delta));
  }

  public setIsDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    // Disable and clean up playback interval timer
    if (disabled) {
      clearInterval(this.timerId);
      this.timerId = DEFAULT_TIMER_ID;
    }
  }

  public isPlaying(): boolean {
    return this.timerId !== -1;
  }

  public addPauseListener(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }
}
