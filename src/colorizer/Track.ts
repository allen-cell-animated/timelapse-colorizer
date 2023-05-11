export default class Track {
  public trackId: number;
  public times: number[];
  public ids: number[];
  // TODO:  centroids

  constructor(trackId: number, times: number[], ids: number[]) {
    this.trackId = trackId;
    this.times = times;
    this.ids = ids;

    // sort both, ascending by time
    // I have no idea if the time domain would be presorted or not
    const shouldSort = true;
    if (shouldSort) {
      const indices = [...times.keys()];
      indices.sort((a, b) => (times[a] < times[b] ? -1 : times[a] === times[b] ? 0 : 1));
      this.times = indices.map((i) => times[i]);
      this.ids = indices.map((i) => ids[i]);
    }
    console.log(
      `Track ${trackId} has ${this.length()} timepoints starting from ${this.times[0]} to ${
        this.times[this.times.length - 1]
      }`
    );
    console.log(this.ids);
  }

  getIdAtTime(t: number): number {
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
