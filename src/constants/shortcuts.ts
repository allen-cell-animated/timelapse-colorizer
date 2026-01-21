/**
 * Shortcut keycodes used throughout TFE. Shortcuts can be:
 *   - A single keycode string, e.g. " " for spacebar.
 *   - An array of keycode strings, representing a combination of keys to be
 *     pressed together, e.g. `["Control", "a"]`. The last keycode will be
 *     treated as a trigger, and the previous keycodes will be treated as
 *     modifier keys that must be pressed first.
 *   - An array of array of keycode strings, representing multiple alternate
 *     keycodes for the same action. Each child array will be treated as a
 *     combination of keys, as above. ex: `[["ArrowLeft"], ["Shift", "L"]]` will
 *     trigger an action when either the left arrow key is pressed, or when
 *     Shift + L are pressed together.
 *
 * See
 * https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * for a list of valid keycode strings.
 */
export const ShortcutKeycode = {
  viewport: {
    multiTrackSelect: [["Control"], ["Meta"]],
  },
  playback: {
    toggle: " ",
    stepBack: [["ArrowLeft"], ["Left"]],
    stepForward: [["ArrowRight"], ["Right"]],
  },
  annotation: {
    reuseValue: "Alt",
    selectRange: "Shift",
    // Not yet implemented
    enable: ["Alt", "a"],
  },
  navigation: {
    showShortcutMenu: "?",
  },
} as const;

type ValueOf<T> = T extends readonly unknown[] ? T[number] : T[keyof T];
type NestedValuesOf<T> = T extends object ? ValueOf<{ [K in keyof T]: NestedValuesOf<T[K]> }> : T;

type ShortcutKeycodes = NestedValuesOf<typeof ShortcutKeycode>;

const ShortcutKeyDisplayName: Record<ShortcutKeycodes, string> = {
  Control: "Ctrl / command (⌘)",
  Meta: "Command (⌘)",
  Alt: "Alt / option (⌥)",
  Shift: "Shift",
  " ": "Space",
  ArrowLeft: "←",
  Left: "←",
  ArrowRight: "→",
  Right: "→",
  "?": "?",
  a: "A",
};

type ValueOfExcludeArrays<T> = T extends readonly unknown[] ? T : T[keyof T];
/** Preserves arrays */
type NestedValuesOfExcludeArrays<T> = T extends object
  ? ValueOfExcludeArrays<{ [K in keyof T]: NestedValuesOfExcludeArrays<T[K]> }>
  : T;

// Required because TypeScript `Array.isArray` type guard does not handle
// readonly arrays. https://github.com/microsoft/TypeScript/issues/17002
declare global {
  interface ArrayConstructor {
    isArray(arg: any): arg is readonly any[];
  }
}

export const getShortcutDisplayText = (keycode: NestedValuesOfExcludeArrays<typeof ShortcutKeycode>): string => {
  if (Array.isArray(keycode)) {
    const firstCode = keycode[0];
    if (Array.isArray(firstCode)) {
      // An array of multiple alternate keycodes. Return just the first one.
      // TODO: Print alternates on multiple lines
      return firstCode.map((code) => ShortcutKeyDisplayName[code]).join(" + ");
    } else {
      // A combination of keycodes to be pressed together.
      return (keycode as readonly ShortcutKeycodes[]).map((code) => ShortcutKeyDisplayName[code]).join(" + ");
    }
  } else {
    return ShortcutKeyDisplayName[keycode];
  }
};
