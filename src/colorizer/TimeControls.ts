import { DEFAULT_PLAYBACK_FPS } from "../constants";
import ColorizeCanvas from "./ColorizeCanvas";

// TODO: Remove class?

// time / playback controls
const DEFAULT_TIMER_ID = -1;
export default class TimeControls {
  // TODO: Change to be React state?
  private timerId: number;
  private setFrameFn?: (frame: number) => Promise<void>;
  private currentlyPlaying: boolean;
  private playbackFps: number;

  private canvas: ColorizeCanvas;

  private pauseCallbacks: (() => void)[];

  constructor(canvas: ColorizeCanvas, playbackFps: number = DEFAULT_PLAYBACK_FPS) {
    this.canvas = canvas;
    this.timerId = DEFAULT_TIMER_ID;
    this.pauseCallbacks = [];
    this.playbackFps = playbackFps;
    this.currentlyPlaying = false;
  }

  public setFrameCallback(fn: (frame: number) => Promise<void>): void {
    this.setFrameFn = fn;
  }

  public setPlaybackFps(fps: number): void {
    this.playbackFps = fps;
  }

  private wrapFrame(index: number): number {
    const totalFrames = this.canvas.getTotalFrames();
    return (index + totalFrames) % totalFrames;
  }

  private playTimeSeries(onNewFrameCallback: () => void): void {
    if (this.currentlyPlaying) {
      return;
    }

    this.currentlyPlaying = true;

    // TODO: Fix this function so that it doesn't stop the slider from also operating?

    // `lastFrameNum` is a parameter here because relying on `ColorizeCanvas.getCurrentFrame()` can
    // lead to race conditions that lead to frames getting loaded more than once.
    const loadNextFrame = async (lastFrameNum: number): Promise<void> => {
      if (!this.currentlyPlaying) {
        return;
      }

      const startTime = Date.now();
      const nextFrame = this.wrapFrame(lastFrameNum + 1);

      if (nextFrame === lastFrameNum) {
        // Stop playing for single-frame datasets.
        // TODO: Disable time bar on the UI for datasets with only one frame.
        this.currentlyPlaying = false;
        return;
      }

      // do the update
      if (this.setFrameFn) {
        await this.setFrameFn(nextFrame);
      }
      const endTime = Date.now();
      const timeElapsed = endTime - startTime;
      onNewFrameCallback();

      // TODO: Could add some sort of smoothing here to make the playback more consistent.
      // Add additional delay, if needed, to maintain playback fps.
      const delayMs = Math.max(0, 1000 / this.playbackFps - timeElapsed);
      this.timerId = window.setTimeout(() => loadNextFrame(nextFrame), delayMs);
      console.log(this.timerId);
    };
    loadNextFrame(this.canvas.getCurrentFrame());
  }

  public async handlePlayButtonClick(): Promise<void> {
    if (this.canvas.getCurrentFrame() >= this.canvas.getTotalFrames() - 1) {
      await this.canvas.setFrame(0);
    }
    this.playTimeSeries(() => {});
  }

  public handlePauseButtonClick(): void {
    if (this.timerId !== DEFAULT_TIMER_ID) {
      clearTimeout(this.timerId);
      this.timerId = DEFAULT_TIMER_ID;
    }
    this.currentlyPlaying = false;
    this.pauseCallbacks.forEach((callback) => callback());
  }

  public async handleFrameAdvance(delta: number = 1): Promise<void> {
    if (this.setFrameFn) {
      await this.setFrameFn(this.wrapFrame(this.canvas.getCurrentFrame() + delta));
    }
  }

  public isPlaying(): boolean {
    return this.currentlyPlaying;
  }

  public addPauseListener(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }
}
