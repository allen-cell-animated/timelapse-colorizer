import { useEffect, useState } from "react";
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

  // Handle case where the keyup event is missed if the user switches to another
  // window or tab; check for key state when window is focused again.
  useEffect(() => {
    const onFocus = () => {
      setIsHotkeyHeld(areAnyHotkeysPressed(hotkey));
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [hotkey]);

  return isHotkeyHeld;
};
