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
    console.log("playTimeSeries");
    if (this.currentlyPlaying) {
      console.log("Exiting early");
      return;
    }

    this.currentlyPlaying = true;

    // TODO: Fix this function so that it doesn't stop the
    // slider from also operating
    // Provide a last frame number to prevent a possible race condition with the canvas'
    // current frame value
    const loadNextFrame = async (lastFrameNum: number): Promise<void> => {
      if (!this.currentlyPlaying) {
        console.log("playTimeSeries: Stopping inside loop");
        return;
      }

      const startTime = Date.now();
      const nextFrame = this.wrapFrame(lastFrameNum + 1);
      console.log(`TimeControls: Currently on frame ${lastFrameNum}; loading ${nextFrame}`);
      // do the update
      if (this.setFrameFn) {
        await this.setFrameFn(nextFrame);
      }
      const endTime = Date.now();
      const timeElapsed = endTime - startTime;
      // TODO: Add some sort of smoothing here
      onNewFrameCallback();

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
    console.log("Stopping");
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
