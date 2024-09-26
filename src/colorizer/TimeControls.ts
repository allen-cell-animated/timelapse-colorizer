import { DEFAULT_PLAYBACK_FPS } from "../constants";

import CanvasWithOverlay from "./CanvasWithOverlay";

// time / playback controls
const NO_TIMER_ID = -1;

export default class TimeControls {
  private timerId: number;
  private setFrameFn?: (frame: number) => Promise<void>;
  private playbackFps: number;

  private canvas: CanvasWithOverlay;

  private pauseCallbacks: (() => void)[];

  constructor(canvas: CanvasWithOverlay, playbackFps: number = DEFAULT_PLAYBACK_FPS) {
    this.canvas = canvas;
    this.timerId = NO_TIMER_ID;
    this.pauseCallbacks = [];
    this.playbackFps = playbackFps;
  }

  /**
   * Adds a callback that will be called to change the current frame.
   * @param fn A function that takes a frame number and returns a promise that resolves once the
   * frame is loaded.
   */
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
    if (this.isPlaying()) {
      return;
    }

    // TODO: Fix this function so that it doesn't stop the slider from also operating

    // `lastFrameNum` is a parameter here because relying on `ColorizeCanvas.getCurrentFrame()` can
    // lead to race conditions that lead to frames getting loaded more than once.
    const loadNextFrame = async (lastFrameNum: number): Promise<void> => {
      if (!this.isPlaying()) {
        return;
      }

      const startTime = Date.now();
      const nextFrame = this.wrapFrame(lastFrameNum + 1);

      if (nextFrame === lastFrameNum) {
        // Stop playing for single-frame datasets.
        // TODO: Disable time bar on the UI for datasets with only one frame.
        this.timerId = NO_TIMER_ID;
        return;
      }

      // do the update
      if (this.setFrameFn) {
        await this.setFrameFn(nextFrame);
      }
      const endTime = Date.now();
      const timeElapsed = endTime - startTime;
      onNewFrameCallback();

      if (!this.isPlaying()) {
        // The timer was stopped while the frame was loading, so stop playback.
        return;
      }

      // Add additional delay, if needed, to maintain playback fps.
      // TODO: Could add some sort of smoothing here to make the playback more consistent.
      const delayMs = Math.max(0, 1000 / this.playbackFps - timeElapsed);
      this.timerId = window.setTimeout(() => loadNextFrame(nextFrame), delayMs);
    };

    this.timerId = window.setTimeout(() => loadNextFrame(this.canvas.getCurrentFrame()), 0);
  }

  /**
   * Begins playback of the time series. If the time series is already playing, this function does
   * nothing.
   * @param onNewFrameCallback An optional callback that will be called whenever a new frame is loaded.
   */
  public async play(onNewFrameCallback: () => void = () => {}): Promise<void> {
    this.playTimeSeries(onNewFrameCallback);
  }

  /**
   * Pauses the playback of the time series. If any pause listeners have been added, their callbacks
   * will be triggered.
   */
  public pause(): void {
    if (this.isPlaying()) {
      clearTimeout(this.timerId);
    }
    this.timerId = NO_TIMER_ID;
    this.pauseCallbacks.forEach((callback) => callback());
  }

  /**
   * Increment or decrement the time series by the given number of frames.
   */
  public async advanceFrame(delta: number = 1): Promise<void> {
    if (this.setFrameFn) {
      await this.setFrameFn(this.wrapFrame(this.canvas.getCurrentFrame() + delta));
    }
  }

  public isPlaying(): boolean {
    return this.timerId !== NO_TIMER_ID;
  }

  /**
   * Adds a listener that will be called whenever the playback is paused.
   * Note: listeners are not cleared between pauses.
   */
  public addPauseListener(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }
}
