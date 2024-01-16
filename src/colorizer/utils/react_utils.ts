import React, { EventHandler, useEffect, useRef, useState } from "react";

/**
 * Delays changes to a value until no changes have occurred for the
 * set delay period, in milliseconds. This is useful for delaying changes to state
 * when a value may update very quickly.
 *
 * Adapted from https://usehooks-ts.com/react-hook/use-debounce.
 *
 * @param value The value to return.
 * @param delayMs The delay, in milliseconds.
 * @returns The `value` once no changes have occurred for `delay` milliseconds.
 * @example
 * ```
 * const [value, setValue] = useState(0);
 * const debouncedValue = useDebounce(value, 500);
 *
 * useEffect(() => {
 *  // Some expensive operation
 * }, [debouncedValue])
 *
 * return(
 *  <div>
 *      <p>{debouncedValue}</p>
 *  </div>
 * )
 * ```
 */
export function useDebounce<T>(value: T, delayMs?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Combines useTransition and useDebounce. Debounces value and initiates a state transition once the value has come
 * to rest.
 * @param inputValue The value to debounce and transition.
 * @param startTransition The startTransition function returned by useTransition.
 * @param onChange An optional callback that triggers when the debounced value changes, but before the transition.
 * @param delayMs The delay, in milliseconds. 500 ms by default.
 */
export function useTransitionedDebounce<T>(
  inputValue: T,
  startTransition: React.TransitionStartFunction,
  onChange: () => void = () => {},
  delayMs: number = 500
) {
  const [value, setValue] = useState<T>(inputValue);
  const debouncedValue = useDebounce(inputValue, delayMs);

  // Only update value when the debounced value has changed.
  useEffect(() => {
    onChange();
    startTransition(() => {
      setValue(debouncedValue);
    });
  }, [debouncedValue]);

  return value;
}

/**
 * Returns a reference to a constructed value that will not be re-computed between renders.
 *
 * Functionally, this is a wrapper around useRef and allows it to be used in a type-safe way.
 * See https://react.dev/reference/react/useRef for more details.
 *
 * @param constructor A callback used to assign the value. This will only be called once.
 * @returns The value as returned by the constructor.
 * @example
 * ```
 * const value = useConstructor(() => {return new ValueConstructor()});
 * ```
 */
export function useConstructor<T>(constructor: () => T): T {
  const value = useRef<T | null>(null);
  if (value.current === null) {
    value.current = constructor();
  }
  return value.current;
}

/** Returns a shallow copy of an object, excluding all entries where the value is undefined. */
export function excludeUndefinedValues<T extends Object>(obj: T): Partial<T> {
  const ret = {} as Partial<T>;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

/**
 * Hook for adding scroll shadows to an element.
 *
 * Adapted with edits from https://medium.com/dfind-consulting/react-scroll-hook-with-shadows-9ba2d47ae32.
 * Added typing and fixed a bug where shadows would not appear before users interacted with the element, and
 * another where shadows would not disappear when the element was not scrollable.
 *
 * @param shadowColor a CSS-interpretable string representing a color.
 * @returns an object with three properties:
 * - `scrollShadowStyle`: a CSSProperties object that can be applied to the element to add a shadow. NOTE:
 * This does not have to be the scrolling element; see the example for an overlay shadow.
 * - `onScrollHandler`: an event handler to attach to the scrolling element's `onScroll` event.
 * - `scrollRef`: a ref to attach to the scrolling element.
 *
 * @example
 * ```
 * function MyComponent() {
 *   const { scrollShadowStyle, onScrollHandler, scrollRef } = useScrollShadow();
 *
 *   return (
 *   <div style={{maxHeight: "50px", position: "relative"}}>
 *     <div
 *       ref={scrollRef}
 *       onScroll={onScrollHandler}
 *       style={{overflow-y: "auto", height: "100%"}}
 *     >
 *       <p>Some content</p>
 *       <p>Some more content</p>
 *       <p>Some more content</p>
 *     </div>
 *     <div style={{
 *       // This div applies the shadow and exists above the scrolling element.
 *       width: "100%",
 *       height: "100%",
 *       position: "absolute",
 *       top: 0,
 *       pointerEvents: "none",
 *       ...scrollShadowStyle
 *     }} />
 *   </div>
 * }
 * ```
 */
export function useScrollShadow(shadowColor: string = "#00000030"): {
  scrollShadowStyle: React.CSSProperties;
  onScrollHandler: EventHandler<any>;
  scrollRef: React.RefObject<HTMLDivElement>;
} {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const updateScrollInfo = (div: HTMLDivElement): void => {
    setScrollTop(div.scrollTop);
    setScrollHeight(div.scrollHeight);
    setClientHeight(div.clientHeight);
  };

  const mutationObserver = useConstructor(
    () =>
      new MutationObserver(() => {
        if (scrollRef.current) {
          updateScrollInfo(scrollRef.current);
        }
      })
  );

  const onScrollHandler: EventHandler<any> = (event) => {
    updateScrollInfo(event.target);
  };

  // Update shadows before first interaction
  useEffect(() => {
    if (scrollRef.current) {
      updateScrollInfo(scrollRef.current);

      mutationObserver.observe(scrollRef.current, {
        childList: true,
        subtree: true,
      });

      return () => {
        mutationObserver.disconnect();
      };
    }
    return;
  }, []);

  function getBoxShadow(): string {
    const scrolledToBottom = clientHeight === scrollHeight - scrollTop;
    const scrolledToTop = scrollTop === 0;
    const scrolledBetween = scrollTop > 0 && clientHeight < scrollHeight - scrollTop;

    const showBottom = (scrolledToTop && !scrolledToBottom) || scrolledBetween;
    const showTop = (scrolledToBottom && !scrolledToTop) || scrolledBetween;
    const topShadowOffset = showTop ? "8px" : "0px";
    const bottomShadowOffset = showBottom ? "-8px" : "0px";

    const top = `inset 0 ${topShadowOffset} 5px -5px ${shadowColor}`;
    const bottom = `inset 0 ${bottomShadowOffset} 5px -5px ${shadowColor}`;
    return `${top}, ${bottom}`;
  }

  return { scrollShadowStyle: { boxShadow: getBoxShadow() }, onScrollHandler, scrollRef };
}
