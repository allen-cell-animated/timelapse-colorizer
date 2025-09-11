import { MutableRefObject, useRef } from "react";

/**
 * Returns a reference to a constructed value that will not be re-computed
 * between renders.
 *
 * Functionally, this is a wrapper around useRef and guarantees the current
 * value is non-null. See https://react.dev/reference/react/useRef for more
 * details.
 *
 * @param constructor A callback used to assign the value. This will only be
 * called once.
 * @returns A MutableRefObject wrapping the value as returned by the
 * constructor.
 * @example
 * ```
 * // For most use-cases, add `.current` to get the value:
 * const value = useConstructor(() => {return new ValueConstructor()}).current;
 *
 * // You can also modify the value directly if needed:
 * const otherValueRef = useConstructor(() => {return new ValueConstructor()});
 * ...
 * otherValueRef.current = newValue;
 * ```
 */
export function useConstructor<T>(constructor: () => T): MutableRefObject<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = constructor();
  }
  return ref as MutableRefObject<T>;
}
