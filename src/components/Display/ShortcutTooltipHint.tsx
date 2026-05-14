import React, { type ReactElement, useContext } from "react";

import InlineHint from "src/components/Display/InlineHint";
import ShortcutKeyText from "src/components/Display/ShortcutKeyText";
import type { ShortcutKeyInfo } from "src/constants";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn } from "src/styles/utils";

type ShortcutTooltipHintProps = {
  shortcutKeys: ShortcutKeyInfo[];
};

/**
 * An inline shortcut hint that displays a tooltip with shortcut key info when
 * hovered or focused.
 */
export default function ShortcutTooltipHint(props: ShortcutTooltipHintProps): ReactElement {
  const theme = useContext(AppThemeContext);

  const tooltipKeycharacterStyle: React.CSSProperties = {
    backgroundColor: theme.color.text.shortcutKey.dark.background,
    borderColor: theme.color.text.shortcutKey.dark.border,
    minWidth: "10px",
  };

  const tooltipContents = (
    <FlexColumn $gap={4}>
      {props.shortcutKeys.map((shortcutKey, index) => (
        <ShortcutKeyText shortcutKey={shortcutKey} keyStyle={tooltipKeycharacterStyle} inline={true} key={index} />
      ))}
    </FlexColumn>
  );

  return <InlineHint subtitle={tooltipContents} />;
}
