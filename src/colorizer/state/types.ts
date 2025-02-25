import { StoreApi, UseBoundStore } from "zustand";

// Copied from Zustand's types
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
 * A Zustand store wrapped in the `subscribeWithSelector` middleware. This
 * allows it to be subscribed to with a listener that will only be called when
 * the dependencies specified by a selector function change, rather than on
 * every state change.
 */
export type SubscribableStore<T> = UseBoundStore<StoreApi<T> & StoreSubscribeWithSelector<T>>;
