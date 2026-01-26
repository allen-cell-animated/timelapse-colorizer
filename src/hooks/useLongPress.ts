import { MouseEventHandler, useCallback, useEffect, useRef } from "react";

/**
 * Returns mouse handler methods for long-press left-click interactions on
 * elements. When the element is pressed and held for `initialDelay`
 * milliseconds, the `onHeld` callback will be called. It will then be called on
 * repeat every `repeatDelay` milliseconds until the element is released, and
 * then the optional `onReleased` callback will be called.
 *
 * @param element HTML element to attach long-press handling to.
 * @param onHeld Callback to be called when the element is held down.
 * @param onReleased Optional callback to be called when the element is
 * released.
 * @param initialDelayMs Initial delay in milliseconds before onHeld is called.
 * Default is 500ms.
 * @param repeatDelayMs Repeat delay in milliseconds between subsequent onHeld
 * calls. Default is 40ms.
 * @returns Object containing onMouseDown and onMouseUp handlers to be attached
 * to a React element.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [count, setCount] = useState(0);
 *   const increment = useCallback(() => { setCount(c => c + 1); }, [setCount]);
 *   const reset = useCallback(() => { setCount(0); }, [setCount]);
 *
 *   const incrementProps = useLongPress(increment, reset);
 *
 *   return (<div>
 *     <span>{count}</span>
 *     <button {...incrementProps}>Increment</button>
 *   </div>);
 * }
 * ```
 */
const useLongPress = (
  onHeld: () => void,
  onReleased?: () => void,
  initialDelayMs = 500,
  repeatDelayMs = 40
): { onMouseDown: MouseEventHandler<Element>; onMouseUp: MouseEventHandler<Element> } => {
  const isHeld = useRef(false);
  const onHeldCallbackRef = useRef(onHeld);
  const onReleasedCallbackRef = useRef(onReleased);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use refs to avoid recreating event handlers in case onHeld/onReleased are
  // not memoized (recreated each render).
  onHeldCallbackRef.current = onHeld;
  onReleasedCallbackRef.current = onReleased;

  /**
   * Called the first time the button is held down, and initiates the repeat
   * interval.
   */
  const triggerOnHeld = useCallback((): void => {
    onHeldCallbackRef.current();
    repeatIntervalRef.current = setInterval(() => {
      onHeldCallbackRef.current();
    }, repeatDelayMs);
  }, [repeatDelayMs]);

  /** If repeatDelayMs changes, reset the interval with the new delay. */
  useEffect(() => {
    if (repeatIntervalRef.current !== null) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = setInterval(() => {
        onHeldCallbackRef.current();
      }, repeatDelayMs);
    }
  }, [repeatDelayMs]);

  /** Start initial timeout. */
  const onMouseDown = useCallback(
    (event: { button: number }): void => {
      if (event.button !== 0) {
        return;
      }
      initialTimeoutRef.current = setTimeout(() => {
        triggerOnHeld();
      }, initialDelayMs);
      isHeld.current = true;
    },
    [initialDelayMs, triggerOnHeld]
  );

  /** Cancel timeout + intervals, call onReleased if button held. */
  const onMouseUp = useCallback((event: { button: number }): void => {
    if (event.button !== 0) {
      return;
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    if (isHeld.current && onReleasedCallbackRef.current) {
      onReleasedCallbackRef.current();
    }
    isHeld.current = false;
  }, []);

  return { onMouseDown, onMouseUp };
};

export { useLongPress };
