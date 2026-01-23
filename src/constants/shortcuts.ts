export type ShortcutKeyInfo = {
  name: string;
  /**
   * Keycodes formatted for the `react-hotkeys-hook` library. See
   * https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage
   * for details. If `null`, the shortcut is not bound to any key (usually for
   * mouse actions).
   *
   * @example
   * ```text
   * "a" => triggers on "a" key press.
   * "ctrl+shift+a" => triggers on "Ctrl + Shift + A" key press.
   * "a,b" => triggers on either "a" or "b" key press.
   * "a>b" => triggers when a and b are pressed in sequence.
   * ```
   */
  keycode: string | string[] | null;
  /**
   * Display string(s) for the shortcut key. If not provided, `keycode` will
   * be used instead.
   */
  keycodeDisplay?: string | string[];
};

export const ShortcutKeys = {
  viewport: {
    stepFrameForward: {
      name: "Step frame forward",
      keycode: "right",
    },
    stepFrameBackward: {
      name: "Step frame backwards",
      keycode: "left",
    },
    togglePlayback: {
      name: "Toggle playback",
      keycode: "space",
    },
    select: {
      name: "Select track",
      keycode: null,
      keycodeDisplay: "Left click",
    },
    multiTrackSelect: {
      name: "Select multiple tracks",
      keycode: ["ctrl", "meta"],
      keycodeDisplay: ["Ctrl + Left click", "Command (⌘) + Left click"],
    },
    zoomViewport: {
      name: "Zoom viewport (also trackpad pinch)",
      keycode: null,
      keycodeDisplay: "Ctrl + Scroll wheel",
    },
    panViewport: {
      name: "Pan viewport",
      keycode: null,
      keycodeDisplay: "Left click drag",
    },
  },
  annotation: {
    reuseValue: { name: "Reuse last integer value", keycode: "alt, option" },
    selectRange: { name: "Select range", keycode: "shift" },
  },
  navigation: {
    showShortcutMenu: { name: "Show this menu", keycode: ["shift+slash", "?"], keycodeDisplay: "?" },
  },
} as const satisfies Record<string, Record<string, ShortcutKeyInfo>>;
