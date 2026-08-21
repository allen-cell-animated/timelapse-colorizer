import { useCallback, useRef, useState } from "react";

type ValueOrFunction<T> = T | ((prevState: T) => T);

export const useStateWithGetter = <T>(initialValue: T): [() => T, (value: ValueOrFunction<T>) => void] => {
  const [state, setState] = useState(initialValue);
  const stateRef = useRef(state);

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
