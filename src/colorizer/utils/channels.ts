import { type ManifestFile } from "./dataset_utils";

type Frames3dInfo = NonNullable<ManifestFile["frames3d"]>;
type BackdropInfo = NonNullable<NonNullable<ManifestFile["frames3d"]>["backdrops"]>;

/**
 * Returns an array of unique volume sources (usually URLs for 3D Zarr arrays)
 * for the segmentation and backdrop channels. The segmentation source is always
 * first.
 */
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

/**
 * Returns a mapping from a backdrop channel index to the actual channel index
 * in a combined volume source. Returns `-1` for invalid backdrop channels.
 *
 * Backdrop channels are specified in the Dataset manifest as a source and a
 * channel index within that source. However, all of the sources are
 * concatenated together when loaded as a volume, so the actual channel index
 * must be computed.
 *
 * @param sources Array of unique volume sources, as returned by
 * `getVolumeSources()`.
 * @param sourceChannelCounts Number of channels in each source, in the same
 * order as `sources`.
 * @param backdrops Array of backdrop channel info from the Dataset manifest.
 * @returns An array of channel indices, one for each backdrop channel. If the
 * returned array is `backdropToChannelIndex`, then, for some backdrop channel index
 * `i`, the channel index in the combined volume is `backdropToChannelIndex[i]`.
 *
 */
export function getBackdropToChannelIndexMap(
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
  for (const backdrop of backdrops) {
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
