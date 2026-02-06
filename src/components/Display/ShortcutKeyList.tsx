import React, { type ReactElement, useMemo } from "react";

import LabeledList from "src/components/Display/LabeledList";
import ShortcutKeyText from "src/components/Display/ShortcutKeyText";
import type { ShortcutKeyInfo } from "src/constants";

type ShortcutKeyListProps = {
  shortcutKeys: ShortcutKeyInfo[];
  title: string;
  inline?: boolean;
};

/**
 * Displays a list of keyboard shortcuts under a labeled title.
 */
export default function ShortcutKeyList(props: ShortcutKeyListProps): ReactElement {
  const shortcutKeyElements = useMemo(
    () =>
      props.shortcutKeys.map((shortcutKey) => (
        <ShortcutKeyText key={shortcutKey.name} shortcutKey={shortcutKey} inline={props.inline} />
      )),
    [props.shortcutKeys, props.inline]
  );

  return <LabeledList title={props.title}>{shortcutKeyElements}</LabeledList>;
}
