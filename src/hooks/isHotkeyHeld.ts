import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { areAnyHotkeysPressed } from "src/utils/user_input";

/**
 * Returns whether a hotkey is currently held. Triggers state updates on change.
 * @param hotkey The hotkey or array of hotkeys to check. Uses the
 * `react-hotkeys-hook` keycode format.
 * @returns True if the hotkey is currently held, false otherwise.
 */
export const useIsHotkeyHeld = (hotkey: string | string[]): boolean => {
  // Slight hack here. The hook uses `useHotkeys` to trigger state updates on
  // keydown and keyup events, but uses `areAnyHotkeysPressed` (which is a
  // wrapper around `isHotkeyPressed`) to get the current state of the hotkeys.
  const [, setIsHotkeyPressed] = useState(false);
  useHotkeys(hotkey, () => setIsHotkeyPressed(true), { keydown: true });
  useHotkeys(hotkey, () => setIsHotkeyPressed(false), { keyup: true });

  return areAnyHotkeysPressed(hotkey);
};
