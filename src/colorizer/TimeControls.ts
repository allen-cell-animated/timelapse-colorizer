import { DEFAULT_PLAYBACK_FPS } from "src/colorizer/constants";

// time / playback controls
const NO_TIMER_ID = -1;

export default class TimeControls {
  private timerId: number;
  private mostRecentPlayRequestId: number;
  private getFrameFn: () => number;
  private setFrameFn: (frame: number) => Promise<void>;
  private playbackFps: number;
  private totalFrames: number;

  private pauseCallbacks: (() => void)[];

  constructor(getFrameFn: () => number, setFrameFn: (frame: number) => Promise<void>) {
    this.timerId = NO_TIMER_ID;
    this.pauseCallbacks = [];
    this.playbackFps = DEFAULT_PLAYBACK_FPS;
    this.mostRecentPlayRequestId = 0;
    this.totalFrames = 1;

    this.getFrameFn = getFrameFn;
    this.setFrameFn = setFrameFn;

    this.isPlaying = this.isPlaying.bind(this);
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
  }

  public setPlaybackFps(fps: number): void {
    this.playbackFps = fps;
  }

  public setTotalFrames(totalFrames: number): void {
    this.totalFrames = totalFrames;
  }

  private wrapFrame(index: number): number {
    return (index + this.totalFrames) % this.totalFrames;
  }

  private playTimeSeries(onNewFrameCallback: () => void): void {
    if (this.isPlaying()) {
      return;
    }
    this.mostRecentPlayRequestId += 1;

    // TODO: Fix this function so that it doesn't stop the slider from also operating

    // `lastFrameNum` is a parameter here because relying on `ColorizeCanvas.getCurrentFrame()` can
    // lead to race conditions that lead to frames getting loaded more than once.
    const loadNextFrame = async (lastFrameNum: number, requestId: number): Promise<void> => {
      if (this.mostRecentPlayRequestId !== requestId || !this.isPlaying()) {
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
      await this.setFrameFn(nextFrame);

      const endTime = Date.now();
      const timeElapsed = endTime - startTime;
      onNewFrameCallback();

      if (this.mostRecentPlayRequestId !== requestId || !this.isPlaying()) {
        // The timer was stopped while the frame was loading or a different
        // request was started, so stop playback.
        return;
      }

      // Add additional delay, if needed, to maintain playback fps.
      // TODO: Could add some sort of smoothing here to make the playback more consistent.
      const delayMs = Math.max(0, 1000 / this.playbackFps - timeElapsed);
      this.timerId = window.setTimeout(() => loadNextFrame(nextFrame, requestId), delayMs);
    };

    this.timerId = window.setTimeout(() => loadNextFrame(this.getFrameFn(), this.mostRecentPlayRequestId), 0);
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
    await this.setFrameFn(this.wrapFrame(this.getFrameFn() + delta));
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
