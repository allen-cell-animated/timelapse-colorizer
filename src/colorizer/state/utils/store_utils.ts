import { StoreApi, UseBoundStore } from "zustand";
import { shallow } from "zustand/shallow";

// Copied this out of Zustand's typing
type StoreSubscribeWithSelector<T> = {
  subscribe: {
    (listener: (selectedState: T, previousSelectedState: T) => void): () => void;
    <U>(
      selector: (state: T) => U,
      listener: (selectedState: U, previousSelectedState: U) => void,
      options?: {
        equalityFn?: (a: U, b: U) => boolean;
        fireImmediately?: boolean;
      }
    ): () => void;
  };
};
/**
 * A Zustand store wrapped in the `subscribeWithSelector` middleware, allowing
 * it to be subscribed to with a listener that will only be called when the
 * dependencies specified by the selector function change.
 */
export type SubscribableStore<T> = UseBoundStore<StoreApi<T> & StoreSubscribeWithSelector<T>>;

/**
 * Adds a subscriber that updates a calculated/derived value in the store
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
