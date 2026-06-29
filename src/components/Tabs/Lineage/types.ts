export type LineageData = {
  trackInfo: { id: number; length: number; startTime: number }[];
  edges: [number, number][];
};
