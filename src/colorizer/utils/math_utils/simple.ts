/**
 * Remaps a value from one range to another, optionally clamping the input value to the input range.
 *
 * Handles reversed ranges (e.g. `inMin > inMax` or `outMin > outMax`). If `inMin === inMax`, returns `outMin`.
 *
 * @param clamp If true (default), clamps the input to the input range.
 */
export function remap(
  input: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamp: boolean = true
): number {
  if (clamp) {
    const min = Math.min(inMin, inMax);
    const max = Math.max(inMin, inMax);
    input = Math.min(Math.max(input, min), max);
  }
  if (inMin === inMax) {
    return outMin;
  }
  return ((input - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
