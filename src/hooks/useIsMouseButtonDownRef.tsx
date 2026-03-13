import type React from "react";
import { useEffect, useRef } from "react";

/** Returns a ref that tracks whether the specified mouse button is held. */
export const useIsMouseButtonDownRef = (mouseButton: number = 0): React.MutableRefObject<boolean> => {
  const isMouseButtonDownRef = useRef<boolean>(false);

  useEffect(() => {
    isMouseButtonDownRef.current = false;
    const onMouseDown = (event: MouseEvent): void => {
      if (event.button === mouseButton) {
        isMouseButtonDownRef.current = true;
      }
    };
    const onMouseUp = (event: MouseEvent): void => {
      if (event.button === mouseButton) {
        isMouseButtonDownRef.current = false;
      }
    };
    const onWindowFocus = (): void => {
      isMouseButtonDownRef.current = false;
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [mouseButton]);

  return isMouseButtonDownRef;
};
