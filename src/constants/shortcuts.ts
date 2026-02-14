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
   * ["a", "b"] => triggers on either "a" or "b" key press.
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

export const SHORTCUT_KEYS = {
  viewport: {
    stepFrameForward: {
      name: "Step frame forward",
      keycode: "right",
    },
    stepFrameBackward: {
      name: "Step frame backward",
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
      keycode: "ctrl,meta",
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
  backdrops: {
    cycleForward: {
      name: "Show next backdrop/channel",
      keycode: ["period", ">", "shift+period"],
      keycodeDisplay: [".", ">"],
    },
    cycleBackward: {
      name: "Show previous backdrop/channel",
      keycode: ["comma", "<", "shift+comma"],
      keycodeDisplay: [",", "<"],
    },
    showChannel: {
      name: "Toggle backdrop/channel by number",
      keycode: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      keycodeDisplay: "1-9",
    },
  },
  annotation: {
    selectRange: { name: "Select range", keycode: "shift" },
    // TODO: Alt is used for other shortcuts in Chrome (by default, it focuses the menu bar when released).
    // Is there another modifier key that works better?
    reuseValue: { name: "Reuse last value", keycode: "alt,option" },
  },
  navigation: {
    showShortcutMenu: { name: "Show keyboard shortcuts", keycode: "shift+slash,?", keycodeDisplay: "?" },
  },
} as const satisfies Record<string, Record<string, ShortcutKeyInfo>>;
