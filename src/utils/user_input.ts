import { isHotkeyPressed } from "react-hotkeys-hook";

/**
 * Checks if any of the specified hotkey combinations are currently pressed,
 * using the `react-hotkeys-hook` library syntax for `useHotkey`.
 * @param keycodes - A string or array of strings representing the hotkey
 * combinations to check. This can be a single keycode (e.g., "a"), multiple
 * keycodes separated by commas (e.g., "ctrl+a,meta+a"), or an array of keycode
 * strings.
 * @returns True if any of the specified hotkey combinations are currently
 * pressed, false otherwise.
 */
export function areAnyHotkeysPressed(keycodes: string | string[]): boolean {
  keycodes = Array.isArray(keycodes) ? keycodes : keycodes.split(",").map((kc) => kc.trim());
  return keycodes.some((keycode) => isHotkeyPressed(keycode, "+"));
}
