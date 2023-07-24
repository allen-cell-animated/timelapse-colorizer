export default class Track {
  public trackId: number;
  public times: number[];
  public ids: number[];
  // Centroids must be packed as 2D array for sorting to work correctly
  public centroids: number[][] | undefined;

  constructor(trackId: number, times: number[], ids: number[], centroids?: number[][]) {
    this.trackId = trackId;
    this.times = times;
    this.ids = ids;
    this.centroids = centroids;

    // sort time, id, and centroids, ascending by time
    const shouldSort = true;
    if (shouldSort) {
      const indices = [...times.keys()];
      indices.sort((a, b) => (times[a] < times[b] ? -1 : times[a] === times[b] ? 0 : 1));
      this.times = indices.map((i) => times[i]);
      this.ids = indices.map((i) => ids[i]);
      if (centroids) {
        this.centroids = indices.map((i) => centroids[i]);
      }
    }
    console.log(
      `Track ${trackId} has ${this.length()} timepoints starting from ${this.times[0]} to ${
        this.times[this.times.length - 1]
      }`
    );
    console.log(this.ids);
  }

  getIdAtTime(t: number): number {
    if (this.times.length === 1 && this.times[0] === t) {
      return this.ids[0];
    }
    const index = this.times.findIndex((time) => time > t);
    if (index === -1) {
      return -1;
    }
    return this.ids[index];
  }

  length(): number {
    return this.times.length;
  }
}
