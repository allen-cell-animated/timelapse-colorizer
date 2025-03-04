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

export const makeDebouncedCallback = <T, U, CallbackFn extends (state: T) => Partial<U> | undefined | void>(
  callback: CallbackFn,
  debounceMs: number = 250
): ((state: T) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  return (state: T) => {
    lastArgs = state;
    if (timeout) {
      clearTimeout(timeout);
    }
    console.log("makeDebouncedCallback: Setting timeout", debounceMs);
    timeout = setTimeout(() => {
      if (lastArgs) {
        callback(lastArgs);
      }
      timeout = null;
    }, debounceMs);
  };
};
