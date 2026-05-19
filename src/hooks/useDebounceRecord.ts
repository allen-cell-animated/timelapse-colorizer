import { useEffect, useRef, useState } from "react";

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Custom hook that returns a debounced version of a record of values, where
 * each property is debounced independently.
 */
export const useDebounceRecord = <T extends Record<string, any>>(record: T, delayMs: number): [T, boolean] => {
  const prevRecordRef = useRef(record);
  const timeoutRef = useRef<Partial<Record<keyof T, TimeoutHandle>>>({});
  const [state, setState] = useState(record);

  useEffect(() => {
    // Start a timeout for each property that has changed
    for (const key in record) {
      const value = record[key];

      if (value !== prevRecordRef.current[key]) {
        const currentTimeout = timeoutRef.current[key];
        if (currentTimeout !== undefined) {
          clearTimeout(currentTimeout);
        }

        timeoutRef.current[key] = setTimeout(() => {
          setState((currentState) => ({
            ...currentState,
            [key]: value,
          }));
          delete timeoutRef.current[key];
        }, delayMs);
      }
    }
    prevRecordRef.current = record;
  }, [record, delayMs]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(timeoutRef.current)) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const hasPendingValues = Object.values(timeoutRef.current).length > 0;
  return [state, hasPendingValues];
};
