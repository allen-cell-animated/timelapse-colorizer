import React, { type ReactElement } from "react";

import LabeledList from "src/components/Display/LabeledList";
import ShortcutKeyText from "src/components/Display/ShortcutKeyText";
import type { ShortcutKeyInfo } from "src/constants";

type ShortcutKeyCardProps = {
  shortcutKeys: Record<string, ShortcutKeyInfo>;
  title: string;
};

export default function ShortcutKeyList(props: ShortcutKeyCardProps): ReactElement {
  const shortcutKeyElements = Object.values(props.shortcutKeys).map((shortcutKey) => (
    <ShortcutKeyText key={shortcutKey.name} shortcutKey={shortcutKey} />
  ));
  return <LabeledList title={props.title}>{shortcutKeyElements}</LabeledList>;
}
