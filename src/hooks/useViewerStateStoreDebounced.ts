import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";

import type { ViewerStore } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Custom hook that returns a debounced, selected subset of viewer state.
 * @param selector A selector function that selects a subset of the viewer state
 * to debounce. Automatically wrapped with `useShallow` for shallow comparison
 * of selected state.
 * @param delayMs The default debounce delay, in milliseconds, to apply to all
 * selected properties. Set to 0 to disable debounce by default.
 * @param propertyDelayMs Property-specific delay overrides. Use this to
 * increase or disable the debounce for certain values.
 * @returns An array tuple of:
 *   1. The debounced state selected from the viewer store.
 *   2. A boolean, indicating whether there are pending debounced updates.
 */
export const useViewerStateStoreDebounced = <T extends Partial<ViewerStore>>(
  selector: (state: ViewerStore) => T,
  delayMs: number,
  propertyDelayMs: Partial<Record<keyof T, number>> = {}
): [T, boolean] => {
  const rawState = useViewerStateStore(useShallow(selector));

  // Dummy value used to trigger re-renders.
  const [_countState, _setCountState] = useState(0);
  const triggerStateUpdate = (): void => _setCountState((prev) => prev + 1);

  const propertyTimeouts = useRef<Partial<Record<keyof T, TimeoutHandle>>>({});
  const pendingValues = useRef<Partial<T>>({});
  const propertyDelayMsRef = useRef(propertyDelayMs);
  propertyDelayMsRef.current = propertyDelayMs;

  const debouncedStateRef = useRef(rawState);

  const getPropertyDelayMs = (key: keyof T): number => {
    return Math.max(propertyDelayMsRef.current[key] ?? delayMs, 0);
  };

  // Set any properties that can be updated immediately (debounce = 0).
  for (const key in rawState) {
    const propertyDelayMs = getPropertyDelayMs(key);
    if (debouncedStateRef.current[key] !== rawState[key] && propertyDelayMs === 0) {
      debouncedStateRef.current = {
        ...debouncedStateRef.current,
        [key]: rawState[key],
      };
    }
  }

  // Handle debouncing properties in an effect
  useEffect(() => {
    for (const key in rawState) {
      if (debouncedStateRef.current[key] !== rawState[key]) {
        const propertyDelayMs = getPropertyDelayMs(key);
        if (propertyDelayMs > 0 && pendingValues.current[key] !== rawState[key]) {
          // Value has been changed (either from previous state or while an
          // existing update was pending); start a new timeout to update the
          // debounced state.
          pendingValues.current[key] = rawState[key];
          // Clear the existing timeout, if already pending
          if (propertyTimeouts.current[key]) {
            clearTimeout(propertyTimeouts.current[key]);
          }
          propertyTimeouts.current[key] = setTimeout(() => {
            const value = pendingValues.current[key];
            debouncedStateRef.current = {
              ...debouncedStateRef.current,
              [key]: value,
            };
            triggerStateUpdate();
            // Clear the pending value and timeout for this property
            delete pendingValues.current[key];
            delete propertyTimeouts.current[key];
          }, propertyDelayMs);
        }
      }
    }
  }, [rawState, delayMs]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(propertyTimeouts.current)) {
        clearTimeout(timeoutId);
      }
      pendingValues.current = {};
      propertyTimeouts.current = {};
    };
  }, []);

  const isDebouncePending = Object.keys(pendingValues.current).length > 0;
  return [debouncedStateRef.current, isDebouncePending];
};
