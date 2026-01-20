// TODO: Replace with a shortcut key library like https://www.npmjs.com/package/react-hotkeys-hook
import { useEffect, useRef, useState } from "react";

/**
 * Hook to listen for and handle shortcut key presses. Shortcut keys are ignored
 * if the user is currently focused on an input element.
 * @param key Keycode or array of keycode to listen for, as defined by
 * KeyboardEvent.key. See
 * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key#value and
 * https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values.
 * @param onPress Callback function to execute when the key is pressed down.
 * @param onRelease Callback function to execute when the key is released.
 * @returns a boolean indicating whether the key is currently pressed.
 */
export function useShortcutKey(
  key: string | string[],
  onPress?: (e: KeyboardEvent) => void,
  onRelease?: (e: KeyboardEvent) => void
): boolean {
  // TODO: Currently, this adds new event listeners for every use of
  // useShortcutKey. Can we have a single global listener instead?
  const onPressCallbackRef = useRef(onPress);
  const onReleaseCallbackRef = useRef(onRelease);
  onPressCallbackRef.current = onPress;
  onReleaseCallbackRef.current = onRelease;

  const [isPressed, setIsPressed] = useState(false);
  const keys = Array.isArray(key) ? key : [key];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (keys.includes(e.key)) {
        setIsPressed(true);
        onPressCallbackRef.current?.(e);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      if (keys.includes(e.key)) {
        setIsPressed(false);
        onReleaseCallbackRef.current?.(e);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [key]);

  return isPressed;
}
