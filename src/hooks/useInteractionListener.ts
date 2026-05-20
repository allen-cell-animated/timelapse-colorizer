import { useEffect, useRef } from "react";

const SCROLL_PLAYBACK_TIMEOUT_MS = 250;

/**
 * Calls the provided callbacks when the user starts interacting with
 * or stops interacting with the provided element. Interactions include
 * mouse clicks and scrolls.
 */
export const useInteractionListener = (
  element: HTMLElement | null,
  onInteractionStart: () => void,
  onInteractionEnd: () => void
): void => {
  const numInteractionsRef = useRef(0);

  const heldMouseButtonsRef = useRef<Set<number>>(new Set());
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef = useRef(onInteractionEnd);
  onInteractionStartRef.current = onInteractionStart;
  onInteractionEndRef.current = onInteractionEnd;

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onInitiatedInteraction = (): void => {
    if (numInteractionsRef.current === 0) {
      onInteractionStartRef.current();
    }
    numInteractionsRef.current += 1;
  };

  const onEndedInteraction = (): void => {
    numInteractionsRef.current = Math.max(numInteractionsRef.current - 1, 0);
    if (numInteractionsRef.current === 0) {
      onInteractionEndRef.current();
    }
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (heldMouseButtonsRef.current.has(event.button)) {
      return;
    }
    heldMouseButtonsRef.current.add(event.button);
    onInitiatedInteraction();
  };

  const onMouseUp = (event: MouseEvent): void => {
    if (!heldMouseButtonsRef.current.has(event.button)) {
      return;
    }
    heldMouseButtonsRef.current.delete(event.button);
    onEndedInteraction();
  };

  const onScroll = (): void => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    } else {
      onInitiatedInteraction();
    }
    scrollTimeoutRef.current = setTimeout(() => {
      onEndedInteraction();
      scrollTimeoutRef.current = null;
    }, SCROLL_PLAYBACK_TIMEOUT_MS);
  };

  // Setup listeners

  useEffect(() => {
    if (!element) {
      return;
    }

    element.addEventListener("mousedown", onMouseDown);
    // Mouse up events are listened to on the window in case the user releases
    // the mouse button outside the element.
    window.addEventListener("mouseup", onMouseUp);
    element.addEventListener("wheel", onScroll);

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      element.removeEventListener("wheel", onScroll);
    };
  }, [element]);

  // Clear all events if the window loses focus
  useEffect(() => {
    const handleBlur = (): void => {
      numInteractionsRef.current = 0;
      onInteractionEndRef.current();
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);
};
