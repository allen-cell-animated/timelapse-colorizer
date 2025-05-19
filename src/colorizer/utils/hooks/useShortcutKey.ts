// TODO: Replace with a shortcut key library like https://www.npmjs.com/package/hotkeys-js
import { useEffect, useState } from "react";

export function useShortcutKey(key: string): boolean {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const onKeyDown = ({ key: pressedKey }: KeyboardEvent): void => {
      if (pressedKey === key) {
        setIsPressed(true);
      }
    };
    const onKeyUp = ({ key: pressedKey }: KeyboardEvent): void => {
      if (pressedKey === key) {
        setIsPressed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return isPressed;
}
