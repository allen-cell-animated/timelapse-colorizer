export default class Track {
  public trackId: number;
  public times: number[];
  public ids: number[];
  public centroids: number[];
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
