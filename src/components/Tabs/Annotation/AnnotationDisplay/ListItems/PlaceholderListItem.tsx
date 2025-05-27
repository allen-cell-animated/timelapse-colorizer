import React, { ReactElement, useContext } from "react";

import { TagIconSVG } from "../../../../../assets";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../../../../styles/utils";

import { AppThemeContext } from "../../../../AppStyle";

export default function PlaceholderListItem(): ReactElement {
  const theme = useContext(AppThemeContext);
  return (
    <FlexRowAlignCenter style={{ width: "100% ", height: "100px" }}>
      <FlexColumnAlignCenter style={{ margin: "16px 0 10px 0", width: "100%", color: theme.color.text.disabled }}>
        <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
        <p>Labeled tracks will appear here</p>
      </FlexColumnAlignCenter>
    </FlexRowAlignCenter>
  );
}
