import { Mutate, StoreApi, UseBoundStore } from "zustand";

/**
 * A Zustand store wrapped in the `subscribeWithSelector` middleware. This
 * allows subscribers to provide a selector function that returns a subset of
 * the state. The provided listener function will only be called when the
 * dependencies specified by selector function change, rather than on every
 * state change.
 */
export type SubscribableStore<T> = UseBoundStore<Mutate<StoreApi<T>, [["zustand/subscribeWithSelector", never]]>>;
