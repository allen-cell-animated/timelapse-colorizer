import { type RefObject, useCallback, useEffect, useRef } from "react";

/**
 * Adds long-press handling to buttons. When the button is pressed and held for
 * `initialDelay` milliseconds, the `onHeld` callback will be called. It will
 * then be called on repeat every `repeatDelay` milliseconds until the button is
 * released, and then the optional `onReleased` callback will be called.
 *
 * @param buttonRef HTML button element ref
 * @param onHeld Callback to be called when the button is held down.
 * @param onReleased Optional callback to be called when the button is released.
 * @param initialDelayMs Initial delay in milliseconds before onHeld is called.
 * Default is 500ms.
 * @param repeatDelayMs Repeat delay in milliseconds between subsequent onHeld
 * calls. Default is 40ms.
 */
const useLongPress = (
  buttonRef: RefObject<HTMLButtonElement>,
  onHeld: () => void,
  onReleased?: () => void,
  initialDelayMs = 500,
  repeatDelayMs = 40
): void => {
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
  const onMouseDown = useCallback((): void => {
    initialTimeoutRef.current = setTimeout(() => {
      triggerOnHeld();
    }, initialDelayMs);
    isHeld.current = true;
  }, [initialDelayMs, triggerOnHeld]);

  /** Cancel timeout + intervals, call onReleased if button held. */
  const onMouseUp = useCallback((): void => {
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

  useEffect(() => {
    const buttonEl = buttonRef.current;
    if (!buttonEl) {
      return;
    }
    buttonEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      buttonEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [buttonRef.current, onMouseDown, onMouseUp]);
};

export { useLongPress };
