import { useCallback, useRef, useState } from "react";

type ValueOrFunction<T> = T | ((prevState: T) => T);

/**
 * Allows the most recent state value to be accessed with a getter function,
 * even in callbacks.
 * @param initialValue Initial default value
 * @returns A tuple of a getter function and a setter function for the state
 * value.
 */
export const useStateWithGetter = <T>(initialValue: T): [() => T, (value: ValueOrFunction<T>) => void] => {
  const [, setState] = useState(initialValue);
  const stateRef = useRef(initialValue);

  const setStateWrapped = useCallback((value: ValueOrFunction<T>) => {
    if (typeof value === "function") {
      value = (value as (prevState: T) => T)(stateRef.current);
    }
    stateRef.current = value;
    setState(value);
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  return [getState, setStateWrapped];
};
