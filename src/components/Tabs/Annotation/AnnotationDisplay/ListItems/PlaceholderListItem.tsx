import React, { type ReactElement, useContext } from "react";

import { TagIconSVG } from "src/assets";
import { AppThemeContext } from "src/styles/AppStyle";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "src/styles/utils";

export default function PlaceholderListItem(): ReactElement {
  const theme = useContext(AppThemeContext);
  return (
    <FlexRowAlignCenter style={{ width: "100% ", height: "100px" }}>
      <FlexColumnAlignCenter style={{ margin: "16px 20px 10px 0", width: "100%", color: theme.color.text.disabled }}>
        <TagIconSVG style={{ width: "24px", height: "24px", marginBottom: 0 }} />
        <p>Annotated tracks will appear here</p>
      </FlexColumnAlignCenter>
    </FlexRowAlignCenter>
  );
}
