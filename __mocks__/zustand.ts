// Adapted from
// https://github.com/pmndrs/zustand/blob/HEAD/docs/guides/testing.md
//
// Mocks the `create` and `createStore` functions in the `zustand` package so
// stores are reset and will not persist state between test runs.
import { act } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type * as ZustandExportedTypes from "zustand";

export * from "zustand";

const { create: actualCreate, createStore: actualCreateStore } = await vi.importActual<typeof ZustandExportedTypes>(
  "zustand"
);

// a variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
): ZustandExportedTypes.UseBoundStore<ZustandExportedTypes.StoreApi<T>> => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// when creating a store, we get its initial state, create a reset function and add it in the set
export const create = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  // to support curried version of create
  return typeof stateCreator === "function" ? createUncurried(stateCreator) : createUncurried;
}) as typeof ZustandExportedTypes.create;

const createStoreUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>
): ZustandExportedTypes.StoreApi<T> => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// when creating a store, we get its initial state, create a reset function and add it in the set
export const createStore = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  // to support curried version of createStore
  return typeof stateCreator === "function" ? createStoreUncurried(stateCreator) : createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

// reset all stores after each test run
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
