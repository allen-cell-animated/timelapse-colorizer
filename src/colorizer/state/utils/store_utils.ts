import { shallow } from "zustand/shallow";

/**
 * Creates a selector function that computes a value based on a set of dependencies.
 * The selector will only recompute the value when the dependencies change.
 * @param depsFn A function that returns the dependencies (as an array). Values are compared using
 * shallow equality (`zustand/shallow`).
 * @param computeFn A function that computes and returns the value based on the dependencies.
 * @returns A selector function that returns a computed value, caching the result unless
 * the dependencies change.
 *
 * @example
 * ```
 * const useStore = create((set, get) => ({
 *   first: "John",
 *   last: "Doe",
 *   fullName: computed(
 *     // Dependencies:
 *     () => [get().first, get().last],
 *     // Computation (only computed when first accessed and only recomputed if a dependency value changes):
 *     (first, last) => `${first} ${last}`,
 *   ),
 * }));
 * ```
 *
 * Adapted from https://github.com/pmndrs/zustand/issues/108#issuecomment-2197556875
 */
export function computed<const TDeps extends readonly unknown[] = unknown[], TResult = unknown>(
  depsFn: () => TDeps,
  computeFn: (...deps: TDeps) => TResult
): () => TResult {
  let prevDeps: TDeps;
  let cachedResult: TResult;
  return () => {
    const deps = depsFn();
    if (prevDeps === undefined || !shallow(prevDeps, deps)) {
      prevDeps = deps;
      cachedResult = computeFn(...deps);
    }
    return cachedResult;
  };
}
