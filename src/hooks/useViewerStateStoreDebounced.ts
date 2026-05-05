import { useRef, useState } from "react";
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

  const [_countState, _setCountState] = useState(0);
  const triggerStateUpdate = () => _setCountState((prev) => prev + 1);

  const propertyTimeouts = useRef<Partial<Record<keyof T, TimeoutHandle>>>({});
  const pendingValues = useRef<Partial<T>>({});
  const propertyDelayMsRef = useRef(propertyDelayMs);
  propertyDelayMsRef.current = propertyDelayMs;

  const debouncedStateRef = useRef(rawState);

  // Detect changes in the selected state vs. debounced state.
  for (const key in rawState) {
    if (debouncedStateRef.current[key] !== rawState[key]) {
      const propertyDelayMs = Math.max(propertyDelayMsRef.current[key] ?? delayMs, 0);

      if (propertyDelayMs === 0) {
        // No debounce, set immediately.
        debouncedStateRef.current = {
          ...debouncedStateRef.current,
          [key]: rawState[key],
        };
      } else if (pendingValues.current[key] !== rawState[key]) {
        // Value has been changed (either from previous state or while an update
        // was pending); start a new timeout to update the debounced state.
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

  const isDebouncePending = Object.keys(pendingValues.current).length > 0;
  return [debouncedStateRef.current, isDebouncePending];
};
