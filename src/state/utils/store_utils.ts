import { shallow } from "zustand/shallow";

import { SubscribableStore } from "../types";

/**
 * Adds a subscriber that updates a derived (calculated) value in the store
 * whenever its dependencies change.
 * @param store The store to add the subscriber to. The store must be wrapped in
 * the `subscribeWithSelector` middleware. Changes are made using
 * `store.setState()`.
 * @param selectorFn The selector function that returns the dependencies for the
 * derived value.
 * @param listenerFn The listener function that computes and returns the new
 * derived value, called when the selected dependencies change.
 */
export const addDerivedStateSubscriber = <T, const U>(
  store: SubscribableStore<T>,
  selectorFn: (state: T) => U,
  listenerFn: (state: U, prevState: U) => Partial<T> | undefined | void
): void => {
  store.subscribe(
    selectorFn,
    (selectedState, prevSelectedState) => {
      const result = listenerFn(selectedState, prevSelectedState);
      if (result) {
        store.setState(result);
      }
    },
    {
      fireImmediately: true,
      equalityFn: shallow,
    }
  );
};

/**
 * Returns a new callback function that wraps the original callback, but debounces
 * repeated calls by a specified number of milliseconds.
 * @param callback The original callback function to debounce.
 * @param debounceMs The number of milliseconds to wait before calling the
 * debounced callback. Defaults to 250ms.
 */
export const makeDebouncedCallback = <T, U, CallbackFn extends (state: T) => Partial<U> | undefined | void>(
  callback: CallbackFn,
  debounceMs: number = 250
): ((args: T) => void) => {
  // TODO: Compare arguments to lastArgs to allow repeated calls with the same
  // arguments.
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  return (state: T) => {
    lastArgs = state;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      if (lastArgs) {
        callback(lastArgs);
      }
      timeout = null;
    }, debounceMs);
  };
};
