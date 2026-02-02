import React, { type ReactElement, type ReactNode, useMemo } from "react";
import styled from "styled-components";

import type { ShortcutKeyInfo } from "src/constants";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { capitalizeFirstLetter, insertBetweenElements } from "src/utils/formatting";

const keycodeToDisplay: Record<string, string> = {
  left: "←",
  right: "→",
  ctrl: "Ctrl",
  control: "Ctrl",
  meta: "Cmd (⌘)",
  alt: "Alt",
  option: "Option (⌥)",
  shift: "Shift",
  space: "Space",
};

/** Adds a rounded box around a key, to style it like a keyboard key. */
export const KeyCharacter = styled.span`
  padding: 0px 4px;
  border-radius: 4px;
  background-color: var(--color-viewport-overlay-background);
  border: 1px solid var(--color-viewport-overlay-outline);
  min-width: 12px;
  text-align: center;
`;

type ShortcutKeyDisplayProps = {
  shortcutKey: ShortcutKeyInfo;
  inline?: boolean;
};

/** Converts a hotkey string into a formatted React element with styled keys. */
function toHotkeyDisplay(key: string): ReactElement {
  // Ex: "ctrl+shift+a" will be split into KeyCharacter elements with a "+"
  // character between each.
  const keys = key.split("+").map((k) => k.trim());
  const hotkeyElements = keys.map((k, index) => {
    const hotkeyDisplayName = keycodeToDisplay[k.toLowerCase()] || capitalizeFirstLetter(k);
    // Keys are 2*index because hotkey elements will be interspersed with "+" elements
    return <KeyCharacter key={2 * index}>{hotkeyDisplayName}</KeyCharacter>;
  });
  const elements = insertBetweenElements(hotkeyElements, (index) => <span key={index}>+</span>);
  return <FlexRowAlignCenter $gap={4}>{elements}</FlexRowAlignCenter>;
}

/**
 * Displays the name and hotkey(s) of a keyboard shortcut.
 *
 * Hotkeys involving multiple keys that are pressed at once will be displayed
 * with plus signs between keys. If a shortcut has multiple alternative hotkeys,
 * they can be displayed either stacked vertically or inline (set
 * `inline={true}`) .
 */
export default function ShortcutKeyText(props: ShortcutKeyDisplayProps): ReactElement {
  const { shortcutKey, inline } = props;
  const { name, keycode, keycodeDisplay } = shortcutKey;

  const hotkeyElements: ReactNode = useMemo(() => {
    // Get hotkeys to display; the `keycodeDisplay` property overrides automatic
    // `keycode` parsing.
    let keycodeArray: string[];
    if (keycodeDisplay) {
      keycodeArray = Array.isArray(keycodeDisplay) ? keycodeDisplay : [keycodeDisplay];
    } else if (keycode) {
      keycodeArray = Array.isArray(keycode) ? keycode : keycode.split(",").map((k) => k.trim());
    } else {
      keycodeArray = [];
    }

    let hotkeyElements: ReactNode = keycodeArray.map(toHotkeyDisplay);
    if (inline) {
      hotkeyElements = insertBetweenElements(hotkeyElements, <span>/</span>);
    }
    return hotkeyElements;
  }, [keycode, keycodeDisplay, inline]);

  return (
    <FlexRow style={{ justifyContent: "space-between", width: "100%" }} $gap={12}>
      <FlexRow style={{ marginTop: 1 }}>{name}</FlexRow>
      <FlexColumn
        $gap={4}
        // Change to row if inline
        style={{ justifyContent: "flex-end", alignItems: "flex-end", flexDirection: props.inline ? "row" : "column" }}
      >
        {hotkeyElements}
      </FlexColumn>
    </FlexRow>
  );
}
