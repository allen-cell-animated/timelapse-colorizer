import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";

import { ViewerStore } from "src/state/slices";
import { useViewerStateStore } from "src/state/ViewerState";

/**
 * Custom hook that returns a debounced version of the selected viewer state.
 * @param selector A selector function that selects a subset of the viewer state
 * to debounce. Automatically wrapped with `useShallow` for shallow comparison
 * of selected state.
 * @param delayMs The default debounce delay, in milliseconds, to apply to all selected properties.
 * @param propertyDelayMs Property-specific delay overrides. Use this to increase the debounce for certain values.
 * @returns
 */
export const useViewerStateStoreDebounced = <T extends Partial<ViewerStore>>(
  selector: (state: ViewerStore) => T,
  delayMs: number,
  propertyDelayMs: Partial<Record<keyof T, number>> = {}
): [T, boolean] => {
  const propertyTimeouts = useRef<Partial<Record<keyof T, NodeJS.Timeout>>>({});
  const pendingValues = useRef<Partial<T>>({});
  const propertyDelayMsRef = useRef(propertyDelayMs);
  propertyDelayMsRef.current = propertyDelayMs;

  const rawState = useViewerStateStore(useShallow(selector));
  // Represents current, "old" value.
  const [debouncedState, setDebouncedState] = useState(rawState);

  // Detect changes in the selected state vs. debounced state.
  useEffect(() => {
    const valuesToUpdate: Partial<T> = {};

    for (const key in rawState) {
      if (debouncedState[key] !== rawState[key]) {
        const propertyDelayMs = propertyDelayMsRef.current[key] ?? delayMs;

        if (propertyDelayMs === 0) {
          // If 0 delay is set, queue for update.
          valuesToUpdate[key] = rawState[key];
          continue;
        } else if (pendingValues.current[key] !== rawState[key]) {
          // Value has changed from pending state or has been newly set; start a
          // new timeout to update the debounced state.
          pendingValues.current[key] = rawState[key];
          // Clear the existing timeout
          if (propertyTimeouts.current[key]) {
            clearTimeout(propertyTimeouts.current[key]);
          }
          propertyTimeouts.current[key] = setTimeout(() => {
            setDebouncedState((prevState) => ({
              ...prevState,
              [key]: pendingValues.current[key],
            }));
            // Clear the pending value and timeout for this property
            delete pendingValues.current[key];
            clearTimeout(propertyTimeouts.current[key]);
            delete propertyTimeouts.current[key];
          }, propertyDelayMs);
        }
      }
    }
    // Update any values that have a 0 delay immediately.
    if (Object.values(valuesToUpdate).length > 0) {
      setDebouncedState((prevState) => ({
        ...prevState,
        ...valuesToUpdate,
      }));
    }
  }, [rawState, delayMs, propertyDelayMs]);

  const isDebouncePending = Object.keys(pendingValues.current).length > 0;

  return [debouncedState, isDebouncePending];
};
