import type { Mutate, StoreApi, UseBoundStore } from "zustand";

import type { ChannelSettingParamKey, UrlParam } from "src/colorizer/utils/url_utils";

// Note: Zustand's repo maintainer says that 'subscribeWithSelector' is just for
// compatibility, and the behavior can be replicated without needing the
// middleware. See
// https://github.com/pmndrs/zustand/discussions/1433#discussioncomment-4152987

/**
 * A Zustand store wrapped in the `subscribeWithSelector` middleware. This
 * allows subscribers to provide a selector function that returns a subset of
 * the state. The provided listener function will only be called when the
 * dependencies specified by selector function change, rather than on every
 * state change.
 *
 * @returns A store with a modified `subscribe()` method, which takes arguments
 * for a selector, callback, and options.
 * @see https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector
 */
export type SubscribableStore<T> = UseBoundStore<Mutate<StoreApi<T>, [["zustand/subscribeWithSelector", never]]>>;

/** Alias for Zustand's store type. */
export type Store<T> = UseBoundStore<StoreApi<T>>;

export type SerializedStoreData = Partial<Record<UrlParam | ChannelSettingParamKey, string>>;
