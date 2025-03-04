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
export const addDerivedStateSubscriber = <T, const U = [keyof T][]>(
  store: SubscribableStore<T>,
  selectorFn: (state: T) => U,
  listenerFn: (state: U) => Partial<T>
): void => {
  store.subscribe(
    selectorFn,
    (selectedState) => {
      store.setState(listenerFn(selectedState));
    },
    {
      fireImmediately: true,
      equalityFn: shallow,
    }
  );
};
