// TODO: Replace with a shortcut key library like https://www.npmjs.com/package/hotkeys-js
import { useEffect, useState } from "react";

export function useShortcutKey(
  key: string | string[],
  onPress?: (e: KeyboardEvent) => void,
  onRelease?: (e: KeyboardEvent) => void
): boolean {
  // TODO: Currently, this adds new event listeners for every use of
  // useShortcutKey. Can we have a single global listener instead?

  const [isPressed, setIsPressed] = useState(false);
  const keys = Array.isArray(key) ? key : [key];
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (keys.includes(e.key)) {
        setIsPressed(true);
        onPress?.(e);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (keys.includes(e.key)) {
        setIsPressed(false);
        onRelease?.(e);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [key, onPress, onRelease]);

  return isPressed;
}
