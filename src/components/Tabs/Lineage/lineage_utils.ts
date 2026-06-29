import { Dataset } from "src/colorizer";

import { LineageData } from "./types";

export function getLineageData(dataset: Dataset): LineageData {
  const tracks = dataset.trackIds;
  const times = dataset.times;
  // Get first track edge (TODO: handle multiple track edges in the future?)
  const trackEdges = dataset.trackEdges?.values().next().value;
  if (!tracks || !times || !trackEdges) {
    return { trackInfo: [], edges: [] };
  }

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
  }

  const trackInfo = Array.from(trackToInfo.values());

  const edges: [number, number][] = [];
  for (let i = 0; i < trackEdges.edges.length; i++) {
    const source = trackEdges.edges[2 * i];
    const target = trackEdges.edges[2 * i + 1];
    edges.push([source, target]);
  }

  return { trackInfo, edges };
}
