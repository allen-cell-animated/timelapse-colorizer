export default class Track {
  public trackId: number;
  /** Times, in ascending order. */
  public times: number[];
  /** Object IDs in the track, in ascending order of time. */
  public ids: number[];
  /** Centroids in the track, in ascending order of time. */
  public centroids: number[];
  /** Bounds in the track, in ascending order of time. */
  public bounds: number[];

  constructor(trackId: number, times: number[], ids: number[], centroids: number[], bounds: number[]) {
    this.trackId = trackId;
    this.times = times;
    this.ids = ids;
    this.centroids = centroids;
    this.bounds = bounds;

    // sort time, id, and centroids, ascending by time
    const shouldSort = true;
    if (shouldSort) {
      const indices = [...times.keys()];
      indices.sort((a, b) => (times[a] < times[b] ? -1 : times[a] === times[b] ? 0 : 1));
      this.times = indices.map((i) => times[i]);
      this.ids = indices.map((i) => ids[i]);

      this.centroids = indices.reduce((result, i) => {
        result.push(centroids[i * 2], centroids[i * 2 + 1]);
        return result;
      }, [] as number[]);

      this.bounds = indices.reduce((result, i) => {
        result.push(bounds[i * 4], bounds[i * 4 + 1], bounds[i * 4 + 2], bounds[i * 4 + 3]);
        return result;
      }, [] as number[]);
    }
  }

  getIdAtTime(t: number): number {
    // assume that times passed in would be an exact match.
    const index = this.times.findIndex((time) => time === t);
    if (index === -1) {
      return -1;
    }
    return this.ids[index];
  }

  /**
   * Gets the duration, in frames, that the track exists for. Note that the track
   * may not have objects for all frames in the duration.
   *
   * - A track with only 1 id has a duration of 1.
   * - A track that exists from frame 1 to frame 10 has a duration of 10.
   */
  duration(): number {
    return this.times[this.times.length - 1] - this.times[0] + 1;
  }

  startTime(): number {
    return this.times[0];
  }

  endTime(): number {
    return this.times[this.times.length - 1];
  }
}
