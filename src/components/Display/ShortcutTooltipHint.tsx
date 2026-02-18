import { InfoCircleOutlined } from "@ant-design/icons";
import React, { type ReactElement, useContext, useRef } from "react";

import ShortcutKeyText from "src/components/Display/ShortcutKeyText";
import { TooltipWithSubtitle } from "src/components/Tooltips/TooltipWithSubtitle";
import type { ShortcutKeyInfo } from "src/constants";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumn } from "src/styles/utils";

type ShortcutTooltipHintProps = {
  shortcutKeys: ShortcutKeyInfo[];
};

export default function ShortcutTooltipHint(props: ShortcutTooltipHintProps): ReactElement {
  const theme = useContext(AppThemeContext);
  const popupContainerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={popupContainerRef}>
      <TooltipWithSubtitle
        trigger={["focus", "hover"]}
        title={null}
        subtitle={tooltipContents}
        getPopupContainer={() => {
          return popupContainerRef.current ?? document.body;
        }}
      >
        <InfoCircleOutlined tabIndex={0}></InfoCircleOutlined>
      </TooltipWithSubtitle>
    </div>
  );
}
