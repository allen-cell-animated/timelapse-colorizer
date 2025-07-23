import { ManifestFile } from "./dataset_utils";

type Frames3dInfo = NonNullable<ManifestFile["frames3d"]>;
type BackdropInfo = NonNullable<NonNullable<ManifestFile["frames3d"]>["backdrops"]>;

export function getVolumeSources(frames3d: Frames3dInfo): string[] {
  const sources = new Set<string>();
  // Order segmentation source first
  sources.add(frames3d.source);
  if (frames3d.backdrops) {
    for (const backdrop of frames3d.backdrops) {
      sources.add(backdrop.source);
    }
  }
  return Array.from(sources);
}

export function getBackdropChannelIndices(
  sources: string[],
  sourceChannelCounts: number[],
  backdrops: BackdropInfo | undefined
): number[] {
  if (!backdrops) {
    return [];
  }
  /** Starting offset of each source's channels (sum of previous channel counts) */
  const sourceChannelOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < sources.length; i++) {
    sourceChannelOffsets.push(offset);
    offset += sourceChannelCounts[i];
  }

  const backdropChannelIndices: number[] = [];
  for (let backdrop of backdrops) {
    const sourceIndex = sources.indexOf(backdrop.source);
    if (sourceIndex !== -1) {
      const channelIndex = backdrop.channelIndex ?? 0;
      const globalIndex = sourceChannelOffsets[sourceIndex] + channelIndex;
      backdropChannelIndices.push(globalIndex);
    } else {
      backdropChannelIndices.push(-1); // Invalid source, push -1
    }
  }
  return backdropChannelIndices;
}
