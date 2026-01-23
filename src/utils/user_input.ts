import { isHotkeyPressed } from "react-hotkeys-hook";

/**
 * Checks if any of the specified hotkey combinations are currently pressed.
 * Wrapper around `isHotkeyPressed` to handle multiple alternate keycodes.
 */
export function areAnyHotkeysPressed(keycodes: string | string[]): boolean {
  keycodes = Array.isArray(keycodes) ? keycodes : keycodes.split(",").map((kc) => kc.trim());
  return keycodes.some((keycode) => isHotkeyPressed(keycode, "+"));
}
