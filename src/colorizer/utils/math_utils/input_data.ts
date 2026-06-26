import Track from "src/colorizer/Track";

type TrackData = {
  ids: number[];
  times: number[];
  centroids: number[];
};

/**
 * Constructs an array of tracks from the given data.
 */
export function constructAllTracksFromData(
  trackIds: Uint32Array,
  times: Uint32Array,
  centroids?: Uint16Array
): Track[] {
  const trackIdToTrackData = new Map<number, TrackData>();

  for (let id = 0; id < trackIds.length; id++) {
    const trackId = trackIds[id];
    let trackData = trackIdToTrackData.get(trackId);
    if (!trackData) {
      trackData = { ids: [], times: [], centroids: [] };
      trackIdToTrackData.set(trackId, trackData);
    }
    trackData.ids.push(id);
    trackData.times.push(times[id]);
    if (centroids) {
      trackData.centroids.push(centroids[id * 3], centroids[id * 3 + 1], centroids[id * 3 + 2]);
    }
  }

  // Construct and return tracks. Tracks will automatically sort their data by time.
  const tracks = Array.from(trackIdToTrackData.entries()).map(([trackId, trackData]) => {
    return new Track(trackId, trackData.times, trackData.ids, trackData.centroids, [] as number[]);
  });
  return tracks;
}

/**
 * If the centroids data is in 2D (only x and y coords), pad the data to 3D by adding
 * a z coordinate of 0.
 * @param centroidsData
 * @param numObjects
 */
export function padCentroidsTo3d(centroidsData: Float32Array, numObjects: number): Float32Array {
  if (centroidsData.length === numObjects * 3) {
    return centroidsData;
  } else if (centroidsData.length === numObjects * 2) {
    const paddedCentroids = new Float32Array(numObjects * 3);
    for (let i = 0; i < numObjects; i++) {
      paddedCentroids[i * 3] = centroidsData[i * 2];
      paddedCentroids[i * 3 + 1] = centroidsData[i * 2 + 1];
      paddedCentroids[i * 3 + 2] = 0;
    }
    return paddedCentroids;
  } else {
    console.warn(
      `padCentroidsTo3d: Length of centroids data (${centroidsData.length}) is not a multiple of the number of objects (${numObjects}).`
    );
    return centroidsData;
  }
}
