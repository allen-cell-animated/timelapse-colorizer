import type { ManifestFile } from "./dataset_utils";

type Frames3dInfo = NonNullable<ManifestFile["frames3d"]>;
type BackdropChannelInfo = NonNullable<NonNullable<ManifestFile["frames3d"]>["backdrops"]>;

/**
 * Returns an array of unique volume sources (usually URLs for 3D Zarr arrays)
 * for the segmentation and additional backdrop channels. The segmentation source is
 * always first.
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
 * Returns an array mapping from a relative channel index to the absolute
 * channel index in a combined volume source. Returns `-1` for invalid backdrop
 * channels.
 *
 * Channels are specified as an **array** in the Dataset manifest. Each entry in
 * the array has a source and a channel index within that source, and TFE
 * channel settings refer to channels by their index in this array.
 *
 * However, this index is not the actual, absolute channel index in the
 * combined volume. All of the sources are concatenated together when loaded as
 * a volume, so the actual channel index must be computed.
 *
 * @param sources Array of unique volume sources, as returned by
 * `getVolumeSources()`.
 * @param sourceChannelCounts Number of channels in each source, in the same
 * order as `sources`.
 * @param backdropChannelInfo Array of backdrop channel info from the Dataset
 * manifest.
 * @returns An array of channel indices, one for each backdrop channel. If the
 * returned array is `relativeToAbsoluteIndex`, then, for some backdrop channel
 * index `i`, the channel index in the combined volume is
 * `relativeToAbsoluteIndex[i]`.
 *
 * @example
 * ```ts
 * const sources = ['X.zarr', 'Y.zarr', 'Z.zarr'];
 * const sourceChannelCounts = [1, 3, 2];
 * // X.zarr has 1 channel, Y.zarr has 3 channels, Z.zarr has 2 channels.
 * // Combined volume has these channels:
 * // [ X0, Y0, Y1, Y2, Z0, Z1 ]
 * const backdropChannelInfo = [
 * { source: 'Y.zarr', channelIndex: 0 }, // Channel 1 in combined volume
 * { source: 'Y.zarr', channelIndex: 2 }, // Channel 3 in combined volume
 * { source: 'Z.zarr', channelIndex: 1 }, // Channel 5 in combined volume
 * ];
 *
 * const relativeToAbsoluteIndex = getRelativeToAbsoluteChannelIndexMap(
 *   sources,
 *   sourceChannelCounts,
 *   backdropChannelInfo
 * );
 * // relativeToAbsoluteIndex is [1, 3, 5]
 * ```
 */
export function getRelativeToAbsoluteChannelIndexMap(
  sources: string[],
  sourceChannelCounts: number[],
  backdropChannelInfo: BackdropChannelInfo | undefined
): number[] {
  if (!backdropChannelInfo) {
    return [];
  }
  // Starting offset of each source's channels (sum of previous channel counts)
  const sourceChannelOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < sources.length; i++) {
    sourceChannelOffsets.push(offset);
    offset += sourceChannelCounts[i];
  }

  const absoluteChannelIndices: number[] = [];
  for (const backdrop of backdropChannelInfo) {
    const sourceIndex = sources.indexOf(backdrop.source);
    if (sourceIndex !== -1) {
      const relativeIndex = backdrop.channelIndex ?? 0;
      const absoluteIndex = sourceChannelOffsets[sourceIndex] + relativeIndex;
      absoluteChannelIndices.push(absoluteIndex);
    } else {
      // Invalid source, push -1
      absoluteChannelIndices.push(-1);
    }
  }
  return absoluteChannelIndices;
}
