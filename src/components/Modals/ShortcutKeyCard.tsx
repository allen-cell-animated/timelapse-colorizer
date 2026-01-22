import { Card } from "antd";
import React, { ReactElement } from "react";
import styled from "styled-components";

import { ShortcutKeyInfo } from "src/constants";
import { HotkeyText } from "src/styles/components";
import { FlexColumn, FlexRow, FlexRowAlignCenter } from "src/styles/utils";

const ShortcutList = styled(Card)`
  & .ant-card-head {
    background-color: var(--color-background-alt);
  }

  & .ant-card-body {
    & > div::after {
      content: "";
      flex: 1;
      width: "100%";
      margin-left: 1rem;
      height: 1px;
      background-color: #000;
    }
  }
`;

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
};

function toHotkeyDisplay(key: string): ReactElement {
  const keys = key.split("+").map((k) => k.trim());
  const hotkeyElements = keys.map((k, index) => {
    const hotkeyDisplayName = keycodeToDisplay[k.toLowerCase()] || k;
    return <HotkeyText key={2 * index}>{hotkeyDisplayName}</HotkeyText>;
  });
  const elements: ReactElement[] = [];
  for (let i = 0; i < hotkeyElements.length; i++) {
    elements.push(hotkeyElements[i]);
    if (i < hotkeyElements.length - 1) {
      elements.push(<span key={2 * i + 1}> + </span>);
    }
  }
  return <FlexRowAlignCenter $gap={4}>{elements}</FlexRowAlignCenter>;
}

function getHotkeyDisplay(keycode: string, keycodeDisplay?: string | string[]): ReactElement {
  let keycodeArray: string[];
  if (keycodeDisplay) {
    keycodeArray = Array.isArray(keycodeDisplay) ? keycodeDisplay : [keycodeDisplay];
  } else {
    keycodeArray = keycode.split(",").map((k) => k.trim());
  }
  return (
    <FlexColumn $gap={4} style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
      {keycodeArray.map(toHotkeyDisplay)}
    </FlexColumn>
  );
}

function ShortcutKeyDisplay(props: ShortcutKeyDisplayProps): ReactElement {
  const { shortcutKey } = props;
  const { name, keycode, keycodeDisplay } = shortcutKey;

  return (
    <FlexRow style={{ justifyContent: "space-between", width: "100%" }}>
      {name}
      <div>{getHotkeyDisplay(keycode, keycodeDisplay)}</div>
    </FlexRow>
  );
}

type ShortcutKeyCardProps = {
  shortcutKeys: Record<string, ShortcutKeyInfo>;
  title: string;
};

export default function ShortcutKeyCard(props: ShortcutKeyCardProps): ReactElement {
  return (
    <ShortcutList title={props.title} size="small">
      <FlexColumn $gap={6}>
        {Object.values(props.shortcutKeys).map((shortcutKey) => (
          <ShortcutKeyDisplay key={shortcutKey.name} shortcutKey={shortcutKey} />
        ))}
      </FlexColumn>
    </ShortcutList>
  );
}
