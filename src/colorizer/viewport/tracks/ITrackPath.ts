import { TrackPathParams } from "src/colorizer/viewport/tracks/types";

export interface ITrackPath {
  /**
   * Sets parameters for the track path rendering. Returns true if a re-render
   * is needed.
   */
  setParams(params: TrackPathParams, prevParams: TrackPathParams | null): boolean;

  syncWithFrame(currentFrame: number): void;

  dispose(): void;
}
