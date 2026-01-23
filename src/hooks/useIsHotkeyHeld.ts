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
  const [isHotkeyHeld, setIsHotkeyHeld] = useState(areAnyHotkeysPressed(hotkey));
  useHotkeys(hotkey, () => setIsHotkeyHeld(true), { keydown: true });
  useHotkeys(hotkey, () => setIsHotkeyHeld(false), { keyup: true });

  return isHotkeyHeld;
};
