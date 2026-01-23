import React, { type ReactElement, type ReactNode } from "react";

import type { ShortcutKeyInfo } from "src/constants";
import { HotkeyText } from "src/styles/components";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";
import { insertBetweenElements } from "src/utils/formatting";

const keycodeToDisplay: Record<string, string> = {
  left: "←",
  right: "→",
  control: "Ctrl",
  meta: "Cmd (⌘)",
  alt: "Alt",
  option: "Option (⌥)",
  shift: "Shift",
  space: "Space",
};

type ShortcutKeyDisplayProps = {
  shortcutKey: ShortcutKeyInfo;
  inline?: boolean;
};

function toHotkeyDisplay(key: string): ReactElement {
  const keys = key.split("+").map((k) => k.trim());
  const hotkeyElements = keys.map((k, index) => {
    const hotkeyDisplayName = keycodeToDisplay[k.toLowerCase()] || k;
    return <HotkeyText key={2 * index}>{hotkeyDisplayName}</HotkeyText>;
  });
  const elements = insertBetweenElements(hotkeyElements, <span>+</span>);
  return <FlexRowAlignCenter $gap={4}>{elements}</FlexRowAlignCenter>;
}

export default function ShortcutKeyText(props: ShortcutKeyDisplayProps): ReactElement {
  const { shortcutKey } = props;
  const { name, keycode, keycodeDisplay } = shortcutKey;
  let keycodeArray: string[];
  if (keycodeDisplay) {
    keycodeArray = Array.isArray(keycodeDisplay) ? keycodeDisplay : [keycodeDisplay];
  } else if (keycode) {
    keycodeArray = Array.isArray(keycode) ? keycode : keycode.split(",").map((k) => k.trim());
  } else {
    keycodeArray = [];
  }
  let hotkeyElements: ReactNode = keycodeArray.map(toHotkeyDisplay);
  if (props.inline) {
    hotkeyElements = insertBetweenElements(hotkeyElements, <span>/</span>);
  }

  return (
    <FlexRow style={{ justifyContent: "space-between", width: "100%" }} $gap={12}>
      <FlexRow style={{ marginTop: 1 }}>{name}</FlexRow>
      <FlexColumn
        $gap={4}
        style={{ justifyContent: "flex-end", alignItems: "flex-end", flexDirection: props.inline ? "row" : "column" }}
      >
        {hotkeyElements}
      </FlexColumn>
    </FlexRow>
  );
}
