import type { Dataset } from "src/colorizer";

import type { LineageData } from "./types";

export function getLineageData(dataset: Dataset): LineageData {
  const tracks = dataset.trackIds;
  const times = dataset.times;
  // Get first track edge (TODO: handle multiple track edges in the future?)
  const defaultTrackKey = dataset.getDefaultTrackKey();
  const trackData = defaultTrackKey ? dataset.getTrackData(defaultTrackKey) : undefined;
  const trackEdges = trackData?.trackEdges;
  if (!tracks || !times || !trackEdges) {
    return { trackInfo: [], edges: [] };
  }

  const allTracks = new Set<number>();
  const trackToInfo = new Map<number, { id: number; length: number; startTime: number }>();
  for (let i = 0; i < tracks.length; i++) {
    const trackId = tracks[i];
    const time = times[i];

    if (!trackToInfo.has(trackId)) {
      trackToInfo.set(trackId, { id: trackId, length: 1, startTime: time });
    } else {
      const info = trackToInfo.get(trackId)!;
      info.length += 1;
      info.startTime = Math.min(info.startTime, time);
    }
    allTracks.add(trackId);
  }

  const trackInfo = Array.from(trackToInfo.values());

  const skippedEdges: [number, number][] = [];
  const edges: [number, number][] = [];
  for (let i = 0; i < trackEdges.length; i += 2) {
    const source = trackEdges[i];
    const target = trackEdges[i + 1];
    // Skip edges that do not exist in the dataset
    if (!allTracks.has(source) || !allTracks.has(target)) {
      skippedEdges.push([source, target]);
      continue;
    }
    edges.push([source, target]);
  }

  if (skippedEdges.length > 0) {
    console.warn(`Skipped ${skippedEdges.length} edges that reference non-existent tracks:`, skippedEdges);
  }
  return { trackInfo, edges };
}
