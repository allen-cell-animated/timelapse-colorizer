import type Track from "src/colorizer/Track";

/**
 * Returns a lookup from any timepoints `t` in the track to the position delta between the centroid
 * at time `t` and `t-1`. If the track does not exist at timepoint `t-1`, the delta is undefined.
 */
function timeToMotionDelta(track: Track): { [key: number]: [number, number, number] | undefined } {
  const deltas: { [key: number]: [number, number, number] | undefined } = {};

  // Track IDs are sorted by time, but are not guaranteed to be contiguous.
  // For each time `t`, check if `t-1` exists and then calculate the delta.
  for (let i = 0; i < track.ids.length; i++) {
    const time = track.times[i];
    const prevTime = track.times[i - 1];
    if (i === 0 || prevTime !== time - 1) {
      deltas[time] = undefined;
    }

    const currentCentroidX = track.centroids[i * 3];
    const currentCentroidY = track.centroids[i * 3 + 1];
    const currentCentroidZ = track.centroids[i * 3 + 2];
    const prevCentroidX = track.centroids[(i - 1) * 3];
    const prevCentroidY = track.centroids[(i - 1) * 3 + 1];
    const prevCentroidZ = track.centroids[(i - 1) * 3 + 2];
    deltas[time] = [
      currentCentroidX - prevCentroidX,
      currentCentroidY - prevCentroidY,
      currentCentroidZ - prevCentroidZ,
    ];
  }

  return deltas;
}

/**
 * Calculates an array of motion deltas for each object in the dataset, averaged over the specified number of timesteps.
 * @param tracks An array of all tracks in the dataset to calculate motion deltas for.
 * @param numTimeIntervals The number of time intervals to average over (minimum 1). For an object at time `t`, the motion
 * delta will be calculated over time `t` to `t - numTimeIntervals`. If the object is not present for any or all timepoints
 * in the range, the motion deltas will be `NaN`.
 * @returns one of the following:
 * - an array of motion deltas, with length equal to `dataset.numObjects * 2`. For each object id `i`, the x and y components
 * of its motion delta are stored at indices `2i` and `2i + 1`, respectively. If an object does not exist for the specified number
 * of time intervals, both values will be `NaN`.
 */
export function calculateMotionDeltas(tracks: Track[], numTimeIntervals: number): Float32Array {
  numTimeIntervals = Math.max(numTimeIntervals, 1);

  // Count total objects to allocate the motion deltas array
  let numObjects = 0;
  for (const track of tracks) {
    numObjects += track.ids.length;
  }
  const motionDeltas = new Float32Array(numObjects * 3);

  for (const track of tracks) {
    const timeToDelta = timeToMotionDelta(track);

    for (let i = 0; i < track.ids.length; i++) {
      const objectId = track.ids[i];
      const timestamp = track.times[i];

      // Get all valid deltas for timepoints `t` to `t - numTimesteps`.
      const deltas: [number, number, number][] = [];
      for (let j = 0; j < numTimeIntervals; j++) {
        const delta = timeToDelta[timestamp - j];
        if (delta) {
          deltas.push(delta);
        }
      }

      // Check that the object has enough valid deltas to meet the threshold;
      // if so average and store the delta.
      if (deltas.length === numTimeIntervals) {
        const averagedDelta: [number, number, number] = deltas.reduce(
          (acc, delta) => [
            acc[0] + delta[0] / deltas.length,
            acc[1] + delta[1] / deltas.length,
            acc[2] + delta[2] / deltas.length,
          ],
          [0, 0, 0]
        );
        motionDeltas[3 * objectId] = averagedDelta[0];
        motionDeltas[3 * objectId + 1] = averagedDelta[1];
        motionDeltas[3 * objectId + 2] = averagedDelta[2];
      } else {
        // NOTE: These may need to become Infinity for shader compatibility
        motionDeltas[3 * objectId] = NaN;
        motionDeltas[3 * objectId + 1] = NaN;
        motionDeltas[3 * objectId + 2] = NaN;
      }
    }
  }

  return motionDeltas;
}
