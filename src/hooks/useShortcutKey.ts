// TODO: Replace with a shortcut key library like https://www.npmjs.com/package/react-hotkeys-hook
import { useEffect, useRef, useState } from "react";

/** Global singleton map containing all the  */
const globalIsPressed = new Map<string, boolean>();

type KeyInput = string | readonly string[] | readonly (readonly string[])[];

function isKeyCombinationPressed(key: KeyInput, currentKey: string, isPressed: Map<string, boolean>): boolean {
  let keycodeAliases: readonly (readonly string[])[];
  if (Array.isArray(key)) {
    if (Array.isArray(key[0])) {
      // Array of arrays represents multiple alternate keycode aliases
      keycodeAliases = key as string[][];
    } else {
      // Array represents combination of keycodes
      keycodeAliases = [key as string[]];
    }
  } else {
    keycodeAliases = [[key]];
  }

  for (const keycodeCombination of keycodeAliases) {
    let areAllKeysPressed = true;
    const triggerKey = keycodeCombination[keycodeCombination.length - 1];
    if (currentKey !== triggerKey) {
      continue;
    }
    for (const key of keycodeCombination) {
      if (!isPressed.get(key)) {
        areAllKeysPressed = false;
        break;
      }
    }
    if (areAllKeysPressed) {
      return true;
    }
  }
  return false;
}

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
  key: KeyInput,
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
      globalIsPressed.set(e.key, true);
      if (isKeyCombinationPressed(key, e.key, globalIsPressed)) {
        setIsPressed(true);
        onPressCallbackRef.current?.(e);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      globalIsPressed.set(e.key, false);
      if (!isKeyCombinationPressed(key, e.key, globalIsPressed)) {
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
